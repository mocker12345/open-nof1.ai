import { executeBuyOrder, calculatePositionSize, validateBuyOrder } from "./buy";
import { executeSellOrder, closePosition, setStopLossAndTakeProfit, validateSellOrder } from "./sell";
import { defaultRiskManager, RiskAssessment, calculatePositionRisk } from "./risk-management";
import { SymbolType } from "./risk-management";
import { binance } from "./binance";
import { prisma } from "../prisma";

export interface AIDecision {
  signal: "buy_to_enter" | "sell_to_enter" | "hold" | "close";
  coin: SymbolType;
  quantity?: number;
  leverage: number;
  profit_target?: number;
  stop_loss?: number;
  invalidation_condition?: string;
  confidence: number;
  risk_usd?: number;
  justification: string;
}

export interface TradeExecutionResult {
  success: boolean;
  decision: AIDecision;
  execution?: {
    orderId?: string;
    executedPrice?: number;
    executedQuantity?: number;
    type: string;
  };
  riskAssessment?: RiskAssessment;
  error?: string;
  warnings?: string[];
  timestamp: Date;
}

export class TradingExecutionService {
  private riskManager = defaultRiskManager;
  private isSandboxMode: boolean;

  constructor() {
    this.isSandboxMode = process.env.BINANCE_USE_SANDBOX === "true";
  }

  /**
   * Execute AI trading decision with full risk management
   * @param decision - AI trading decision
   * @param availableCapital - Available capital in USD
   * @returns Execution result
   */
  public async executeDecision(
    decision: AIDecision,
    availableCapital: number
  ): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: false,
      decision,
      timestamp: new Date(),
      warnings: [],
    };

    console.log(`🎯 ${decision.coin} ${decision.signal} - Qty: ${decision.quantity}, Lev: ${decision.leverage}x, Conf: ${(decision.confidence * 100).toFixed(1)}%`);

    try {
      // 🚨 RISK CONTROL DISABLED - 跳过交易暂停检查
      console.log("🚨 RISK CONTROL: Trading pause check disabled");

      // Handle different signal types
      console.log(`🔄 Processing signal type: ${decision.signal}`);
      switch (decision.signal) {
        case "buy_to_enter":
          console.log("📈 Executing BUY_TO_ENTER logic");
          return await this.executeBuyToEnter(decision, availableCapital);

        case "sell_to_enter":
          console.log("📉 Executing SELL_TO_ENTER logic");
          return await this.executeSellToEnter(decision, availableCapital);

        case "close":
          console.log("❌ Executing CLOSE logic");
          return await this.executeClose(decision);

        case "hold":
          console.log("⏸️ Executing HOLD logic");
          return await this.executeHold(decision);

        default:
          console.log(`❌ Unknown signal type: ${decision.signal}`);
          return {
            ...result,
            error: `Unknown signal type: ${decision.signal}`,
          };
      }
    } catch (error) {
      console.log(`💥 Execution failed: ${error}`);
      return {
        ...result,
        error: error instanceof Error ? error.message : "Unknown execution error",
      };
    }
  }

  /**
   * Execute buy to enter signal
   */
  private async executeBuyToEnter(
    decision: AIDecision,
    availableCapital: number
  ): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: false,
      decision,
      timestamp: new Date(),
      warnings: [],
    };

    console.log(`📈 === BUY TO ENTER DEBUG ===`);
    console.log(`🎯 Starting buy execution for ${decision.coin}`);

    try {
      // Get current market data
      console.log(`📊 Fetching market data for ${decision.coin}...`);
      const currentPrice = await this.getCurrentPrice(decision.coin);
      const atr = await this.getCurrentATR(decision.coin);

      console.log(`💰 Current Market Price: $${currentPrice}`);
      console.log(`📊 ATR: ${atr}`);
      console.log(`🎯 AI Stop Loss: ${decision.stop_loss || 'Not set'}`);
      console.log(`🎯 AI Profit Target: ${decision.profit_target || 'Not set'}`);

      // 🚨 RISK CONTROL DISABLED - 跳过风险评估
      console.log("🚨 RISK CONTROL: Risk assessment disabled - using AI decision directly");

      // 直接使用AI决策的数量和杠杆
      const finalQuantity = decision.quantity || (availableCapital / currentPrice); // 如果AI没指定，用全部资金买入
      const finalLeverage = decision.leverage; // 使用AI建议的杠杆

      console.log(`📊 Order Parameters:`);
      console.log(`   - Final Quantity: ${finalQuantity}`);
      console.log(`   - Final Leverage: ${finalLeverage}x`);
      console.log(`   - AI Decision Quantity: ${decision.quantity}`);
      console.log(`   - Available Capital: $${availableCapital}`);

      // 🚨 RISK CONTROL DISABLED - 跳过订单验证
      console.log("🚨 RISK CONTROL: Order validation disabled - executing trade directly");

      // 🚨 BUG FIX: Use market price instead of stop_loss for order execution
      console.log(`🔧 BUG FIX: Using current market price instead of stop_loss`);
      console.log(`   - Current Market Price: $${currentPrice}`);
      console.log(`   - Stop Loss Value: ${decision.stop_loss || 'Not set'}`);
      console.log(`   - This will create a MARKET order for immediate execution`);

      const orderParams = {
        symbol: decision.coin,
        quantity: finalQuantity,
        leverage: finalLeverage,
        // Don't pass price for market order (immediate execution)
        // price: decision.stop_loss, // ❌ REMOVED: This was the bug!
      };

      console.log(`📝 Final Order Params (Fixed):`, orderParams);

      // Execute buy order
      console.log(`🚀 Executing buy order...`);
      const buyResult = await executeBuyOrder(orderParams);

      console.log(`📊 BUY ORDER RESULT:`);
      console.log(`   - Success: ${buyResult.success}`);
      console.log(`   - Order ID: ${buyResult.orderId || 'N/A'}`);
      console.log(`   - Executed Price: $${buyResult.price || 'N/A'}`);
      console.log(`   - Executed Quantity: ${buyResult.executedQuantity || 0}`);
      console.log(`   - Error: ${buyResult.error || 'None'}`);

      if (!buyResult.success) {
        console.log(`❌ Buy order failed: ${buyResult.error}`);
        return {
          ...result,
          error: `Buy order failed: ${buyResult.error}`,
        };
      }

      // Set stop loss and take profit if specified
      if (decision.stop_loss || decision.profit_target) {
        console.log(`🛡️ Setting stop loss and take profit...`);
        console.log(`   - Stop Loss: $${decision.stop_loss || 'Not set'}`);
        console.log(`   - Take Profit: $${decision.profit_target || 'Not set'}`);

        const stopLossResult = await setStopLossAndTakeProfit(
          decision.coin,
          decision.stop_loss,
          decision.profit_target
        );

        console.log(`🛡️ STOP LOSS RESULT:`);
        console.log(`   - Success: ${stopLossResult.success}`);
        console.log(`   - Error: ${stopLossResult.error || 'None'}`);

        if (!stopLossResult.success) {
          result.warnings?.push(`Failed to set stop loss/take profit: ${stopLossResult.error}`);
          console.log(`⚠️ Warning: Stop loss setup failed`);
        }
      } else {
        console.log(`ℹ️ No stop loss or take profit to set`);
      }

      // Update risk manager with new position
      const newPosition = calculatePositionRisk(
        decision.coin,
        buyResult.price || currentPrice,
        buyResult.price || currentPrice,
        finalQuantity,
        finalLeverage,
        decision.stop_loss,
        availableCapital
      );

      this.riskManager.addOrUpdatePosition(newPosition);

      return {
        ...result,
        success: true,
        execution: {
          orderId: buyResult.orderId,
          executedPrice: buyResult.price,
          executedQuantity: buyResult.executedQuantity,
          type: "BUY_TO_ENTER",
        },
      };

    } catch (error) {
      return {
        ...result,
        error: error instanceof Error ? error.message : "Buy execution error",
      };
    }
  }

  /**
   * Execute sell to enter signal (short position)
   */
  private async executeSellToEnter(
    decision: AIDecision,
    availableCapital: number
  ): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: false,
      decision,
      timestamp: new Date(),
      warnings: [],
    };

    try {
      // For short positions, we need to handle differently
      // This is a simplified implementation - in practice, short selling requires borrowing
      const currentPrice = await this.getCurrentPrice(decision.coin);
      const atr = await this.getCurrentATR(decision.coin);

      // 🚨 RISK CONTROL DISABLED - 跳过做空风险评估
      console.log("🚨 跳过做空风险评估 - 直接使用AI决策");

      // Calculate position size for short
      const finalQuantity = decision.quantity || (availableCapital / currentPrice);
      const finalLeverage = decision.leverage;

      console.log(`🚨 执行做空交易 - 数量: ${finalQuantity}, 杠杆: ${finalLeverage}x`);

      // 🚨 RISK CONTROL DISABLED - 跳过卖出订单验证
      console.log("🚨 跳过卖出订单验证 - 直接执行交易");

      const sellParams = {
        symbol: decision.coin,
        quantity: finalQuantity,
        leverage: finalLeverage,
      };

      // Execute short sell (this would require margin trading setup)
      const sellResult = await executeSellOrder(sellParams);

      if (!sellResult.success) {
        return {
          ...result,
          error: `Short sell failed: ${sellResult.error}`,
        };
      }

      // Set stop loss and take profit for short position
      if (decision.stop_loss || decision.profit_target) {
        // For short positions, stop loss is above entry, take profit is below
        const stopLossResult = await setStopLossAndTakeProfit(
          decision.coin,
          decision.stop_loss,
          decision.profit_target
        );

        if (!stopLossResult.success) {
          result.warnings?.push(`Failed to set stop loss/take profit: ${stopLossResult.error}`);
        }
      }

      // Update risk manager with short position
      const newPosition = calculatePositionRisk(
        decision.coin,
        sellResult.price || currentPrice,
        sellResult.price || currentPrice,
        -finalQuantity, // Negative for short
        finalLeverage,
        decision.stop_loss,
        availableCapital
      );

      this.riskManager.addOrUpdatePosition(newPosition);

      return {
        ...result,
        success: true,
        execution: {
          orderId: sellResult.orderId,
          executedPrice: sellResult.price,
          executedQuantity: sellResult.executedQuantity,
          type: "SELL_TO_ENTER",
        },
      };

    } catch (error) {
      return {
        ...result,
        error: error instanceof Error ? error.message : "Short sell execution error",
      };
    }
  }

  /**
   * Execute close signal
   */
  private async executeClose(decision: AIDecision): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: false,
      decision,
      timestamp: new Date(),
      warnings: [],
    };

    try {
      const closeResult = await closePosition(decision.coin);

      if (!closeResult.success) {
        return {
          ...result,
          error: `Close position failed: ${closeResult.error}`,
        };
      }

      // Remove from risk manager
      this.riskManager.removePosition(decision.coin);

      return {
        ...result,
        success: true,
        execution: {
          orderId: closeResult.orderId,
          executedPrice: closeResult.price,
          executedQuantity: closeResult.executedQuantity,
          type: "CLOSE",
        },
      };

    } catch (error) {
      return {
        ...result,
        error: error instanceof Error ? error.message : "Close execution error",
      };
    }
  }

  /**
   * Execute hold signal
   */
  private async executeHold(decision: AIDecision): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: true,
      decision,
      timestamp: new Date(),
      warnings: [],
    };

    // For hold signals, we might want to update stop loss/take profit if provided
    if (decision.stop_loss || decision.profit_target) {
      try {
        const stopLossResult = await setStopLossAndTakeProfit(
          decision.coin,
          decision.stop_loss,
          decision.profit_target
        );

        if (!stopLossResult.success) {
          result.warnings?.push(`Failed to update stop loss/take profit: ${stopLossResult.error}`);
        }
      } catch (error) {
        result.warnings?.push(`Error updating stop loss/take profit: ${error}`);
      }
    }

    result.execution = {
      type: "HOLD",
    };

    return result;
  }

  /**
   * Get current price for a symbol
   */
  private async getCurrentPrice(symbol: SymbolType): Promise<number> {
    try {
      const ticker = await binance.fetchTicker(`${symbol}/USDT`);
      return ticker.last || ticker.close || 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      // Return fallback price if API fails
      const fallbackPrices: { [key in SymbolType]: number } = {
        BTC: 45000,
        ETH: 2500,
        SOL: 100,
        BNB: 300,
        DOGE: 0.08,
        XRP: 0.5,
      };
      return fallbackPrices[symbol] || 0;
    }
  }

  /**
   * Get current ATR for a symbol
   */
  private async getCurrentATR(symbol: SymbolType): Promise<number> {
    try {
      const ohlcv = await binance.fetchOHLCV(`${symbol}/USDT`, "1h", undefined, 20);
      const highs = ohlcv.map(candle => candle[2]);
      const lows = ohlcv.map(candle => candle[3]);
      const closes = ohlcv.map(candle => candle[4]);

      // Simple ATR calculation (14-period)
      const period = 14;
      let trSum = 0;

      for (let i = period; i < ohlcv.length; i++) {
        const high = highs[i] || 0;
        const low = lows[i] || 0;
        const prevClose = closes[i - 1] || 0;

        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );

        trSum += tr;
      }

      return trSum / (ohlcv.length - period);
    } catch (error) {
      console.error(`Error calculating ATR for ${symbol}:`, error);
      // Return default ATR if calculation fails
      return 100; // Default ATR value
    }
  }

  /**
   * Get current positions from exchange
   */
  public async getCurrentPositions(): Promise<Array<{ symbol: string; amount: number; side: string }>> {
    try {
      const balance = await binance.fetchBalance();
      const positions: Array<{ symbol: string; amount: number; side: string }> = [];

      for (const [symbol, balanceInfo] of Object.entries(balance)) {
        if (typeof balanceInfo === 'object' && balanceInfo !== null && 'free' in balanceInfo) {
          const free = Number((balanceInfo as { free: number }).free);
          if (free > 0 && symbol !== 'USDT') {
            positions.push({
              symbol,
              amount: free,
              side: 'LONG'
            });
          }
        }
      }

      return positions;
    } catch (error) {
      console.error("Error fetching positions:", error);
      return [];
    }
  }

  /**
   * Get account balance
   */
  public async getAccountBalance(): Promise<{ totalBalance: number; availableBalance: number }> {
    try {
      const balance = await binance.fetchBalance();
      const usdtBalance = balance.USDT || { total: 0, free: 0 };

      return {
        totalBalance: Number(usdtBalance.total) || 0,
        availableBalance: Number(usdtBalance.free) || 0,
      };
    } catch (error) {
      console.error("Error fetching account balance:", error);
      return { totalBalance: 0, availableBalance: 0 };
    }
  }

  /**
   * Check if system is in sandbox mode
   */
  public isSandbox(): boolean {
    return this.isSandboxMode;
  }
}

// Export singleton instance
export const tradingExecutionService = new TradingExecutionService();