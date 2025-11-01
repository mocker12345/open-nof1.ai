import { Position } from "ccxt";
import { binance } from "./binance";
import { prisma } from "../prisma";

export interface AccountInformationAndPerformance {
  currentPositionsValue: number;
  contractValue: number;
  totalCashValue: number;
  availableCash: number;
  currentTotalReturn: number;
  positions: Position[];
  sharpeRatio: number;
}

export async function getAccountInformationAndPerformance(
  initialCapital: number
): Promise<AccountInformationAndPerformance> {
  // Get all supported trading pairs
  const supportedSymbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "XRP/USDT"];

  // Fetch positions for all supported symbols
  const positions = await binance.fetchPositions(supportedSymbols);

  // Filter for active positions (with non-zero size)
  const activePositions = positions.filter(pos =>
    pos.contracts && Number(pos.contracts) !== 0 &&
    pos.side && pos.side !== 'both'
  );

  // Get recent trades from database to enrich position data
  const recentTrades = await prisma.trading.findMany({
    where: {
      opeartion: {
        in: ['BUY_TO_ENTER', 'SELL_TO_ENTER']
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });

  // Enrich positions with database metadata
  const enrichedPositions = activePositions.map((pos: any) => {
    // Clean symbol format (handle BTC/USDT:USDT -> BTC)
    const cleanSymbol = pos.symbol.replace(/\/.*$/, '');

    // Find matching trade from database
    const matchingTrade = recentTrades.find((trade: any) =>
      trade.symbol === cleanSymbol
    );

    console.log(`🔍 Enriching position ${cleanSymbol}:`, {
      originalSymbol: pos.symbol,
      cleanSymbol: cleanSymbol,
      foundMatch: !!matchingTrade,
      hasExitPlan: !!(matchingTrade?.stopLoss || matchingTrade?.takeProfit)
    });

    // Return position with both Binance data and database metadata
    return {
      ...pos,
      symbol: cleanSymbol, // Use clean symbol for consistency
      // Add database fields that enhanced-prompt.ts expects
      quantity: pos.contracts,
      currentPrice: Number(pos.markPrice?.toFixed(2)) || 0,
      entryPrice: Number(pos.entryPrice?.toFixed(2)) || 0,
      unrealizedPnl: Number(pos.unrealizedPnl?.toFixed(2)) || 0,
      profitTarget: matchingTrade?.takeProfit || 0,
      stopLoss: matchingTrade?.stopLoss || 0,
      invalidationCondition: matchingTrade?.invalidationCondition || 'None',
      confidence: matchingTrade?.confidence || 0,
      riskUsd: matchingTrade?.riskUsd || 0,
      notionalUsd: pos.notional || 0,
    };
  });

  const currentPositionsValue = enrichedPositions.reduce((acc, position) => {
    return acc + (position.initialMargin || 0) + (position.unrealizedPnl || 0);
  }, 0);

  const contractValue = enrichedPositions.reduce((acc, position) => {
    return acc + (position.contracts || 0);
  }, 0);

  const currentCashValue = await binance.fetchBalance({ type: "future" });

  // Handle both balance object structures (direct USDT property or nested in total/free)
  const totalCashValue = (currentCashValue as any).USDT?.total ||
                         (currentCashValue as any).total?.USDT ||
                         currentCashValue.total || 0;
  const availableCash = (currentCashValue as any).USDT?.free ||
                        (currentCashValue as any).free?.USDT ||
                        currentCashValue.free || 0;
  const currentTotalReturn = (totalCashValue - initialCapital) / initialCapital;

  const totalUnrealizedPnl = enrichedPositions.reduce((acc, position) => {
    return acc + (position.unrealizedPnl || 0);
  }, 0);

  // Calculate Sharpe ratio safely
  let sharpeRatio = 0;
  if (totalUnrealizedPnl !== 0 && initialCapital > 0) {
    sharpeRatio = currentTotalReturn / (totalUnrealizedPnl / initialCapital);
  }

  return {
    currentPositionsValue,
    contractValue,
    totalCashValue,
    availableCash,
    currentTotalReturn,
    positions: enrichedPositions, // Return enriched positions
    sharpeRatio,
  };
}

export function formatAccountPerformance(
  accountPerformance: AccountInformationAndPerformance
) {
  const { currentTotalReturn, availableCash, totalCashValue, positions } =
    accountPerformance;

  const output = `## HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
Current Total Return (percent): ${currentTotalReturn * 100}%
Available Cash: ${availableCash}
Current Account Value: ${totalCashValue}
Positions: ${positions
    .map((position) =>
      JSON.stringify({
        symbol: position.symbol,
        quantity: position.contracts,
        entry_price: position.entryPrice,
        current_price: position.markPrice,
        liquidation_price: position.liquidationPrice,
        unrealized_pnl: position.unrealizedPnl,
        leverage: position.leverage,
        notional_usd: position.notional,
        side: position.side,
        stopLoss: position.stopLossPrice,
        takeProfit: position.takeProfitPrice,
      })
    )
    .join("\n")}`;
  return output;
}
