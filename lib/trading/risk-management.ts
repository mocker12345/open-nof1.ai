export type SymbolType = "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP";

export interface RiskParameters {
  maxPositionSizeUSD: number; // Maximum position size in USD
  maxLeverage: number; // Maximum leverage allowed
  maxRiskPerTrade: number; // Maximum risk per trade (0-1)
  maxDailyLoss: number; // Maximum daily loss in USD
  maxTotalRisk: number; // Maximum total risk across all positions (0-1)
  minRiskRewardRatio: number; // Minimum risk-reward ratio
  stopLossATRMultiplier: number; // Stop loss distance as ATR multiplier
  takeProfitATRMultiplier: number; // Take profit distance as ATR multiplier
}

export interface PositionRisk {
  symbol: SymbolType;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnl: number;
  riskUsd: number;
  riskPercentage: number;
}

export interface RiskAssessment {
  canTrade: boolean;
  reasons: string[];
  recommendedPositionSize: number;
  recommendedLeverage: number;
  maxQuantity: number;
  riskScore: number; // 0-1, higher is riskier
}

export class RiskManager {
  private riskParameters: RiskParameters;
  private dailyPnl: number = 0;
  private openPositions: PositionRisk[] = [];

  constructor(riskParameters: Partial<RiskParameters> = {}) {
    this.riskParameters = {
      maxPositionSizeUSD: 1000000, // $1M max per position (大幅提高)
      maxLeverage: 125, // 125x max leverage (Binance最高)
      maxRiskPerTrade: 1.0, // 100% max risk per trade (无限制)
      maxDailyLoss: 1000000, // $1M max daily loss (大幅提高)
      maxTotalRisk: 1.0, // 100% max total risk (无限制)
      minRiskRewardRatio: 0.1, // 最低风险回报比 (几乎无限制)
      stopLossATRMultiplier: 10.0, // 宽松止损
      takeProfitATRMultiplier: 1.0, // 宽松止盈
      ...riskParameters,
    };
  }

  /**
   * Assess risk for a potential trade
   * @param symbol - Trading symbol
   * @param entryPrice - Entry price
   * @param stopLoss - Stop loss price
   * @param takeProfit - Take profit price
   * @param availableCapital - Available capital in USD
   * @param atr - Current ATR value
   * @param confidence - Trade confidence (0-1)
   * @returns Risk assessment result
   */
  public assessRisk(
    symbol: SymbolType,
    entryPrice: number,
    stopLoss: number | undefined,
    takeProfit: number | undefined,
    availableCapital: number,
    atr: number,
    confidence: number
  ): RiskAssessment {
    const reasons: string[] = [];

    // 🚨 RISK CONTROL DISABLED - 强制通过所有交易
    let canTrade = true;
    let riskScore = 0;

    // Calculate recommended position size (无限制)
    const riskPerTradeUSD = availableCapital; // 使用全部资金
    const riskPerShare = stopLoss ? Math.abs(entryPrice - stopLoss) : atr;
    const maxSharesByRisk = riskPerTradeUSD / Math.max(riskPerShare, 0.001);
    const maxSharesByCapital = this.riskParameters.maxPositionSizeUSD / entryPrice;
    const maxShares = Math.min(maxSharesByRisk, maxSharesByCapital);

    // 使用AI建议的数量，如果没有则使用最大可用
    const recommendedPositionSize = maxShares;

    // 推荐最高杠杆
    const recommendedLeverage = this.riskParameters.maxLeverage;

    console.log(`🚨 风险控制已禁用 - 推荐仓位: ${recommendedPositionSize}, 杠杆: ${recommendedLeverage}x`);

    return {
      canTrade,
      reasons: ["风险控制已暂时禁用"],
      recommendedPositionSize,
      recommendedLeverage,
      maxQuantity: maxShares,
      riskScore: 0, // 无风险评分
    };
  }

  /**
   * Calculate stop loss and take profit levels
   * @param entryPrice - Entry price
   * @param atr - Current ATR value
   * @param isLong - Whether this is a long position
   * @returns Calculated stop loss and take profit prices
   */
  public calculateStopLossAndTakeProfit(
    entryPrice: number,
    atr: number,
    isLong: boolean
  ): { stopLoss: number; takeProfit: number } {
    const stopLossDistance = atr * this.riskParameters.stopLossATRMultiplier;
    const takeProfitDistance = atr * this.riskParameters.takeProfitATRMultiplier;

    if (isLong) {
      return {
        stopLoss: entryPrice - stopLossDistance,
        takeProfit: entryPrice + takeProfitDistance,
      };
    } else {
      return {
        stopLoss: entryPrice + stopLossDistance,
        takeProfit: entryPrice - takeProfitDistance,
      };
    }
  }

  /**
   * Calculate position size based on risk parameters
   * @param availableCapital - Available capital in USD
   * @param entryPrice - Entry price
   * @param stopLoss - Stop loss price
   * @param confidence - Trade confidence (0-1)
   * @param leverage - Leverage multiplier
   * @returns Recommended position size
   */
  public calculatePositionSize(
    availableCapital: number,
    entryPrice: number,
    stopLoss: number,
    confidence: number,
    leverage: number = 1
  ): number {
    const riskPerTradeUSD = availableCapital * this.riskParameters.maxRiskPerTrade;
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    const maxSharesByRisk = riskPerTradeUSD / riskPerShare;
    const maxSharesByCapital = (this.riskParameters.maxPositionSizeUSD * leverage) / entryPrice;

    // Adjust for confidence
    const confidenceMultiplier = 0.3 + (confidence * 0.7); // 30% to 100% based on confidence
    const adjustedShares = Math.min(maxSharesByRisk, maxSharesByCapital) * confidenceMultiplier;

    return Math.max(0, adjustedShares);
  }

  /**
   * Add or update a position
   * @param position - Position information
   */
  public addOrUpdatePosition(position: PositionRisk): void {
    const existingIndex = this.openPositions.findIndex(p => p.symbol === position.symbol);
    if (existingIndex >= 0) {
      this.openPositions[existingIndex] = position;
    } else {
      this.openPositions.push(position);
    }
  }

  /**
   * Remove a position
   * @param symbol - Symbol to remove
   */
  public removePosition(symbol: SymbolType): void {
    this.openPositions = this.openPositions.filter(p => p.symbol !== symbol);
  }

  /**
   * Calculate total risk across all positions
   * @returns Total risk as percentage of hypothetical portfolio
   */
  public calculateTotalRisk(): number {
    return this.openPositions.reduce((total, position) => total + position.riskPercentage, 0);
  }

  /**
   * Get current risk metrics
   * @returns Current risk metrics
   */
  public getRiskMetrics(): {
    totalPositions: number;
    totalUnrealizedPnl: number;
    totalRisk: number;
    dailyPnl: number;
    riskScore: number;
  } {
    const totalUnrealizedPnl = this.openPositions.reduce((total, pos) => total + pos.unrealizedPnl, 0);
    const totalRisk = this.calculateTotalRisk();

    // Calculate overall risk score
    let riskScore = 0;
    if (this.dailyPnl < -this.riskParameters.maxDailyLoss) riskScore += 0.4;
    if (totalRisk > this.riskParameters.maxTotalRisk) riskScore += 0.3;
    if (this.openPositions.length > 5) riskScore += 0.2;
    riskScore += Math.min(totalRisk * 2, 0.1);

    return {
      totalPositions: this.openPositions.length,
      totalUnrealizedPnl,
      totalRisk,
      dailyPnl: this.dailyPnl,
      riskScore: Math.min(riskScore, 1),
    };
  }

  /**
   * Update daily P&L
   * @param pnl - Profit or loss amount
   */
  public updateDailyPnl(pnl: number): void {
    this.dailyPnl += pnl;
  }

  /**
   * Reset daily P&L (typically called at start of new day)
   */
  public resetDailyPnl(): void {
    this.dailyPnl = 0;
  }

  /**
   * Get risk parameters
   * @returns Current risk parameters
   */
  public getRiskParameters(): RiskParameters {
    return { ...this.riskParameters };
  }

  /**
   * Update risk parameters
   * @param newParameters - New risk parameters
   */
  public updateRiskParameters(newParameters: Partial<RiskParameters>): void {
    this.riskParameters = { ...this.riskParameters, ...newParameters };
  }

  /**
   * Check if trading should be halted based on risk metrics
   * @returns Whether trading should be halted
   */
  public shouldHaltTrading(): boolean {
    // 🚨 RISK CONTROL DISABLED - 永不停止交易
    console.log("🚨 交易暂停检查已禁用 - 系统将永不停止交易");
    return false;
  }
}

// Create a default risk manager instance
export const defaultRiskManager = new RiskManager();

/**
 * Utility function to calculate risk percentage for a position
 * @param entryPrice - Entry price
 * @param stopLoss - Stop loss price
 * @param quantity - Position size
 * @param portfolioValue - Total portfolio value
 * @returns Risk percentage
 */
export function calculateRiskPercentage(
  entryPrice: number,
  stopLoss: number,
  quantity: number,
  portfolioValue: number
): number {
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const totalRisk = riskPerShare * quantity;
  return totalRisk / portfolioValue;
}

/**
 * Utility function to calculate position risk
 * @param symbol - Trading symbol
 * @param entryPrice - Entry price
 * @param currentPrice - Current price
 * @param quantity - Position size
 * @param leverage - Leverage multiplier
 * @param stopLoss - Stop loss price
 * @param portfolioValue - Total portfolio value
 * @returns Position risk information
 */
export function calculatePositionRisk(
  symbol: SymbolType,
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  leverage: number,
  stopLoss: number | undefined,
  portfolioValue: number
): PositionRisk {
  const unrealizedPnl = (currentPrice - entryPrice) * quantity * leverage;
  const riskUsd = stopLoss ? Math.abs(entryPrice - stopLoss) * quantity * leverage : 0;
  const riskPercentage = riskUsd / portfolioValue;

  return {
    symbol,
    entryPrice,
    currentPrice,
    quantity,
    leverage,
    stopLoss,
    unrealizedPnl,
    riskUsd,
    riskPercentage,
  };
}