require('dotenv').config();
const { binance } = require('./lib/trading/binance');

async function getAccountInfo() {
  console.log('🏦 获取Binance账户信息...\n');

  try {
    // 获取期货账户余额
    console.log('📊 期货账户余额:');
    const balance = await binance.fetchBalance({ type: 'future' });
    console.log('USDT余额:', {
      total: balance.USDT?.total || 0,
      free: balance.USDT?.free || 0,
      used: balance.USDT?.used || 0
    });

    // 获取所有非零余额
    console.log('\n💰 所有余额:');
    Object.entries(balance).forEach(([currency, info]) => {
      if (typeof info === 'object' && info.total > 0) {
        console.log(`${currency}: 总额=${info.total} 可用=${info.free} 冻结=${info.used}`);
      }
    });

    // 获取持仓信息
    console.log('\n📈 当前持仓:');
    const positions = await binance.fetchPositions();
    const activePositions = positions.filter(p => p.contracts !== 0 && p.side !== undefined);

    if (activePositions.length > 0) {
      activePositions.forEach(position => {
        console.log(`${position.symbol}:`);
        console.log(`  方向: ${position.side}`);
        console.log(`  数量: ${position.contracts}`);
        console.log(`  开仓价: $${position.entryPrice}`);
        console.log(`  标记价: $${position.markPrice}`);
        console.log(`  未实现盈亏: $${position.unrealizedPnl}`);
        console.log(`  杠杆: ${position.leverage}x`);
        console.log('  ---');
      });
    } else {
      console.log('无活跃持仓');
    }

    // 获取账户信息概览
    console.log('\n🎯 账户概览:');
    const accountInfo = await binance.fetchBalance({ type: 'future' });
    const totalValue = accountInfo.USDT?.total || 0;
    const availableValue = accountInfo.USDT?.free || 0;

    console.log(`账户总价值: $${totalValue}`);
    console.log(`可用资金: $${availableValue}`);
    console.log(`使用资金: $${totalValue - availableValue}`);

  } catch (error) {
    console.error('❌ 获取账户信息失败:', error.message);
    if (error.message.includes('Invalid API-key')) {
      console.log('\n💡 可能的解决方案:');
      console.log('1. 检查 .env 文件中的 BINANCE_API_KEY 是否正确');
      console.log('2. 检查 BINANCE_API_SECRET 是否正确');
      console.log('3. 确认API密钥有期货交易权限');
      console.log('4. 确认使用的是Demo账户的API密钥');
    }
  }
}

console.log('🚀 Open Nof1.ai - 账户信息查询工具');
console.log('==================================');
getAccountInfo();