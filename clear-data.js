const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function clearAllData() {
  const prisma = new PrismaClient();

  console.log('🗑️  准备清除所有数据库记录...\n');

  try {
    // 确认操作
    console.log('⚠️  警告：此操作将删除以下所有数据：');
    console.log('   - Trading 记录 (交易历史)');
    console.log('   - Chat 记录 (AI决策历史)');
    console.log('   - Metrics 记录 (性能指标)');
    console.log('');

    // 删除 Trading 记录
    const tradingCount = await prisma.trading.count();
    if (tradingCount > 0) {
      await prisma.trading.deleteMany({});
      console.log(`✅ 已删除 ${tradingCount} 条 Trading 记录`);
    } else {
      console.log('ℹ️  没有 Trading 记录需要删除');
    }

    // 删除 Chat 记录
    const chatCount = await prisma.chat.count();
    if (chatCount > 0) {
      await prisma.chat.deleteMany({});
      console.log(`✅ 已删除 ${chatCount} 条 Chat 记录`);
    } else {
      console.log('ℹ️  没有 Chat 记录需要删除');
    }

    // 删除 Metrics 记录
    const metricsCount = await prisma.metrics.count();
    if (metricsCount > 0) {
      await prisma.metrics.deleteMany({});
      console.log(`✅ 已删除 ${metricsCount} 条 Metrics 记录`);
    } else {
      console.log('ℹ️  没有 Metrics 记录需要删除');
    }

    console.log('\n🎉 所有数据清除完成！数据库已重置为初始状态。');

  } catch (error) {
    console.error('❌ 清除数据时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 询问用户确认
console.log('🚀 Open Nof1.ai - 数据清除工具');
console.log('==================================');
console.log('');

// 如果直接运行此脚本，执行清除操作
if (require.main === module) {
  clearAllData();
}

module.exports = { clearAllData };