import { NextRequest, NextResponse } from "next/server";
import { binance } from "@/lib/trading/binance";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching current positions...');

    // Get current positions from exchange
    const positions = await binance.fetchPositions();

    // Filter for active positions (with non-zero size)
    const activePositions = positions.filter(pos =>
      pos.contracts && Number(pos.contracts) !== 0 &&
      pos.side && pos.side !== 'both'
    );

    console.log(`Found ${activePositions.length} active positions`);

    // Get recent trades from database for additional context
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

    // Combine exchange data with database data
    const enrichedPositions = activePositions.map(pos => {
      // Find matching trade from database
      const matchingTrade = recentTrades.find(trade =>
        trade.symbol === pos.symbol.replace('/USDT', '')
      );

      return {
        symbol: pos.symbol.replace('/USDT', ''),
        side: pos.side,
        contracts: pos.contracts,
        entryPrice: pos.entryPrice,
        markPrice: pos.markPrice,
        unrealizedPnl: pos.unrealizedPnl,
        percentage: pos.percentage,
        leverage: pos.leverage,
        liquidationPrice: pos.liquidationPrice,
        timestamp: pos.timestamp,
        // Add database context if available
        dbTrade: matchingTrade ? {
          leverage: matchingTrade.leverage,
          stopLoss: matchingTrade.stopLoss,
          takeProfit: matchingTrade.takeProfit,
          confidence: matchingTrade.confidence,
          justification: matchingTrade.justification,
          createdAt: matchingTrade.createdAt
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        positions: enrichedPositions,
        totalCount: enrichedPositions.length,
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch positions: ${error}`
      },
      { status: 500 }
    );
  }
}