import { NextRequest, NextResponse } from "next/server";
import { deepseekArk } from "@/lib/ai/model";
import { enhancedSystemPrompt, generateEnhancedUserPrompt } from "@/lib/ai/enhanced-prompt";
import { getAllMarketStates } from "@/lib/trading/current-market-state";
import { getAccountInformationAndPerformance } from "@/lib/trading/account-information-and-performance";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log('🧠 Testing AI Decision Generation...\n');

    // Get market states and account info
    const allMarketStates = await getAllMarketStates();
    const accountInformationAndPerformance = await getAccountInformationAndPerformance(Number(process.env.START_MONEY));
    const invocationCount = await prisma.chat.count();

    const userPrompt = await generateEnhancedUserPrompt({
      allMarketStates,
      accountInformationAndPerformance,
      // No startTime provided - will use first trade time automatically
      invocationCount,
    });

    console.log('📝 User prompt generated, calling AI...');

    // Generate AI decision
    const { object, reasoning } = await deepseekArk.generateObject({
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        { role: "user", content: userPrompt }
      ],
      schema: {
        type: "object",
        properties: {
          signal: { type: "string", enum: ["buy_to_enter", "sell_to_enter", "hold", "close"] },
          coin: { type: "string", enum: ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"] },
          quantity: { type: "number" },
          leverage: { type: "number", minimum: 1, maximum: 125 },
          profit_target: { type: "number" },
          stop_loss: { type: "number" },
          invalidation_condition: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          risk_usd: { type: "number" },
          justification: { type: "string" }
        },
        required: ["signal", "coin", "quantity", "leverage", "confidence", "justification"]
      },
      temperature: 0.7,
      max_tokens: 32768
    });

    console.log('🤖 AI Decision generated:');
    console.log('- Signal:', object.signal);
    console.log('- Coin:', object.coin);
    console.log('- Quantity:', object.quantity);
    console.log('- Leverage:', object.leverage);
    console.log('- Confidence:', object.confidence);
    console.log('- Justification:', object.justification);

    const results = {
      success: true,
      aiDecision: object,
      reasoning,
      promptLength: userPrompt.length,
      marketDataCount: Object.keys(allMarketStates).length,
      accountBalance: accountInformationAndPerformance.totalBalance,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ AI generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: `AI generation failed: ${error}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}