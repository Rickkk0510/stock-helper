// 股察小助手 - 主JavaScript文件
// 原生JavaScript实现，无框架依赖

// 全局状态
const AppState = {
    currentStock: null,          // 当前查看的股票
    watchlist: [],               // 自选股列表
    dividendData: {},            // 股息数据缓存
    mockStocks: {},              // 模拟股票数据
    priceChart: null             // Chart.js实例
};

// 辅助函数：安全的浮点数解析
function parseFloatSafe(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }

    // 尝试解析
    const parsed = parseFloat(value);

    // 检查是否为有效数字
    if (isNaN(parsed)) {
        return defaultValue;
    }

    return parsed;
}

// 辅助函数：验证股票数据
function validateStockData(data) {
    if (!data) return false;

    const requiredFields = ['code', 'name', 'price'];
    for (const field of requiredFields) {
        if (!data[field]) {
            console.error(`股票数据缺少必要字段: ${field}`);
            return false;
        }
    }

    // 验证价格是有效数字
    if (typeof data.price !== 'number' || isNaN(data.price)) {
        console.error('股票价格无效:', data.price);
        return false;
    }

    return true;
}

// 辅助函数：安全的数字格式化
function safeToFixed(value, decimals = 2, fallback = '--') {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        return fallback;
    }

    try {
        return value.toFixed(decimals);
    } catch (error) {
        console.error('格式化数字失败:', error, value);
        return fallback;
    }
}

// 辅助函数：安全的文本显示
function safeText(value, fallback = '--') {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }
    return String(value);
}

// DOM元素引用
const DOM = {
    // 搜索相关
    stockInput: document.getElementById('stockInput'),
    searchBtn: document.getElementById('searchBtn'),

    // 当前股票显示
    currentStockTitle: document.getElementById('currentStockTitle'),
    currentPrice: document.getElementById('currentPrice'),
    priceChange: document.getElementById('priceChange'),
    dividendRate: document.getElementById('dividendRate'),
    dividendAmount: document.getElementById('dividendAmount'),
    marketCap: document.getElementById('marketCap'),
    industry: document.getElementById('industry'),
    peRatio: document.getElementById('peRatio'),
    pbRatio: document.getElementById('pbRatio'),

    // 图表相关
    priceChart: document.getElementById('priceChart'),
    chartControls: document.querySelectorAll('.btn-chart'),

    // 股息历史
    dividendHistory: document.getElementById('dividendHistory'),

    // 自选股相关
    watchlistCount: document.getElementById('watchlistCount'),
    watchlistItems: document.getElementById('watchlistItems'),
    watchlistEmpty: document.getElementById('watchlistEmpty'),
    addToWatchlistBtn: document.getElementById('addToWatchlistBtn'),
    removeFromWatchlistBtn: document.getElementById('removeFromWatchlistBtn'),
    exportWatchlistBtn: document.getElementById('exportWatchlistBtn'),
    importWatchlistBtn: document.getElementById('importWatchlistBtn'),

    // 其他按钮
    refreshBtn: document.getElementById('refreshBtn'),
    clearStorageBtn: document.getElementById('clearStorageBtn')
};

// 初始化函数
async function init() {
    console.log('股察小助手初始化...');

    // 加载模拟数据
    await loadMockData();

    // 加载股息数据
    await loadDividendData();

    // 加载自选股
    loadWatchlist();

    // 绑定事件
    bindEvents();

    // 初始化图表
    initChart();

    // 更新UI
    updateWatchlistDisplay();

    console.log('初始化完成');
}

// 加载JSON文件的辅助函数，支持多种加载方式
async function loadJSONFile(url) {
    // 在file://协议下，需要处理相对路径
    let fullUrl = url;
    if (window.location.protocol === 'file:') {
        const basePath = window.location.pathname;
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        fullUrl = baseDir + url;
    }

    try {
        // 尝试使用fetch（在HTTP服务器上工作）
        const response = await fetch(fullUrl);
        if (response.ok) return await response.json();
        throw new Error(`HTTP ${response.status}`);
    } catch (fetchError) {
        console.warn(`Fetch失败，尝试XMLHttpRequest: ${fetchError.message}`);
        // 备选方案：XMLHttpRequest同步加载
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', fullUrl, false); // 同步请求
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (parseError) {
                        reject(new Error(`解析JSON失败: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`XHR失败: ${xhr.status}`));
                }
            };
            xhr.onerror = function() {
                reject(new Error('网络错误'));
            };
            xhr.send();
        });
    }
}

// 备用模拟数据（如果文件加载失败）
function getFallbackMockData() {
    return {
        "000001": {
            "code": "000001",
            "name": "平安银行",
            "price": 15.32,
            "change": 2.1,
            "volume": 125430000,
            "amount": 1920000000,
            "market_cap": 300000000000,
            "industry": "银行",
            "pe": 8.5,
            "pb": 1.2,
            "dividend_rate": 3.2,
            "dividend_per_share": 0.45
        },
        "000002": {
            "code": "000002",
            "name": "万科A",
            "price": 18.45,
            "change": -1.2,
            "volume": 85670000,
            "amount": 1580000000,
            "market_cap": 215000000000,
            "industry": "房地产",
            "pe": 6.8,
            "pb": 0.9,
            "dividend_rate": 4.5,
            "dividend_per_share": 0.42
        },
        "600519": {
            "code": "600519",
            "name": "贵州茅台",
            "price": 1650.0,
            "change": 0.5,
            "volume": 3250000,
            "amount": 5360000000,
            "market_cap": 2070000000000,
            "industry": "白酒",
            "pe": 32.5,
            "pb": 12.8,
            "dividend_rate": 1.2,
            "dividend_per_share": 19.8
        }
    };
}

// 加载模拟股票数据
async function loadMockData() {
    try {
        AppState.mockStocks = await loadJSONFile('data/mock-stocks.json');
        console.log('模拟股票数据加载成功');
    } catch (error) {
        console.error('加载模拟数据失败，使用内置数据:', error);
        // 使用硬编码的模拟数据作为最后手段
        AppState.mockStocks = getFallbackMockData();
    }
}

// 加载股息数据
async function loadDividendData() {
    try {
        AppState.dividendData = await loadJSONFile('data/dividend-data.json');
        console.log('股息数据加载成功');
    } catch (error) {
        console.error('加载股息数据失败:', error);
        AppState.dividendData = {};
    }
}

// 股票查询功能
async function searchStock(query) {
    if (!query || query.trim() === '') {
        showError('请输入股票代码或名称');
        return;
    }

    // 检查模拟数据是否已加载
    if (!AppState.mockStocks || Object.keys(AppState.mockStocks).length === 0) {
        showError('数据正在加载中，请稍后重试');
        console.warn('搜索时模拟数据尚未加载');
        return;
    }

    // 显示加载状态
    showLoading(true);

    try {
        // 清理查询字符串（智能处理代码和名称）
        const cleanQuery = cleanSearchQuery(query);

        // 先尝试从模拟数据中查找
        let stock = findStockInMockData(cleanQuery);

        if (stock) {
            // 补充股息数据
            const dividendInfo = AppState.dividendData[stock.code] || {};
            stock.dividendHistory = dividendInfo.dividendHistory || [];
            stock.fundamental = dividendInfo.fundamental || {};

            // 更新当前股票
            AppState.currentStock = stock;

            // 更新UI
            updateStockDisplay(stock);

            // 更新图表
            updateChart(stock);

            // 更新股息历史
            updateDividendHistory(stock.dividendHistory);

            // 更新按钮状态
            updateWatchlistButtonState();

            console.log('股票查询成功:', stock.name);
        } else {
            // 如果没有找到，尝试调用腾讯财经API
            await fetchFromTencentAPI(cleanQuery);
        }
    } catch (error) {
        console.error('查询股票失败:', error);
        showError('查询失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 清理搜索查询
function cleanSearchQuery(query) {
    const trimmed = query.trim();

    // 检查是否是纯数字代码（可能带有市场前缀）
    const codePattern = /^(sh|sz)?(\d{6})$/i;
    const match = trimmed.match(codePattern);

    if (match) {
        // 是股票代码，返回大写格式（仅数字部分）
        return match[2]; // 返回6位数字代码
    }

    // 是股票名称，返回原样（保持中文字符不变）
    return trimmed;
}

// 简单模糊匹配函数
function fuzzyMatch(text, search) {
    if (!text || !search) return false;

    // 完全匹配（忽略大小写）
    if (text.toLowerCase() === search.toLowerCase()) return true;

    // 包含匹配（忽略大小写）
    if (text.toLowerCase().includes(search.toLowerCase())) return true;

    // 中文包含匹配
    if (text.includes(search)) return true;

    return false;
}

// 从模拟数据中查找股票
function findStockInMockData(query) {
    if (!query || !AppState.mockStocks) return null;

    const queryLower = query.toLowerCase();

    // 1. 首先尝试代码精确匹配
    if (AppState.mockStocks[query]) {
        return { ...AppState.mockStocks[query] };
    }

    // 2. 尝试处理带前缀的代码（如 sh000001, sz000001）
    const normalizedCode = normalizeStockCode(query);
    if (normalizedCode && AppState.mockStocks[normalizedCode]) {
        return { ...AppState.mockStocks[normalizedCode] };
    }

    // 3. 如果查询长度>=2，尝试名称匹配
    if (query.length >= 2) {
        let exactNameMatch = null;
        let bestContainsMatch = null;
        let bestContainsScore = -1;
        let fuzzyMatchResult = null;

        for (const code in AppState.mockStocks) {
            const stock = AppState.mockStocks[code];
            const stockNameLower = stock.name.toLowerCase();

            // 3.1 名称精确匹配（忽略大小写）
            if (stockNameLower === queryLower) {
                exactNameMatch = stock;
                break; // 找到精确匹配，直接返回
            }

            // 3.2 名称包含匹配 - 选择最佳匹配
            if (stockNameLower.includes(queryLower)) {
                // 计算匹配质量分数：
                // 1. 匹配位置越靠前越好（指数越小分数越高）
                // 2. 股票名称越短越好（更精确）
                const matchIndex = stockNameLower.indexOf(queryLower);
                // 分数计算：位置权重 + 长度权重
                // 位置分：100 - 位置索引（位置越靠前分数越高）
                // 长度分：50 - 名称长度/10（名称越短分数越高）
                const positionScore = 100 - matchIndex;
                const lengthScore = 50 - (stock.name.length / 10);
                const totalScore = positionScore + lengthScore;

                if (bestContainsMatch === null || totalScore > bestContainsScore) {
                    bestContainsMatch = stock;
                    bestContainsScore = totalScore;
                }
            }

            // 3.3 模糊匹配
            if (fuzzyMatch(stock.name, query)) {
                if (!fuzzyMatchResult) {
                    fuzzyMatchResult = stock;
                }
            }
        }

        // 返回优先级：精确匹配 > 包含匹配 > 模糊匹配
        if (exactNameMatch) return { ...exactNameMatch };
        if (bestContainsMatch) return { ...bestContainsMatch };
        if (fuzzyMatchResult) return { ...fuzzyMatchResult };
    }

    return null;
}

// 规范化股票代码
function normalizeStockCode(code) {
    // 移除市场前缀和空格
    const cleanCode = code.replace(/^[a-z]{2}/i, '').trim();
    return cleanCode;
}

// 调用腾讯财经API
async function fetchFromTencentAPI(code) {
    // 注意：函数名保持兼容，但实际调用东方财富API（通过代理）
    console.log('获取股票数据:', code);

    // 获取配置和环境状态
    const config = window.Config?.getCurrentConfig?.();
    const isLocalDev = config?.isLocalDevelopment || window.location.protocol === 'file:';
    const useMockData = config?.useMockData || isLocalDev;

    console.log(`环境检测: isLocalDev=${isLocalDev}, useMockData=${useMockData}`);

    // 1. 本地开发环境或配置要求使用模拟数据
    if (useMockData) {
        console.log('使用模拟数据（本地开发环境或配置要求）');
        const mockStock = findStockInMockData(code);
        if (mockStock) {
            console.log('使用模拟数据:', mockStock.name);
            AppState.currentStock = mockStock;
            updateStockDisplay(mockStock);
            updateChart(mockStock);
            updateDividendHistory(mockStock.dividendHistory || []);
            updateWatchlistButtonState();
            showSuccess(`使用模拟数据: ${mockStock.name}`);
            return;
        } else {
            showError(`未找到股票: ${code}，请检查代码是否正确`);
            return;
        }
    }

    // 2. 生产环境：调用代理API获取真实数据
    try {
        // 智能处理输入：可能是股票代码或名称
        let stockCode = code;

        // 检查是否是6位数字股票代码
        const isStockCode = /^\d{6}$/.test(code);

        if (!isStockCode) {
            // 如果不是6位数字，尝试从模拟数据中查找对应的股票代码
            console.log(`输入"${code}"不是6位数字代码，尝试从模拟数据查找`);
            const stockFromMock = findStockInMockData(code);

            if (stockFromMock) {
                // 找到对应的股票，使用其代码
                stockCode = stockFromMock.code;
                console.log(`从模拟数据找到对应股票：${stockFromMock.name} (${stockCode})`);
            } else {
                // 模拟数据中也找不到
                showError(`未找到股票"${code}"，请确保输入正确的6位股票代码或完整的股票名称`);
                return;
            }
        }

        // 使用代理API端点
        const proxyUrl = `/api/proxy?code=${stockCode}&type=realtime`;
        console.log('调用代理API:', proxyUrl);

        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(`代理API响应错误: ${response.status}`);
        }

        const apiData = await response.json();
        console.log('API返回数据:', apiData);

        // 解析东方财富API数据
        const stock = parseEastMoneyData(apiData, code);

        if (stock) {
            // 补充股息数据
            const dividendInfo = AppState.dividendData[code] || {};
            stock.dividendHistory = dividendInfo.dividendHistory || [];
            stock.fundamental = dividendInfo.fundamental || {};

            AppState.currentStock = stock;
            updateStockDisplay(stock);
            updateChart(stock);
            updateDividendHistory(stock.dividendHistory || []);
            updateWatchlistButtonState();

            showSuccess(`成功获取 ${stock.name} 实时数据`);
        } else {
            // 如果解析失败，尝试使用模拟数据作为备用
            console.warn('API数据解析失败，尝试使用模拟数据');
            const fallbackStock = findStockInMockData(code);
            if (fallbackStock) {
                AppState.currentStock = fallbackStock;
                updateStockDisplay(fallbackStock);
                updateChart(fallbackStock);
                updateDividendHistory(fallbackStock.dividendHistory || []);
                updateWatchlistButtonState();
                showSuccess(`使用模拟数据: ${fallbackStock.name}`);
            } else {
                showError(`无法获取股票数据: ${code}`);
            }
        }

    } catch (error) {
        console.error('API调用失败:', error);

        // 如果API调用失败，尝试使用模拟数据
        console.warn('API调用失败，尝试使用模拟数据作为备用');
        const fallbackStock = findStockInMockData(code) || findStockInMockData('000001');
        if (fallbackStock) {
            AppState.currentStock = fallbackStock;
            updateStockDisplay(fallbackStock);
            updateChart(fallbackStock);
            updateDividendHistory(fallbackStock.dividendHistory || []);
            updateWatchlistButtonState();
            showError(`实时数据获取失败，使用模拟数据: ${fallbackStock.name}`);
        } else {
            showError(`获取股票数据失败: ${error.message}`);
        }
    }
}

// 解析腾讯财经CSV数据
function parseTencentCSV(csvText, originalCode) {
    // 腾讯财经API返回格式示例:
    // v_sh600000="1~平安银行~15.32~15.12~15.30~15.35~15.10~15.31~15.32~...";

    try {
        // 提取数据部分
        const match = csvText.match(/="([^"]+)"/);
        if (!match) {
            console.error('CSV格式解析失败:', csvText.substring(0, 100));
            return null;
        }

        const dataStr = match[1];
        const fields = dataStr.split('~');

        // 字段说明（根据腾讯财经文档）:
        // 0: 未知, 1: 名称, 2: 最新价, 3: 昨收, 4: 今开, 5: 最高, 6: 最低,
        // 7: 买一价, 8: 卖一价, 9: 成交量(手), 10: 成交额(万), ... 等等

        if (fields.length < 30) {
            console.error('数据字段不足:', fields.length);
            return null;
        }

        const name = fields[1];
        const price = parseFloatSafe(fields[2], 0);
        const prevClose = parseFloatSafe(fields[3], 0);
        const change = prevClose ? ((price - prevClose) / prevClose * 100) : 0;

        // 成交量（手）转换为股数
        const volumeHand = parseFloatSafe(fields[9], 0);
        const volume = volumeHand * 100; // 转换为股数

        // 成交额（万）转换为元
        const amountWan = parseFloatSafe(fields[10], 0);
        const amount = amountWan * 10000;

        // 简单计算市值（使用模拟数据中的比例）
        // 实际应该使用总股本数据，这里用成交额估算
        const marketCap = amount * 1000; // 粗略估算

        // 从股息数据中获取股息率
        const dividendInfo = AppState.dividendData[originalCode];
        const dividendRate = dividendInfo?.dividendHistory?.[0]?.rate || 0;
        const dividendPerShare = dividendInfo?.dividendHistory?.[0]?.dividend || 0;

        // 从股息数据中获取基本面
        const pe = dividendInfo?.fundamental?.pe || 0;
        const pb = dividendInfo?.fundamental?.pb || 0;
        const industry = dividendInfo?.fundamental?.industry || '未知';

        return {
            code: originalCode,
            name: name,
            price: price,
            change: parseFloatSafe(change.toFixed(2), 0),
            volume: volume,
            amount: amount,
            market_cap: marketCap,
            industry: industry,
            pe: pe,
            pb: pb,
            dividend_rate: dividendRate,
            dividend_per_share: dividendPerShare
        };
    } catch (error) {
        console.error('解析腾讯财经数据失败:', error);
        return null;
    }
}

// 解析东方财富API数据
function parseEastMoneyData(apiData, originalCode) {
    // 东方财富API返回格式示例:
    // {
    //   "rc": 0,
    //   "rt": 6,
    //   "svr": 182997223,
    //   "lt": 1,
    //   "full": 1,
    //   "data": {
    //     "code": "000001",
    //     "market": 0,
    //     "name": "平安银行",
    //     "decimal": 2,
    //     "f43": 15.32,  // 当前价
    //     "f44": 15.45,  // 最高
    //     "f45": 15.10,  // 最低
    //     "f46": 15.20,  // 今开
    //     "f47": 1254300, // 成交量(手)
    //     "f48": 192000,  // 成交额(万)
    //     "f60": 15.12,   // 昨收
    //     "f169": 1.32,   // 涨跌幅
    //     "f170": 0.20    // 涨跌额
    //   }
    // }

    try {
        // 检查API响应状态
        if (apiData.rc !== 0 || !apiData.data) {
            console.error('东方财富API返回错误:', apiData);
            return null;
        }

        const data = apiData.data;

        // 从股息数据中获取股息率和基本面
        const dividendInfo = AppState.dividendData[originalCode] || {};
        const dividendRate = dividendInfo?.dividendHistory?.[0]?.rate || 0;
        const dividendPerShare = dividendInfo?.dividendHistory?.[0]?.dividend || 0;
        const pe = dividendInfo?.fundamental?.pe || 0;
        const pb = dividendInfo?.fundamental?.pb || 0;
        const industry = dividendInfo?.fundamental?.industry || '未知';

        // 解析字段
        const price = parseFloatSafe(data.f43, 0);           // 当前价
        const change = parseFloatSafe(data.f169, 0);         // 涨跌幅

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
            price: price / 100,  // 东方财富API返回的是分，转换为元
            change: change,
            volume: volume,
            amount: amount,
            market_cap: marketCap,
            industry: industry,
            pe: pe,
            pb: pb,
            dividend_rate: dividendRate,
            dividend_per_share: dividendPerShare
        };

    } catch (error) {
        console.error('解析东方财富数据失败:', error);
        return null;
    }
}

// 更新股票信息显示
function updateStockDisplay(stock) {
    if (!stock) return;

    // 使用验证函数确保数据有效
    if (!validateStockData(stock)) {
        console.error('股票数据验证失败，不更新显示');
        return;
    }

    // 更新标题
    DOM.currentStockTitle.innerHTML = `当前查看股票：<span class="stock-name">${safeText(stock.name)}(${safeText(stock.code)})</span>`;

    // 更新价格信息
    DOM.currentPrice.textContent = safeToFixed(stock.price, 2, '--');

    const changeValue = typeof stock.change === 'number' ? stock.change : 0;
    const changeSign = changeValue >= 0 ? '+' : '';
    DOM.priceChange.textContent = `${changeSign}${safeToFixed(changeValue, 1, '0.0')}%`;
    DOM.priceChange.className = `info-change ${changeValue >= 0 ? 'positive' : 'negative'}`;

    // 更新股息信息
    const dividendRate = typeof stock.dividend_rate === 'number' ? stock.dividend_rate : 0;
    DOM.dividendRate.textContent = `${safeToFixed(dividendRate, 1, '--')}%`;

    const dividendPerShare = typeof stock.dividend_per_share === 'number' ? stock.dividend_per_share : 0;
    DOM.dividendAmount.textContent = dividendPerShare ? `每股 ${safeToFixed(dividendPerShare, 2)}元` : '--';

    // 更新市值和行业
    DOM.marketCap.textContent = formatMarketCap(stock.market_cap);
    DOM.industry.textContent = safeText(stock.industry, '--');

    // 更新PE/PB
    const peValue = typeof stock.pe === 'number' ? stock.pe : 0;
    DOM.peRatio.textContent = peValue ? `PE: ${safeToFixed(peValue, 1)}` : '--';

    const pbValue = typeof stock.pb === 'number' ? stock.pb : 0;
    DOM.pbRatio.textContent = pbValue ? `PB: ${safeToFixed(pbValue, 2)}` : '--';
}

// 格式化市值显示
function formatMarketCap(cap) {
    // 检查输入有效性
    if (cap === null || cap === undefined || typeof cap !== 'number' || isNaN(cap)) {
        return '--';
    }

    // 确保是正数
    const absCap = Math.abs(cap);

    try {
        if (absCap >= 1000000000000) {
            return `${(absCap / 1000000000000).toFixed(2)}万亿`;
        } else if (absCap >= 100000000) {
            return `${(absCap / 100000000).toFixed(2)}亿`;
        } else {
            return `${(absCap / 10000).toFixed(0)}万`;
        }
    } catch (error) {
        console.error('格式化市值失败:', error, cap);
        return '--';
    }
}

// 初始化图表
function initChart() {
    const ctx = DOM.priceChart.getContext('2d');

    // 初始数据
    const initialData = {
        labels: [],
        datasets: [{
            label: '股价',
            data: [],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };

    AppState.priceChart = new Chart(ctx, {
        type: 'line',
        data: initialData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// 更新图表数据
function updateChart(stock) {
    if (!AppState.priceChart || !stock) return;

    // 生成模拟价格数据（30天）
    const days = 30;
    const basePrice = stock.price;
    const volatility = stock.price * 0.05; // 5%波动

    const labels = [];
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.getDate() + '日');

        // 模拟价格波动
        const randomChange = (Math.random() - 0.5) * 2 * volatility;
        const price = basePrice + randomChange;
        data.push(price);
    }

    // 更新图表
    AppState.priceChart.data.labels = labels;
    AppState.priceChart.data.datasets[0].data = data;
    AppState.priceChart.data.datasets[0].label = `${stock.name} 股价`;
    AppState.priceChart.update();
}

// 更新股息历史显示
function updateDividendHistory(history) {
    if (!history || history.length === 0) {
        DOM.dividendHistory.innerHTML = `
            <div class="dividend-placeholder">
                <p>该股票暂无股息历史数据</p>
            </div>
        `;
        return;
    }

    // 只显示最近3年
    const recentHistory = history.slice(0, 3);

    let html = '';
    recentHistory.forEach(item => {
        html += `
            <div class="dividend-item">
                <div class="dividend-year">${item.year}年</div>
                <div class="dividend-amount">${item.dividend.toFixed(2)}元</div>
                <div class="dividend-rate">${item.rate.toFixed(1)}%</div>
            </div>
        `;
    });

    DOM.dividendHistory.innerHTML = html;
}

// 自选股管理
function loadWatchlist() {
    try {
        const saved = localStorage.getItem('gucha_watchlist');
        if (saved) {
            AppState.watchlist = JSON.parse(saved);
            console.log('自选股加载成功:', AppState.watchlist.length);
        }
    } catch (error) {
        console.error('加载自选股失败:', error);
        AppState.watchlist = [];
    }
}

function saveWatchlist() {
    try {
        localStorage.setItem('gucha_watchlist', JSON.stringify(AppState.watchlist));
        console.log('自选股保存成功');
    } catch (error) {
        console.error('保存自选股失败:', error);
    }
}

function addToWatchlist(stock) {
    if (!stock || !stock.code) return false;

    // 检查是否已存在
    const exists = AppState.watchlist.some(item => item.code === stock.code);
    if (exists) {
        showError('该股票已在自选股中');
        return false;
    }

    // 添加到自选股
    const watchlistItem = {
        code: stock.code,
        name: stock.name,
        price: stock.price,
        change: stock.change,
        dividend_rate: stock.dividend_rate,
        addedAt: new Date().toISOString()
    };

    AppState.watchlist.push(watchlistItem);
    saveWatchlist();
    updateWatchlistDisplay();
    updateWatchlistButtonState();

    showSuccess(`已添加 ${stock.name} 到自选股`);
    return true;
}

function removeFromWatchlist(stockCode) {
    const index = AppState.watchlist.findIndex(item => item.code === stockCode);
    if (index !== -1) {
        const removed = AppState.watchlist.splice(index, 1)[0];
        saveWatchlist();
        updateWatchlistDisplay();
        updateWatchlistButtonState();

        showSuccess(`已移除 ${removed.name} 从自选股`);
        return true;
    }
    return false;
}

function clearWatchlist() {
    if (AppState.watchlist.length === 0) return;

    if (confirm(`确定要清除所有自选股吗？共 ${AppState.watchlist.length} 只股票。`)) {
        AppState.watchlist = [];
        saveWatchlist();
        updateWatchlistDisplay();
        updateWatchlistButtonState();
        showSuccess('已清除所有自选股');
    }
}

function updateWatchlistDisplay() {
    const count = AppState.watchlist.length;
    DOM.watchlistCount.textContent = count;

    // 显示/隐藏空状态
    if (count === 0) {
        DOM.watchlistEmpty.style.display = 'flex';
        DOM.watchlistItems.innerHTML = '';
        return;
    }

    DOM.watchlistEmpty.style.display = 'none';

    // 生成自选股列表
    let html = '';
    AppState.watchlist.forEach(item => {
        const isSelected = AppState.currentStock && AppState.currentStock.code === item.code;
        const changeClass = item.change >= 0 ? 'positive' : 'negative';
        const changeSign = item.change >= 0 ? '+' : '';

        html += `
            <div class="watchlist-item ${isSelected ? 'selected' : ''}" data-code="${item.code}">
                <div class="watchlist-info">
                    <div class="watchlist-code">${item.code}</div>
                    <div class="watchlist-name">${item.name}</div>
                    <div class="watchlist-price">${item.price.toFixed(2)}</div>
                    <div class="watchlist-change ${changeClass}">${changeSign}${item.change.toFixed(1)}%</div>
                    <div class="watchlist-dividend">股息率: ${item.dividend_rate ? item.dividend_rate.toFixed(1) + '%' : '--'}</div>
                </div>
                <div class="watchlist-actions">
                    <button class="btn btn-sm btn-danger remove-watchlist-item" data-code="${item.code}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });

    DOM.watchlistItems.innerHTML = html;

    // 绑定自选股项目点击事件
    document.querySelectorAll('.watchlist-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-watchlist-item')) {
                const code = item.dataset.code;
                const stock = findStockInMockData(code);
                if (stock) {
                    searchStock(code);
                }
            }
        });
    });

    // 绑定删除按钮事件
    document.querySelectorAll('.remove-watchlist-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            removeFromWatchlist(code);
        });
    });
}

function updateWatchlistButtonState() {
    if (!AppState.currentStock) {
        DOM.addToWatchlistBtn.disabled = true;
        DOM.removeFromWatchlistBtn.disabled = true;
        return;
    }

    const currentCode = AppState.currentStock.code;
    const isInWatchlist = AppState.watchlist.some(item => item.code === currentCode);

    DOM.addToWatchlistBtn.disabled = isInWatchlist;
    DOM.removeFromWatchlistBtn.disabled = !isInWatchlist;
}

// 导出/导入功能
function exportWatchlist() {
    if (AppState.watchlist.length === 0) {
        showError('自选股为空，无需导出');
        return;
    }

    const dataStr = JSON.stringify(AppState.watchlist, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gucha_watchlist_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('自选股导出成功');
}

function importWatchlist() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);

                // 验证数据格式
                if (!Array.isArray(imported)) {
                    throw new Error('数据格式错误：应为数组');
                }

                // 合并自选股（去重）
                const existingCodes = new Set(AppState.watchlist.map(item => item.code));
                let addedCount = 0;

                imported.forEach(item => {
                    if (item.code && item.name && !existingCodes.has(item.code)) {
                        AppState.watchlist.push({
                            code: item.code,
                            name: item.name,
                            price: item.price || 0,
                            change: item.change || 0,
                            dividend_rate: item.dividend_rate || 0,
                            addedAt: item.addedAt || new Date().toISOString()
                        });
                        existingCodes.add(item.code);
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    saveWatchlist();
                    updateWatchlistDisplay();
                    updateWatchlistButtonState();
                    showSuccess(`成功导入 ${addedCount} 只股票到自选股`);
                } else {
                    showError('没有新的股票被导入');
                }
            } catch (error) {
                showError('导入失败: ' + error.message);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// 事件绑定
function bindEvents() {
    // 搜索按钮点击
    DOM.searchBtn.addEventListener('click', () => {
        searchStock(DOM.stockInput.value);
    });

    // 输入框回车搜索
    DOM.stockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchStock(DOM.stockInput.value);
        }
    });

    // 加入自选按钮
    DOM.addToWatchlistBtn.addEventListener('click', () => {
        if (AppState.currentStock) {
            addToWatchlist(AppState.currentStock);
        }
    });

    // 移除自选按钮
    DOM.removeFromWatchlistBtn.addEventListener('click', () => {
        if (AppState.currentStock) {
            removeFromWatchlist(AppState.currentStock.code);
        }
    });

    // 导出按钮
    DOM.exportWatchlistBtn.addEventListener('click', exportWatchlist);

    // 导入按钮
    DOM.importWatchlistBtn.addEventListener('click', importWatchlist);

    // 刷新按钮
    DOM.refreshBtn.addEventListener('click', () => {
        if (AppState.currentStock) {
            searchStock(AppState.currentStock.code);
        } else {
            showError('请先查询一只股票');
        }
    });

    // 清除存储按钮
    DOM.clearStorageBtn.addEventListener('click', clearWatchlist);

    // 图表周期切换
    DOM.chartControls.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除其他按钮的active类
            DOM.chartControls.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的active类
            btn.classList.add('active');

            // 更新图表（这里简单实现，实际应该根据周期更新数据）
            if (AppState.currentStock) {
                updateChart(AppState.currentStock);
            }
        });
    });
}

// UI辅助函数
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// 显示通知（toast）
function showNotification(message, type = 'info', duration = 3000) {
    // 移除现有的通知
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    // 创建新通知
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;

    // 根据类型选择图标
    let iconClass = 'fa-info-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'success') iconClass = 'fa-check-circle';

    toast.innerHTML = `
        <div class="notification-content">
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

function showError(message) {
    console.error('错误:', message);
    showNotification(message, 'error', 5000);
}

function showSuccess(message) {
    console.log('成功:', message);
    showNotification(message, 'success', 3000);
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);