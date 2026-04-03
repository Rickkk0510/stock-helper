// 东方财富API代理函数
// 解决浏览器CORS限制
// Vercel Serverless Function配置
// @see https://vercel.com/docs/functions/serverless-functions

// 数据源配置
const DATA_SOURCES = {
  EAST_MONEY: 'eastmoney',  // 东方财富
  TENCENT: 'tencent'        // 腾讯财经（备用）
};

export default async function handler(req, res) {
  // Node.js 18+内置fetch，直接使用

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
      throw new Error(`东方财富API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);

  } catch (error) {
    console.error('东方财富API错误:', error);

    // 尝试腾讯财经API作为备用
    try {
      console.log('尝试腾讯财经API作为备用...');
      const { code, type = 'realtime' } = req.query;

      if (type !== 'realtime') {
        throw new Error('腾讯财经API只支持实时数据');
      }

      // 腾讯财经API格式
      // 深圳股票: sz000001, 上海股票: sh600036
      const prefix = code.startsWith('6') ? 'sh' : 'sz';
      const tencentUrl = `https://qt.gtimg.cn/q=${prefix}${code}`;

      console.log(`请求腾讯财经API: ${tencentUrl}`);

      const tencentResponse = await fetch(tencentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://stock.finance.qq.com/',
          'Accept': '*/*'
        }
      });

      if (!tencentResponse.ok) {
        throw new Error(`腾讯财经API请求失败: ${tencentResponse.status} ${tencentResponse.statusText}`);
      }

      const textData = await tencentResponse.text();

      // 解析腾讯财经API返回的文本格式
      // 格式示例: v_s_sz000001="51~平安银行~000001~11.12~11.11~11.10~107432~59962~47470~11.12~1789~11.11~2563~11.10~1276~11.09~584~11.08~756~11.13~861~11.14~1208~11.15~2466~11.16~3878~~20240403155602~0.01~0.09~11.65~11.02~11.12/107432/119804304~107432~11980~0.27~17.60~~11.65~11.02~2.28~3758.68~3758.68~4.17~11.32~10.92~0.71~2150~11.18~0.54~2150~11.05~~";
      const match = textData.match(/="([^"]+)"/);
      if (!match) {
        throw new Error('腾讯财经API返回格式异常');
      }

      const fields = match[1].split('~');
      // 字段说明: 0:未知,1:名称,2:代码,3:当前价,4:昨收,5:今开,6:成交量(手),7:外盘,8:内盘,9:买一价,10:买一量(手),11:买二价,12:买二量...
      const tencentData = {
        rc: 0,
        rt: 4,
        data: {
          f43: parseFloat(fields[3]) || 0,  // 当前价格
          f44: parseFloat(fields[4]) || 0,  // 昨收
          f45: parseFloat(fields[5]) || 0,  // 今开
          f46: parseFloat(fields[3]) || 0,  // 当前价格（同f43）
          f47: parseInt(fields[6]) * 100 || 0,  // 成交量(手转股)
          f48: 0,  // 成交额（腾讯API不直接提供）
          f58: fields[1] || '',  // 股票名称
          f60: parseFloat(fields[4]) || 0,  // 昨收
          f168: 0,  // 换手率
          f169: fields[3] && fields[4] ? ((parseFloat(fields[3]) - parseFloat(fields[4])) / parseFloat(fields[4]) * 100).toFixed(2) : 0,  // 涨跌幅
          f170: fields[3] && fields[4] ? (parseFloat(fields[3]) - parseFloat(fields[4])).toFixed(2) : 0  // 涨跌额
        },
        source: 'tencent'
      };

      console.log('腾讯财经API成功，返回数据');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(tencentData);

    } catch (tencentError) {
      console.error('腾讯财经API也失败:', tencentError);

      // 返回综合错误信息
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(500).json({
        error: '获取股票数据失败',
        message: `东方财富API错误: ${error.message} | 腾讯财经API错误: ${tencentError.message}`,
        suggestions: [
          '1. 检查股票代码是否正确',
          '2. 网络连接可能有问题',
          '3. 数据源API可能暂时不可用'
        ]
      });
    }
  }
}