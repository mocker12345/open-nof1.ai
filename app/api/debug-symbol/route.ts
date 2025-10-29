import { NextRequest, NextResponse } from "next/server";
import { binance } from "@/lib/trading/binance";
import { executeBuyOrder } from "@/lib/trading/buy";
import { tradingExecutionService, AIDecision } from "@/lib/trading/execution-service";

export async function GET(request: NextRequest) {
  try {
    const results = {
      symbolTests: [],
      leverageTests: [],
      orderTests: [],
      error: null
    };

    // Test different symbol formats
    const symbols = ['BTC', 'BTC/USDT', 'BTCUSDT'];

    for (const symbol of symbols) {
      try {
        console.log(`Testing symbol: ${symbol}`);
        const ticker = await binance.fetchTicker(symbol);
        results.symbolTests.push({
          symbol,
          success: true,
          price: ticker.last
        });
      } catch (error) {
        results.symbolTests.push({
          symbol,
          success: false,
          error: error.message
        });
      }
    }

    // Test leverage setting for different symbol formats
    const leverageSymbols = [
      { format: 'BTC', binanceFormat: 'BTC/USDT', futuresFormat: 'BTCUSDT' },
      { format: 'ETH', binanceFormat: 'ETH/USDT', futuresFormat: 'ETHUSDT' }
    ];

    for (const test of leverageSymbols) {
      try {
        console.log(`Testing leverage for ${test.format} as ${test.futuresFormat}`);
        await binance.fapiPrivatePostLeverage({
          symbol: test.futuresFormat,
          leverage: 1
        });
        results.leverageTests.push({
          symbol: test.format,
          format: test.futuresFormat,
          success: true
        });
      } catch (error) {
        results.leverageTests.push({
          symbol: test.format,
          format: test.futuresFormat,
          success: false,
          error: error.message
        });
      }
    }

    // Test orders with different symbol formats
    const orderTests = [
      { symbol: 'BTC', quantity: 0.001, leverage: 1 },
      { symbol: 'ETH', quantity: 0.01, leverage: 1 }
    ];

    for (const test of orderTests) {
      try {
        console.log(`Testing order for ${test.symbol}`);
        const orderResult = await executeBuyOrder(test);
        results.orderTests.push({
          symbol: test.symbol,
          success: orderResult.success,
          orderId: orderResult.orderId,
          price: orderResult.price,
          error: orderResult.error
        });
      } catch (error) {
        results.orderTests.push({
          symbol: test.symbol,
          success: false,
          error: error.message
        });
      }
    }

    // Test AI execution with different symbols
    const aiSymbols: AIDecision[] = [
      {
        signal: 'buy_to_enter',
        coin: 'BTC',
        quantity: 0.001,
        leverage: 1,
        confidence: 0.8,
        justification: 'Debug BTC execution'
      },
      {
        signal: 'buy_to_enter',
        coin: 'ETH',
        quantity: 0.01,
        leverage: 1,
        confidence: 0.8,
        justification: 'Debug ETH execution'
      }
    ];

    const accountBalance = await tradingExecutionService.getAccountBalance();

    for (const decision of aiSymbols) {
      try {
        console.log(`Testing AI execution for ${decision.coin}`);
        const result = await tradingExecutionService.executeDecision(
          decision,
          accountBalance.availableBalance
        );

        if (!results.orderTests) results.orderTests = [];
        results.orderTests.push({
          symbol: `AI-${decision.coin}`,
          success: result.success,
          orderId: result.execution?.orderId,
          price: result.execution?.executedPrice,
          error: result.error
        });
      } catch (error) {
        if (!results.orderTests) results.orderTests = [];
        results.orderTests.push({
          symbol: `AI-${decision.coin}`,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Debug test failed:', error);
    return NextResponse.json(
      { error: `Debug test failed: ${error}` },
      { status: 500 }
    );
  }
}