// 东方财富API代理函数
// 解决浏览器CORS限制

export default async function handler(req, res) {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: '只支持GET请求' });
    return;
  }

  try {
    const { code, type = 'realtime' } = req.query;

    // 验证股票代码
    if (!code || !/^\d{6}$/.test(code)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(400).json({ error: '无效的股票代码，请输入6位数字代码' });
      return;
    }

    // 确定市场前缀 (0=深圳，1=上海)
    // 深圳股票: 000001-001000, 002xxx, 300xxx
    // 上海股票: 600xxx, 601xxx, 603xxx, 605xxx, 688xxx
    let market = '0'; // 默认深圳
    const codeNum = parseInt(code, 10);

    if (code.startsWith('6')) {
      market = '1'; // 上海
    }

    console.log(`代理请求: 股票${code}, 市场${market}, 类型${type}`);

    // 东方财富API端点
    let apiUrl = '';

    switch (type) {
      case 'realtime':
        // 实时行情API
        // fields参数说明:
        // f43: 当前价格, f44: 最高价, f45: 最低价, f46: 今开, f47: 成交量, f48: 成交额
        // f60: 昨收, f168: 换手率, f169: 涨跌幅, f170: 涨跌额
        apiUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${market}.${code}&fields=f43,f44,f45,f46,f47,f48,f58,f60,f168,f169,f170`;
        break;

      case 'kline':
        // K线数据 (日线)
        apiUrl = `https://push2.eastmoney.com/api/qt/stock/kline/get?secid=${market}.${code}&klt=101&fqt=1&lmt=30`;
        break;

      default:
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(400).json({ error: `不支持的数据类型: ${type}` });
        return;
    }

    console.log(`请求东方财富API: ${apiUrl}`);

    // 添加请求头模拟浏览器请求
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://quote.eastmoney.com/',
      'Accept': 'application/json, text/plain, */*'
    };

    // 发送请求到东方财富API
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);

  } catch (error) {
    console.error('代理函数错误:', error);

    // 返回错误信息
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: '获取股票数据失败',
      message: error.message,
      // 开发环境下返回详细错误
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}