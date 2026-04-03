// api/test-cjs.js - CommonJS格式测试函数
module.exports = async function handler(req, res) {
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
    message: 'CommonJS API test successful',
    timestamp: new Date().toISOString(),
    query: req.query,
    format: 'CommonJS'
  });
};