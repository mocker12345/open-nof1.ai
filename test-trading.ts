import { binance } from './lib/trading/binance';
import { executeBuyOrder } from './lib/trading/buy';
import { tradingExecutionService, AIDecision } from './lib/trading/execution-service';

async function testTrading() {
  console.log('🧪 Testing Trading Execution...\n');

  try {
    // 1. Test Binance connection
    console.log('1️⃣ Testing Binance connection...');
    const balance = await binance.fetchBalance();
    console.log('✅ Binance connection successful');
    console.log('💰 USDT Balance:', balance.USDT);

    // 2. Test market price fetching
    console.log('\n2️⃣ Testing market data...');
    const ticker = await binance.fetchTicker('BTC/USDT');
    console.log('📈 BTC Price:', ticker.last);

    // 3. Test account balance via execution service
    console.log('\n3️⃣ Testing execution service...');
    const accountBalance = await tradingExecutionService.getAccountBalance();
    console.log('💵 Available Balance:', accountBalance.availableBalance);
    console.log('🏦 Total Balance:', accountBalance.totalBalance);

    // 4. Test a small buy order
    console.log('\n4️⃣ Testing small buy order...');
    const testOrder = {
      symbol: 'BTC',
      quantity: 0.001, // Very small amount for testing
      leverage: 1
    };

    console.log('📝 Order params:', testOrder);
    const buyResult = await executeBuyOrder(testOrder);

    console.log('🎯 Buy Result:');
    console.log('- Success:', buyResult.success);
    console.log('- Order ID:', buyResult.orderId);
    console.log('- Executed Price:', buyResult.price);
    console.log('- Executed Quantity:', buyResult.executedQuantity);
    console.log('- Error:', buyResult.error);

    // 5. Test AI decision execution
    console.log('\n5️⃣ Testing AI decision execution...');
    const testAIDecision: AIDecision = {
      signal: 'buy_to_enter',
      coin: 'BTC',
      quantity: 0.001,
      leverage: 1,
      confidence: 0.8,
      justification: 'Test execution'
    };

    const executionResult = await tradingExecutionService.executeDecision(
      testAIDecision,
      accountBalance.availableBalance
    );

    console.log('🤖 AI Execution Result:');
    console.log('- Success:', executionResult.success);
    console.log('- Execution:', executionResult.execution);
    console.log('- Error:', executionResult.error);
    console.log('- Warnings:', executionResult.warnings);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error);
  }
}

// Run the test
testTrading().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});