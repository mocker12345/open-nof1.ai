import { NextRequest, NextResponse } from "next/server";
import { deepseekArk } from "@/lib/ai/model";
import { enhancedSystemPrompt, generateEnhancedUserPrompt } from "@/lib/ai/enhanced-prompt";
import { getAllMarketStates } from "@/lib/trading/current-market-state";
import { getAccountInformationAndPerformance } from "@/lib/trading/account-information-and-performance";
import { prisma } from "@/lib/prisma";
import { tradingExecutionService, AIDecision } from "@/lib/trading/execution-service";

export async function GET(request: NextRequest) {
  try {
    console.log('💪 Force Trading Test...\n');

    // Get market states and account info
    const allMarketStates = await getAllMarketStates();
    const accountInformationAndPerformance = await getAccountInformationAndPerformance(Number(process.env.START_MONEY));
    const invocationCount = await prisma.chat.count();

    // Create a modified user prompt that forces a buy decision
    const forceBuyPrompt = await generateEnhancedUserPrompt({
      allMarketStates,
      accountInformationAndPerformance,
      // No startTime provided - will use first trade time automatically
      invocationCount,
    }) + `

IMPORTANT: For this test, you MUST generate a BUY_TO_ENTER signal regardless of market conditions.
This is to test the execution system. Choose BTC with a small quantity (0.001) and 1x leverage.
Set confidence to 0.9 to ensure execution.
Provide a justification about testing the system.
`;

    console.log('📝 Modified prompt created, forcing buy decision...');

    // Generate AI decision with forced buy
    const { object, reasoning } = await deepseekArk.generateObject({
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        { role: "user", content: forceBuyPrompt }
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
      temperature: 0.1, // Lower temperature for more predictable response
      max_tokens: 32768
    });

    console.log('🤖 Forced AI Decision:');
    console.log('- Signal:', object.signal);
    console.log('- Coin:', object.coin);
    console.log('- Quantity:', object.quantity);
    console.log('- Leverage:', object.leverage);
    console.log('- Confidence:', object.confidence);

    // Convert signal string to enum
    let operation = "HOLD";
    switch (object.signal) {
      case "buy_to_enter":
        operation = "BUY_TO_ENTER";
        break;
      case "sell_to_enter":
        operation = "SELL_TO_ENTER";
        break;
      case "hold":
        operation = "HOLD";
        break;
      case "close":
        operation = "CLOSE";
        break;
    }

    // Create AI decision object
    const aiDecision: AIDecision = {
      signal: object.signal,
      coin: object.coin,
      quantity: object.quantity,
      leverage: object.leverage,
      profit_target: object.profit_target,
      stop_loss: object.stop_loss,
      invalidation_condition: object.invalidation_condition,
      confidence: object.confidence,
      risk_usd: object.risk_usd,
      justification: object.justification,
    };

    // Get available capital
    const accountBalance = await tradingExecutionService.getAccountBalance();
    const availableCapital = accountBalance.availableBalance;

    console.log('💰 Available Capital:', availableCapital);

    // Execute the decision with detailed logging
    console.log('⚡ Executing AI decision...');
    const executionResult = await tradingExecutionService.executeDecision(
      aiDecision,
      availableCapital
    );

    console.log('🎯 Execution Result:');
    console.log('- Success:', executionResult.success);
    console.log('- Execution:', executionResult.execution);
    console.log('- Error:', executionResult.error);
    console.log('- Warnings:', executionResult.warnings);

    // Create database record
    try {
      await prisma.chat.create({
        data: {
          reasoning: reasoning || "<no reasoning>",
          chat: `${object.justification || "<no justification>"}\n\nExecution: ${executionResult.success ? "SUCCESS" : "FAILED"}${executionResult.error ? ` - Error: ${executionResult.error}` : ""}`,
          userPrompt: forceBuyPrompt,
          tradings: {
            create: {
              symbol: object.coin,
              opeartion: operation as any,
              leverage: object.leverage,
              quantity: object.quantity,
              stopLoss: object.stop_loss,
              takeProfit: object.profit_target,
              invalidationCondition: object.invalidation_condition,
              confidence: object.confidence,
              riskUsd: object.risk_usd,
              justification: object.justification,
            },
          },
        },
      });
      console.log('💾 Decision saved to database');
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError);
    }

    const results = {
      success: true,
      aiDecision: object,
      executionResult: {
        success: executionResult.success,
        execution: executionResult.execution,
        error: executionResult.error,
        warnings: executionResult.warnings
      },
      availableCapital,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Force trade test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Force trade test failed: ${error}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}