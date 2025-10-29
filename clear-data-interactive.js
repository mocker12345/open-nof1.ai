const readline = require('readline');
const { clearAllData } = require('./clear-data');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Open Nof1.ai - 交互式数据清除工具');
console.log('========================================');
console.log('');
console.log('⚠️  警告：此操作将永久删除以下所有数据：');
console.log('   📈 Trading 记录 (所有交易历史)');
console.log('   💬 Chat 记录 (所有AI决策和推理)');
console.log('   📊 Metrics 记录 (所有性能指标)');
console.log('');

rl.question('确定要继续吗？输入 "DELETE" 确认删除: ', async (answer) => {
  if (answer === 'DELETE') {
    console.log('\n🗑️  开始清除数据...\n');
    await clearAllData();
  } else {
    console.log('❌ 操作已取消');
  }
  rl.close();
});