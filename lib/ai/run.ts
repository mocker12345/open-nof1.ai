import { enhancedSystemPrompt, generateEnhancedUserPrompt } from "./enhanced-prompt";
import { getAllMarketStates } from "../trading/current-market-state";
import { deepseekArk } from "./model";
import { getAccountInformationAndPerformance } from "../trading/account-information-and-performance";
import { prisma } from "../prisma";
import { tradingExecutionService, AIDecision } from "../trading/execution-service";

// Use string literals instead of Prisma enums to avoid type generation issues
type OperationType = "BUY_TO_ENTER" | "SELL_TO_ENTER" | "HOLD" | "CLOSE";
type SymbolType = "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP";

/**
 * you can interval trading using cron job
 */
export async function run(initialCapital: number) {
  // Get market states for all supported coins
  const allMarketStates = await getAllMarketStates();
  const accountInformationAndPerformance =
    await getAccountInformationAndPerformance(initialCapital);
  // Count previous Chat entries to provide an invocation counter in the prompt
  const invocationCount = await prisma.chat.count();

  const userPrompt = await generateEnhancedUserPrompt({
    allMarketStates,
    accountInformationAndPerformance,
    // No startTime provided - will use first trade time automatically
    invocationCount,
  });

  // 使用自定义ARK客户端
  const { object, reasoning } = await deepseekArk.generateObject({
    messages: [
      { role: "system", content: enhancedSystemPrompt },
      { role: "user", content: userPrompt }
    ],
    schema: {
      type: "object",
      properties: {
        decisions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              signal: { type: "string", enum: ["buy_to_enter", "sell_to_enter", "hold", "close"] },
              coin: { type: "string", enum: ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"] },
              quantity: { type: "number", description: "Position size in coin units (e.g., for SOL with $5000 capital at $200, use 25 units for full position)" },
              leverage: { type: "number", minimum: 1, maximum: 125, description: "Leverage multiplier (1-125)" },
              profit_target: { type: "number", description: "Take profit price level" },
              stop_loss: { type: "number", description: "Stop loss price level" },
              invalidation_condition: { type: "string", description: "Specific market signal that voids the thesis" },
              confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence level (0-1)" },
              risk_usd: { type: "number", description: "Dollar amount at risk" }
            },
            required: ["signal", "coin", "quantity", "leverage", "confidence"]
          }
        },
        justification: { type: "string", description: "Comprehensive analysis of all coins" }
      },
      required: ["decisions", "justification"]
    },
    temperature: 0.7,
    max_tokens: 32768
  });

  console.log(`\n🤖 === AI DECISIONS DEBUG ===`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`💭 Unified Justification: ${object.justification}`);
  console.log(`📊 Total Decisions: ${object.decisions?.length || 0}`);
  console.log(`===============================\n`);

  // Get available capital for trading
  const accountBalance = await tradingExecutionService.getAccountBalance();
  const availableCapital = accountBalance.availableBalance;

  // Process each decision
  const tradingData = [];
  const executionResults = [];

  for (const decision of (object.decisions || [])) {
    // Convert signal string to enum
    let operation: OperationType;
    switch (decision.signal) {
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
      default:
        operation = "HOLD";
    }

    // Convert coin string to enum
    let coin: SymbolType;
    switch (decision.coin) {
      case "BTC":
        coin = "BTC";
        break;
      case "ETH":
        coin = "ETH";
        break;
      case "SOL":
        coin = "SOL";
        break;
      case "BNB":
        coin = "BNB";
        break;
      case "DOGE":
        coin = "DOGE";
        break;
      case "XRP":
        coin = "XRP";
        break;
      default:
        coin = "BTC";
    }

    // Create AI decision object
    const aiDecision: AIDecision = {
      signal: decision.signal,
      coin: coin,
      quantity: decision.quantity,
      leverage: decision.leverage,
      profit_target: decision.profit_target,
      stop_loss: decision.stop_loss,
      invalidation_condition: decision.invalidation_condition,
      confidence: decision.confidence,
      risk_usd: decision.risk_usd,
      justification: object.justification, // Use unified justification
    };

    console.log(`\n🤖 === ${coin} DECISION DEBUG ===`);
    console.log(`🤖 AI Decision: ${aiDecision.signal} ${aiDecision.coin}`);
    console.log(`📊 Signal Type: ${aiDecision.signal}`);
    console.log(`🪙 Coin: ${aiDecision.coin}`);
    console.log(`📈 Quantity: ${aiDecision.quantity}`);
    console.log(`⚡ Leverage: ${aiDecision.leverage}x`);
    console.log(`🎯 Confidence: ${(aiDecision.confidence * 100).toFixed(1)}%`);
    console.log(`💵 Risk USD: $${aiDecision.risk_usd || 'N/A'}`);
    console.log(`🛡️ Stop Loss: ${aiDecision.stop_loss || 'N/A'}`);
    console.log(`🎯 Profit Target: ${aiDecision.profit_target || 'N/A'}`);
    console.log(`❓ Invalidation: ${aiDecision.invalidation_condition || 'N/A'}`);

    
    // Prepare trading data for database
    const baseTradingData = {
      symbol: coin,
      opeartion: operation,
      leverage: decision.leverage,
      amount: decision.quantity, // Map to database field name
      quantity: decision.quantity,
      stopLoss: decision.stop_loss,
      takeProfit: decision.profit_target,
      invalidationCondition: decision.invalidation_condition,
      confidence: decision.confidence,
      riskUsd: decision.risk_usd,
      justification: object.justification, // Use unified justification
    };

    // Only execute non-hold decisions
    if (decision.signal !== "hold") {
      console.log(`⚡ === ${coin} EXECUTION DEBUG ===`);
      console.log(`🚀 Starting execution process...`);

      const executionResult = await tradingExecutionService.executeDecision(
        aiDecision,
        availableCapital
      );

      console.log(`⚡ Execution Result: ${executionResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
      if (executionResult.execution) {
        console.log(`📈 Order ID: ${executionResult.execution.orderId}`);
        console.log(`💵 Executed Price: $${executionResult.execution.executedPrice}`);
        console.log(`📊 Executed Quantity: ${executionResult.execution.executedQuantity}`);
        console.log(`🔄 Trade Type: ${executionResult.execution.type}`);

        // Update pricing with actual executed price
        tradingData.push({
          ...baseTradingData,
          pricing: executionResult.execution.executedPrice || 0
        });
      } else {
        // Execution failed, still save with pricing 0
        tradingData.push({
          ...baseTradingData,
          pricing: 0
        });
      }

      if (executionResult.error) {
        console.log(`🚨 Error: ${executionResult.error}`);
      }
      if (executionResult.warnings && executionResult.warnings.length > 0) {
        console.log(`⚠️ Warnings: ${executionResult.warnings.join(", ")}`);
      }

      executionResults.push({
        coin,
        execution: executionResult
      });
    } else {
      console.log(`⚪ ${coin}: HOLD - No execution needed`);
      // For HOLD operations, pricing stays 0
      tradingData.push({
        ...baseTradingData,
        pricing: 0
      });
    }
  }

  console.log(`\n===============================\n`);

  // Create chat record with all trading data and execution results
  const executionSummary = executionResults.map(result =>
    `${result.coin}: ${result.execution.success ? "SUCCESS" : "FAILED"}${result.execution.error ? ` - Error: ${result.execution.error}` : ""}`
  ).join(" | ");

  const chatRecord = await prisma.chat.create({
    data: {
      reasoning: reasoning || "<no reasoning>",
      chat: `${object.justification || "<no justification>"}\n\nExecutions: ${executionSummary || "No executions (all hold)"}`,
      userPrompt,
    },
  });

  // Now create trading records with the chatId
  if (tradingData.length > 0) {
    await prisma.trading.createMany({
      data: tradingData.map(data => ({
        ...data,
        chatId: chatRecord.id
      }))
    });
  }

  // Store execution result separately (could be enhanced with proper execution logging table)
  console.log(`📝 Decision logged to database at ${new Date().toISOString()}`);
}