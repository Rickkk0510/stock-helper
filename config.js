// 股察小助手 - 配置文件
// 管理不同环境的API端点和其他配置

const Config = {
    // 当前环境：development, production
    environment: 'development',

    // API配置
    api: {
        // 东方财富API端点
        eastMoney: {
            // 实时行情API (示例)
            realtime: 'https://push2.eastmoney.com/api/qt/stock/get',
            // K线数据API (示例)
            kline: 'https://push2.eastmoney.com/api/qt/stock/kline/get'
        },

        // 腾讯财经API（旧版，备用）
        tencent: {
            realtime: 'https://qt.gtimg.cn/q='
        }
    },

    // 开发配置
    development: {
        useMockData: true,  // 开发环境使用模拟数据
        apiTimeout: 5000,   // API超时时间(ms)
        debug: true
    },

    // 生产配置
    production: {
        useMockData: false, // 生产环境使用真实API
        apiTimeout: 10000,  // 生产环境更长超时
        debug: false
    },

    // 设置环境
    setEnvironment(env) {
        if (['development', 'production'].includes(env)) {
            this.environment = env;
            console.log(`环境已设置为: ${env}`);
        } else {
            console.error(`无效的环境: ${env}`);
        }
    },

    // 检测是否为本地开发环境
    isLocalDevelopment() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;

        // 调试信息
        console.log(`环境检测 - 协议: ${protocol}, 主机名: ${hostname}`);

        // file://协议或localhost或127.0.0.1都视为开发环境
        const isLocal = protocol === 'file:' ||
               hostname === 'localhost' ||
               hostname === '127.0.0.1' ||
               hostname.includes('192.168.') || // 局域网IP
               hostname.includes('10.') ||      // 私有网络
               hostname.includes('172.');       // 私有网络

        console.log(`环境检测结果: ${isLocal ? '本地开发' : '生产环境'}`);
        return isLocal;
    },

    // 获取当前配置
    getCurrentConfig() {
        const env = this.environment;
        const isLocal = this.isLocalDevelopment();

        return {
            ...this.api,
            ...this[env],
            environment: env,
            isLocalDevelopment: isLocal,
            // 智能判断是否使用模拟数据：本地开发或配置明确要求
            useMockData: isLocal || this[env].useMockData
        };
    }
};

// 根据URL自动检测环境
(function autoDetectEnvironment() {
    // 如果运行在本地文件系统，设置为开发环境
    if (window.location.protocol === 'file:') {
        Config.setEnvironment('development');
    } else {
        // 否则根据域名判断
        const hostname = window.location.hostname;
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            Config.setEnvironment('development');
        } else {
            Config.setEnvironment('production');
        }
    }
})();

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;  // Node.js环境
} else {
    window.Config = Config;   // 浏览器环境
}