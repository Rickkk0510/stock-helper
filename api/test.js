// api/test.js - 简单测试函数验证Vercel函数部署
export default async function handler(req, res) {
  // CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    res.status(405).json({ error: '只支持GET请求' });
    return;
  }

  res.status(200).json({
    message: 'API test successful',
    timestamp: new Date().toISOString(),
    query: req.query,
    environment: process.env.NODE_ENV || 'development'
  });
}