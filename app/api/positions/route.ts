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

    console.log(`🔍 Found ${recentTrades.length} recent trades in database`);
    if (recentTrades.length > 0) {
      console.log('🔍 First trade debug:', {
        symbol: recentTrades[0].symbol,
        stopLoss: recentTrades[0].stopLoss,
        takeProfit: recentTrades[0].takeProfit,
        riskUsd: recentTrades[0].riskUsd,
        invalidationCondition: recentTrades[0].invalidationCondition,
        confidence: recentTrades[0].confidence
      });
    }

    // Combine exchange data with database data
    const enrichedPositions = activePositions.map(pos => {
      // Find matching trade from database
      // Handle complex symbol formats like BTC/USDT:USDT -> BTC
      const cleanSymbol = pos.symbol.replace(/\/.*$/, '');
      const matchingTrade = recentTrades.find(trade =>
        trade.symbol === cleanSymbol
      );

      console.log(`🔍 Matching position ${cleanSymbol} with trade:`, {
        originalSymbol: pos.symbol,
        cleanSymbol: cleanSymbol,
        found: !!matchingTrade,
        tradeSymbol: matchingTrade?.symbol,
        hasStopLoss: !!matchingTrade?.stopLoss,
        hasTakeProfit: !!matchingTrade?.takeProfit,
        hasRiskUsd: !!matchingTrade?.riskUsd,
        hasInvalidationCondition: !!matchingTrade?.invalidationCondition
      });

      return {
        symbol: cleanSymbol, // Use the clean symbol for consistency
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
          riskUsd: matchingTrade.riskUsd,
          invalidationCondition: matchingTrade.invalidationCondition,
          model: 'Deepseek', // Default model since not stored in trading table
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