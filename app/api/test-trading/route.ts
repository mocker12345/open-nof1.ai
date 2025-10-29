import { NextRequest, NextResponse } from "next/server";
import { tradingExecutionService, AIDecision } from "@/lib/trading/execution-service";
import { executeBuyOrder } from "@/lib/trading/buy";
import { binance } from "@/lib/trading/binance";

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Starting Trading API Test...\n');

    const results = {
      connection: false,
      balance: null,
      marketData: null,
      buyOrder: null,
      aiExecution: null,
      error: null
    };

    // 1. Test Binance connection
    try {
      console.log('1️⃣ Testing Binance connection...');
      const balance = await binance.fetchBalance();
      results.connection = true;
      results.balance = {
        USDT: balance.USDT,
        total: balance.USDT?.total || 0,
        free: balance.USDT?.free || 0
      };
      console.log('✅ Binance connection successful');
    } catch (error) {
      console.error('❌ Binance connection failed:', error);
      results.error = `Binance connection: ${error}`;
    }

    // 2. Test market data
    try {
      console.log('2️⃣ Testing market data...');
      const ticker = await binance.fetchTicker('BTC/USDT');
      results.marketData = {
        symbol: 'BTC/USDT',
        price: ticker.last,
        timestamp: ticker.timestamp
      };
      console.log('✅ Market data fetched:', ticker.last);
    } catch (error) {
      console.error('❌ Market data failed:', error);
      results.error = `Market data: ${error}`;
    }

    // 3. Test execution service balance
    try {
      console.log('3️⃣ Testing execution service...');
      const accountBalance = await tradingExecutionService.getAccountBalance();
      if (!results.balance) results.balance = {};
      results.balance.executionService = {
        totalBalance: accountBalance.totalBalance,
        availableBalance: accountBalance.availableBalance
      };
      console.log('✅ Execution service balance:', accountBalance);
    } catch (error) {
      console.error('❌ Execution service failed:', error);
      results.error = `Execution service: ${error}`;
    }

    // 4. Test small buy order
    try {
      console.log('4️⃣ Testing buy order...');
      const testOrder = {
        symbol: 'BTC',
        quantity: 0.001,
        leverage: 1
      };

      const buyResult = await executeBuyOrder(testOrder);
      results.buyOrder = {
        success: buyResult.success,
        orderId: buyResult.orderId,
        price: buyResult.price,
        executedQuantity: buyResult.executedQuantity,
        error: buyResult.error
      };
      console.log('✅ Buy order result:', buyResult.success);
    } catch (error) {
      console.error('❌ Buy order failed:', error);
      results.error = `Buy order: ${error}`;
    }

    // 5. Test AI decision execution
    try {
      console.log('5️⃣ Testing AI execution...');
      const testAIDecision: AIDecision = {
        signal: 'buy_to_enter',
        coin: 'BTC',
        quantity: 0.001,
        leverage: 1,
        confidence: 0.8,
        justification: 'API Test Execution'
      };

      const availableBalance = results.balance?.executionService?.availableBalance || 1000;
      const executionResult = await tradingExecutionService.executeDecision(
        testAIDecision,
        availableBalance
      );

      results.aiExecution = {
        success: executionResult.success,
        signal: executionResult.decision.signal,
        coin: executionResult.decision.coin,
        execution: executionResult.execution,
        error: executionResult.error,
        warnings: executionResult.warnings
      };
      console.log('✅ AI execution result:', executionResult.success);
    } catch (error) {
      console.error('❌ AI execution failed:', error);
      results.error = `AI execution: ${error}`;
    }

    console.log('\n🏁 Test completed');
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ API Test failed:', error);
    return NextResponse.json(
      { error: `Test failed: ${error}` },
      { status: 500 }
    );
  }
}