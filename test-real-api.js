// 测试真实API连接性 - 验证用户提供的三个股票
// Node.js 18+ 有内置fetch，无需额外依赖

// 东方财富API配置
const API_BASE = 'https://push2.eastmoney.com/api/qt/stock/get';
const FIELDS = 'f43,f44,f45,f46,f47,f48,f58,f60,f168,f169,f170'; // 包含名称字段f58

// 用户提供的测试股票
const testStocks = [
    { code: '601919', name: '中远海控', market: '1' }, // 上海
    { code: '601985', name: '中国核电', market: '1' }, // 上海
    { code: '600900', name: '长江电力', market: '1' }, // 上海
    // 额外测试一些其他股票
    { code: '000001', name: '平安银行', market: '0' }, // 深圳
    { code: '000002', name: '万科A', market: '0' }, // 深圳
];

// 模拟parseEastMoneyData函数的部分逻辑
function parseFloatSafe(value, defaultValue) {
    if (value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

function parseEastMoneyData(apiData, originalCode) {
    try {
        // 检查API响应状态
        if (apiData.rc !== 0 || !apiData.data) {
            console.error('东方财富API返回错误:', apiData);
            return null;
        }

        const data = apiData.data;

        // 解析字段
        const price = parseFloatSafe(data.f43, 0) / 100;           // 当前价（分转元）
        const prevClose = parseFloatSafe(data.f60, 0) / 100;       // 昨收
        const change = parseFloatSafe(data.f169, 0);               // 涨跌幅

        // 成交量(手)转换为股数
        const volumeHand = parseFloatSafe(data.f47, 0);
        const volume = volumeHand * 100;

        // 成交额(万)转换为元
        const amountWan = parseFloatSafe(data.f48, 0);
        const amount = amountWan * 10000;

        // 估算市值 (简单估算，实际应该用总股本)
        const marketCap = amount * 1000;

        return {
            code: originalCode,
            name: data.f58 || data.name || '未知',
            price: price,
            change: change,
            volume: volume,
            amount: amount,
            market_cap: marketCap,
            // 其他字段需要股息数据补充，这里省略
        };
    } catch (error) {
        console.error('解析东方财富数据失败:', error);
        return null;
    }
}

async function testStockAPI(stock) {
    const { code, market, name: expectedName } = stock;
    const apiUrl = `${API_BASE}?secid=${market}.${code}&fields=${FIELDS}`;

    console.log(`\n=== 测试股票: ${code} (${expectedName}) ===`);
    console.log(`API URL: ${apiUrl}`);

    try {
        // 添加请求头模拟浏览器请求
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://quote.eastmoney.com/',
            'Accept': 'application/json, text/plain, */*'
        };

        const startTime = Date.now();
        const response = await fetch(apiUrl, { headers, timeout: 10000 });
        const endTime = Date.now();

        if (!response.ok) {
            console.error(`❌ HTTP错误: ${response.status} ${response.statusText}`);
            return false;
        }

        const responseText = await response.text();
        console.log(`✅ API响应时间: ${endTime - startTime}ms`);
        console.log(`响应长度: ${responseText.length}字符`);

        // 解析JSON
        let apiData;
        try {
            apiData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ JSON解析失败: ${parseError.message}`);
            console.log(`响应内容: ${responseText.substring(0, 200)}...`);
            return false;
        }

        console.log(`API返回状态: rc=${apiData.rc}, rt=${apiData.rt}`);

        if (apiData.rc !== 0) {
            console.error(`❌ API返回错误码: ${apiData.rc}`);
            return false;
        }

        if (!apiData.data) {
            console.error(`❌ API返回数据为空`);
            return false;
        }

        // 解析数据
        const stockData = parseEastMoneyData(apiData, code);

        if (!stockData) {
            console.error(`❌ 数据解析失败`);
            return false;
        }

        console.log(`✅ 股票名称: ${stockData.name}`);
        console.log(`   当前价格: ¥${stockData.price.toFixed(2)}`);
        console.log(`   涨跌幅: ${stockData.change}%`);
        console.log(`   成交量: ${Math.round(stockData.volume / 10000).toLocaleString()}手`);
        console.log(`   成交额: ${Math.round(stockData.amount / 10000).toLocaleString()}万元`);

        // 验证股票名称是否匹配预期
        if (stockData.name === expectedName) {
            console.log(`✅ 名称验证通过: "${stockData.name}"`);
        } else {
            console.log(`⚠️  名称不匹配: 预期"${expectedName}", 实际"${stockData.name}"`);
        }

        return true;

    } catch (error) {
        console.error(`❌ API调用失败: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('=== 开始测试真实API连接性 ===');
    console.log(`测试时间: ${new Date().toLocaleString()}`);
    console.log(`测试股票数量: ${testStocks.length}\n`);

    let passed = 0;
    let failed = 0;
    const results = [];

    for (const stock of testStocks) {
        const success = await testStockAPI(stock);
        results.push({ stock, success });

        if (success) {
            passed++;
        } else {
            failed++;
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n=== 测试结果汇总 ===');
    console.log(`通过: ${passed}, 失败: ${failed}, 总计: ${testStocks.length}`);

    if (failed > 0) {
        console.log('\n失败的股票:');
        results.forEach((result, index) => {
            if (!result.success) {
                console.log(`  ${result.stock.code} (${result.stock.name})`);
            }
        });
    }

    console.log('\n=== 结论 ===');
    if (failed === 0) {
        console.log('✅ 所有股票API测试通过，东方财富API连接正常！');
        console.log('生产环境应该能够正常获取股票实时数据。');
    } else {
        console.log('❌ 部分股票API测试失败，需要检查：');
        console.log('1. 网络连接是否正常');
        console.log('2. 东方财富API是否可用');
        console.log('3. 股票代码是否正确');
        console.log('4. API字段配置是否正确');
    }

    // 提供部署建议
    console.log('\n=== 部署建议 ===');
    console.log('1. 将项目部署到Vercel以测试生产环境');
    console.log('2. 确保api/proxy.js文件正确部署');
    console.log('3. 生产环境会自动使用真实API（非本地开发环境）');
    console.log('4. 本地开发环境默认使用模拟数据，可通过修改config.js测试真实API');

    return failed === 0;
}

// 运行测试
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});