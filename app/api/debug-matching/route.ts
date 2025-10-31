import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { binance } from "@/lib/trading/binance";

export async function GET() {
  try {
    console.log('🔍 Debug: Testing position matching logic...');

    // Get active positions
    const positions = await binance.fetchPositions();
    const activePositions = positions.filter(pos =>
      pos.contracts && Number(pos.contracts) !== 0 &&
      pos.side && pos.side !== 'both'
    );

    console.log(`Found ${activePositions.length} active positions`);

    // Get recent trades
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

    console.log(`Found ${recentTrades.length} recent trades`);

    // Test matching for each position
    const matchingResults = activePositions.map(pos => {
      const cleanSymbol = pos.symbol.replace(/\/.*$/, '');
      const matchingTrade = recentTrades.find(trade =>
        trade.symbol === cleanSymbol
      );

      return {
        originalSymbol: pos.symbol,
        cleanSymbol: cleanSymbol,
        foundMatch: !!matchingTrade,
        tradeData: matchingTrade ? {
          symbol: matchingTrade.symbol,
          opeartion: matchingTrade.opeartion,
          stopLoss: matchingTrade.stopLoss,
          takeProfit: matchingTrade.takeProfit,
          riskUsd: matchingTrade.riskUsd,
          invalidationCondition: matchingTrade.invalidationCondition,
          confidence: matchingTrade.confidence,
          createdAt: matchingTrade.createdAt
        } : null,
        availableTradeSymbols: recentTrades.map(t => t.symbol)
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activePositionsCount: activePositions.length,
        recentTradesCount: recentTrades.length,
        matchingResults,
        debugInfo: {
          allTradeSymbols: recentTrades.map(t => ({ symbol: t.symbol, createdAt: t.createdAt })),
          allPositionSymbols: activePositions.map(p => ({ symbol: p.symbol, contracts: p.contracts }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in debug matching:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Debug matching failed: ${error}`
      },
      { status: 500 }
    );
  }
}