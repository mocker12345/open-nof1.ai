import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log('🔍 Debug: Fetching recent trading data from database...');

    // Get most recent trades
    const recentTrades = await prisma.trading.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        symbol: true,
        opeartion: true,
        leverage: true,
        quantity: true,
        stopLoss: true,
        takeProfit: true,
        invalidationCondition: true,
        confidence: true,
        riskUsd: true,
        justification: true,
        createdAt: true,
      }
    });

    console.log(`🔍 Found ${recentTrades.length} recent trades`);

    return NextResponse.json({
      success: true,
      data: {
        trades: recentTrades,
        totalCount: recentTrades.length,
        debugInfo: {
          hasStopLossData: recentTrades.some(t => t.stopLoss !== null),
          hasTakeProfitData: recentTrades.some(t => t.takeProfit !== null),
          hasRiskUsdData: recentTrades.some(t => t.riskUsd !== null),
          hasInvalidationConditionData: recentTrades.some(t => t.invalidationCondition !== null),
          hasConfidenceData: recentTrades.some(t => t.confidence !== null),
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching trading data:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch trading data: ${error}`
      },
      { status: 500 }
    );
  }
}