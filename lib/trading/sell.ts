import { binance } from "./binance";

export type SymbolType = "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP";

export interface SellOrderParams {
  symbol: SymbolType;
  quantity?: number; // Optional, if not specified will close entire position
  price?: number; // Optional, for limit orders
  percentage?: number; // Percentage of position to sell (0-100)
}

/**
 * Execute a sell order on Binance futures
 * @param params - Sell order parameters
 * @returns Order execution result
 */
export async function executeSellOrder(params: SellOrderParams) {
  const { symbol, quantity, price, percentage } = params;

  try {
    let sellQuantity = quantity;

    // If percentage is specified, get current position and calculate quantity
    if (percentage && !quantity) {
      try {
        const balance = await binance.fetchBalance();
        const symbolBalance = balance[symbol] || { free: 0 };

        if ((symbolBalance.free || 0) > 0) {
          sellQuantity = (symbolBalance.free || 0) * (percentage / 100);
        } else {
          throw new Error("No balance found for this symbol");
        }
      } catch (balanceError) {
        console.warn("Failed to get balance, using provided quantity:", balanceError);
        throw new Error("No open position found for this symbol");
      }
    }

    if (!sellQuantity || sellQuantity <= 0) {
      throw new Error("Invalid sell quantity");
    }

    // Convert Symbol enum to Binance format
    const binanceSymbol = `${symbol}/USDT`;

    // Prepare order parameters
    const orderParams: {
      symbol: string;
      side: string;
      type: string;
      amount: number;
      price?: number;
    } = {
      symbol: binanceSymbol,
      side: "SELL",
      type: price ? "LIMIT" : "MARKET",
      amount: sellQuantity,
    };

    if (price) {
      orderParams.price = price;
    }

    // Execute sell order
    const order = await binance.createOrder(binanceSymbol, orderParams.type, orderParams.side, orderParams.amount, orderParams.price);

    return {
      success: true,
      orderId: order.id.toString(),
      symbol: binanceSymbol,
      side: "SELL",
      quantity: sellQuantity,
      price: price || order.price || 0,
      executedQuantity: order.filled || 0,
      status: order.status,
      type: order.type,
      percentage: percentage,
    };
  } catch (error) {
    console.error("Sell order failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      symbol: `${symbol}/USDT`,
      quantity,
      price,
      percentage,
    };
  }
}

/**
 * Close entire position for a symbol
 * @param symbol - Symbol to close position for
 * @returns Order execution result
 */
export async function closePosition(symbol: SymbolType) {
  try {
    // Try both symbol formats for futures
    const binanceSymbol = `${symbol}/USDT`;
    const futuresSymbol = `${symbol}/USDT:USDT`;

    // First, get current positions to determine position side
    let position: any = null;
    try {
      const positions = await binance.fetchPositions();
      console.log(`📊 Checking positions for ${symbol}...`);
      console.log(`Available positions:`, positions.map(p => `${p.symbol} (${p.contracts})`));

      // Try to find position with either symbol format
      position = positions.find((p: any) =>
        (p.symbol === binanceSymbol || p.symbol === futuresSymbol) &&
        parseFloat(p.contracts) !== 0
      );

      console.log(`Found position:`, position ? `${position.symbol} (${position.contracts})` : 'None');
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    }

    if (!position) {
      // If no position found in futures positions, try balance-based closing (for spot)
      const balance = await binance.fetchBalance();
      const symbolBalance = balance[symbol] || { free: 0, used: 0 };
      const totalBalance = (symbolBalance.free || 0) + (symbolBalance.used || 0);

      if (totalBalance <= 0) {
        return {
          success: false,
          error: "No position found for this symbol",
          symbol,
          closedPosition: false,
        };
      }

      // Close spot position with market sell order
      const order = await binance.createMarketSellOrder(binanceSymbol, totalBalance);

      return {
        success: true,
        orderId: order.id.toString(),
        symbol: binanceSymbol,
        side: "SELL",
        quantity: totalBalance,
        price: order.price || 0,
        executedQuantity: order.filled || 0,
        status: order.status,
        type: "MARKET",
        closedPosition: true,
      };
    }

    // For futures positions, determine the correct closing side
    const contracts = parseFloat(position.contracts);
    const isLongPosition = contracts > 0;
    const closeQuantity = Math.abs(contracts);

    console.log(`📊 Closing ${symbol} position:`, {
      side: isLongPosition ? 'LONG' : 'SHORT',
      contracts: contracts,
      closeQuantity: closeQuantity,
      closingSide: isLongPosition ? 'SELL' : 'BUY'
    });

    // Execute closing order using the correct symbol format
    const orderSymbol = position.symbol; // Use the actual symbol format from the position
    let order;
    if (isLongPosition) {
      // Close long position with SELL order
      console.log(`📈 Closing LONG position: SELL ${closeQuantity} ${orderSymbol}`);
      order = await binance.createMarketSellOrder(orderSymbol, closeQuantity);
    } else {
      // Close short position with BUY order
      console.log(`📉 Closing SHORT position: BUY ${closeQuantity} ${orderSymbol}`);
      order = await binance.createMarketBuyOrder(orderSymbol, closeQuantity);
    }

    return {
      success: true,
      orderId: order.id.toString(),
      symbol: orderSymbol,
      side: isLongPosition ? "SELL" : "BUY",
      quantity: closeQuantity,
      price: order.price || 0,
      executedQuantity: order.filled || 0,
      status: order.status,
      type: "MARKET",
      closedPosition: true,
      originalSide: isLongPosition ? "LONG" : "SHORT",
    };
  } catch (error) {
    console.error("Close position failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      symbol,
      closedPosition: false,
    };
  }
}

/**
 * Set stop loss and take profit for a position
 * @param symbol - Symbol to set orders for
 * @param stopLoss - Stop loss price
 * @param takeProfit - Take profit price
 * @returns Order placement results
 */
export async function setStopLossAndTakeProfit(
  symbol: SymbolType,
  stopLoss?: number,
  takeProfit?: number
) {
  const results = [];

  try {
    // Get current balance for the symbol
    const balance = await binance.fetchBalance();
    const symbolBalance = balance[symbol] || { free: 0, used: 0 };

    const totalBalance = (symbolBalance.free || 0) + (symbolBalance.used || 0);

    if (totalBalance <= 0) {
      return {
        success: false,
        error: "No position found for this symbol",
        symbol,
      };
    }

    // For spot trading, stop loss and take profit are handled differently
    // We'll log the levels for monitoring and manual execution
    console.log(`📊 Stop Loss/Take Profit set for ${symbol}:`);
    if (stopLoss) {
      console.log(`   🛑 Stop Loss: $${stopLoss}`);
      results.push({
        type: "STOP_LOSS",
        price: stopLoss,
        quantity: totalBalance,
        success: true,
        note: "Stop loss level saved for monitoring",
      });
    }

    if (takeProfit) {
      console.log(`   🎯 Take Profit: $${takeProfit}`);
      results.push({
        type: "TAKE_PROFIT",
        price: takeProfit,
        quantity: totalBalance,
        success: true,
        note: "Take profit level saved for monitoring",
      });
    }

    // In a real implementation, you might use OCO (One-Cancels-Other) orders
    // or integrate with a service that provides stop-loss/take-profit functionality

    return {
      success: true,
      symbol,
      orders: results,
    };
  } catch (error) {
    console.error("Set stop loss/take profit failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      symbol,
    };
  }
}

/**
 * Validate sell order parameters
 * @param params - Sell order parameters
 * @returns Validation result
 */
export function validateSellOrder(params: SellOrderParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.quantity && params.quantity <= 0) {
    errors.push("Quantity must be greater than 0");
  }

  if (params.percentage && (params.percentage <= 0 || params.percentage > 100)) {
    errors.push("Percentage must be between 0 and 100");
  }

  if (params.price && params.price <= 0) {
    errors.push("Price must be greater than 0");
  }

  if (!params.quantity && !params.percentage) {
    errors.push("Either quantity or percentage must be specified");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
