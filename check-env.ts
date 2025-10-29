// Load environment variables
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

console.log('🔍 Environment Variables Check:');
console.log('BINANCE_API_KEY:', process.env.BINANCE_API_KEY ? `${process.env.BINANCE_API_KEY.slice(0, 8)}...` : 'NOT SET');
console.log('BINANCE_API_SECRET:', process.env.BINANCE_API_SECRET ? `${process.env.BINANCE_API_SECRET.slice(0, 8)}...` : 'NOT SET');
console.log('BINANCE_USE_DEMO:', process.env.BINANCE_USE_DEMO);
console.log('BINANCE_USE_SANDBOX:', process.env.BINANCE_USE_SANDBOX);
console.log('START_MONEY:', process.env.START_MONEY);

// Test with loaded environment
import { binance } from './lib/trading/binance';

async function testWithEnv() {
  try {
    console.log('\n🧪 Testing with environment variables...');

    // Check if binance is configured
    console.log('Binance API Key configured:', !!binance.apiKey);
    console.log('Binance Secret configured:', !!binance.secret);
    console.log('Binance sandbox/demo:', binance.demo);

    // Test a public endpoint (no auth required)
    console.log('\n📊 Testing public endpoint...');
    const ticker = await binance.fetchTicker('BTC/USDT');
    console.log('✅ Public endpoint works - BTC Price:', ticker.last);

    // Test private endpoint
    console.log('\n🔐 Testing private endpoint...');
    const balance = await binance.fetchBalance();
    console.log('✅ Private endpoint works');
    console.log('💰 Balance:', balance.USDT);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWithEnv();