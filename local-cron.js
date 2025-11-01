require('dotenv').config(); // 加载.env文件
const cron = require('node-cron');
const axios = require('axios');

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;
console.log('Using CRON_SECRET_KEY:', CRON_SECRET_KEY);
const BASE_URL = 'http://localhost:3000';

console.log('🚀 Starting local cron scheduler...');

// 每20秒收集指标
setInterval(async () => {
  try {
    console.log('📊 Collecting metrics...');
    const response = await axios.get(`${BASE_URL}/api/cron/20-seconds-metrics-interval?token=${CRON_SECRET_KEY}`);
    console.log('✅ Metrics collected:', response.data);
  } catch (error) {
    console.error('❌ Metrics collection failed:', error.message);
  }
}, 40000);

// 每3分钟执行交易
setInterval(async () => {
  try {
    console.log('🤖 Running trading analysis...');
    const response = await axios.get(`${BASE_URL}/api/cron/3-minutes-run-interval?token=${CRON_SECRET_KEY}`);
    console.log('✅ Trading executed:', response.data);
  } catch (error) {
    console.error('❌ Trading execution failed:', error.message);
  }
}, 180000);

console.log('⏰ Cron jobs scheduled successfully');
console.log('📊 Metrics: every 20 seconds');
console.log('🤖 Trading: every 3 minutes');