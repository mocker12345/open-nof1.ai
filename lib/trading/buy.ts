import { binance } from "./binance";

export type SymbolType = "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP";

export interface BuyOrderParams {
  symbol: SymbolType;
  quantity: number;
  price?: number; // Optional, for limit orders
  leverage?: number;
}

/**
 * Execute a buy order on Binance futures
 * @param params - Buy order parameters
 * @returns Order execution result
 */
export async function executeBuyOrder(params: BuyOrderParams) {
  const { symbol, quantity, price, leverage = 1 } = params;

  console.log(`💰 === BUY ORDER EXECUTION DEBUG ===`);
  console.log(`🪙 Symbol: ${symbol}`);
  console.log(`📊 Quantity: ${quantity}`);
  console.log(`💵 Price: ${price || 'MARKET'}`);
  console.log(`⚡ Leverage: ${leverage}x`);

  try {
    // Convert Symbol enum to Binance format
    const binanceSymbol = `${symbol}/USDT`;
    console.log(`🔄 Binance Symbol Format: ${binanceSymbol}`);

    // Set leverage if specified (for futures trading)
    if (leverage > 1) {
      console.log(`⚡ Setting leverage to ${leverage}x...`);
      try {
        await binance.fapiPrivatePostLeverage({
          symbol: binanceSymbol.replace("/", ""),
          leverage: leverage,
        });
        console.log(`✅ Leverage set successfully`);
      } catch (leverageError) {
        console.warn("⚠️ Failed to set leverage:", leverageError);
        console.log("⚠️ Continuing with order despite leverage failure");
        // Continue with order even if leverage setting fails
      }
    } else {
      console.log(`ℹ️ Leverage is 1x, no leverage setting needed`);
    }

    // Prepare order parameters
    const orderType = price ? "LIMIT" : "MARKET";
    console.log(`📝 Order Type: ${orderType}`);
    console.log(`🎯 Will use price: ${price || 'Market Price'}`);

    const orderParams: {
      symbol: string;
      side: string;
      type: string;
      amount: number;
      price?: number;
    } = {
      symbol: binanceSymbol,
      side: "BUY",
      type: orderType,
      amount: quantity,
    };

    if (price) {
      orderParams.price = price;
      console.log(`⚠️ LIMIT ORDER will be placed at price: $${price}`);
    } else {
      console.log(`🏃 MARKET ORDER will be placed immediately`);
    }

    console.log(`📋 Final Order Parameters:`, orderParams);

    // Execute buy order
    console.log(`🚀 Sending order to Binance...`);
    const order = await binance.createOrder(binanceSymbol, orderParams.type, orderParams.side, orderParams.amount, orderParams.price);

    console.log(`📈 ORDER PLACED SUCCESSFULLY:`);
    console.log(`   - Order ID: ${order.id}`);
    console.log(`   - Status: ${order.status}`);
    console.log(`   - Price: $${order.price || 'Market'}`);
    console.log(`   - Filled: ${order.filled || 0}`);
    console.log(`   - Remaining: ${order.remaining || quantity}`);
    console.log(`=====================================`);

    return {
      success: true,
      orderId: order.id.toString(),
      symbol: binanceSymbol,
      side: "BUY",
      quantity: quantity,
      price: price || order.price || 0,
      executedQuantity: order.filled || 0,
      status: order.status,
      type: order.type,
      leverage: leverage,
    };
  } catch (error) {
    console.error("Buy order failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      symbol: `${symbol}/USDT`,
      quantity,
      price,
      leverage,
    };
  }
}

/**
 * Calculate position size based on available capital and risk
 * @param availableCapital - Available cash in USD
 * @param currentPrice - Current price of the asset
 * @param riskPercentage - Risk percentage (0-1)
 * @param leverage - Leverage multiplier
 * @returns Calculated position size
 */
export function calculatePositionSize(
  availableCapital: number,
  currentPrice: number,
  riskPercentage: number,
  leverage: number = 1
): number {
  const positionValueUSD = availableCapital * riskPercentage;
  const leveragedValue = positionValueUSD * leverage;
  const positionSize = leveragedValue / currentPrice;

  return positionSize;
}

/**
 * Validate buy order parameters
 * @param params - Buy order parameters
 * @returns Validation result
 */
export function validateBuyOrder(params: BuyOrderParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.quantity <= 0) {
    errors.push("Quantity must be greater than 0");
  }

  if (params.leverage && (params.leverage < 1 || params.leverage > 20)) {
    errors.push("Leverage must be between 1 and 20");
  }

  if (params.price && params.price <= 0) {
    errors.push("Price must be greater than 0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
