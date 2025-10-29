const jwt = require('jsonwebtoken');
require('dotenv').config();

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;

if (!CRON_SECRET_KEY) {
  console.error('❌ CRON_SECRET_KEY not found in .env file');
  process.exit(1);
}

// 生成JWT token
const token = jwt.sign(
  {
    cron: true,
    timestamp: Date.now()
  },
  CRON_SECRET_KEY,
  {
    expiresIn: '24h' // 24小时有效期
  }
);

console.log('✅ Generated JWT token:');
console.log(token);
console.log('\n📋 Use this token in your cron calls:');
console.log(`curl "http://localhost:3000/api/cron/20-seconds-metrics-interval?token=${token}"`);