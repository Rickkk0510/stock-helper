# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**股察小助手**是一个个人与家人专用的A股观察小工具，专注少量关注股票的价格、股息率查看与简单跟踪。项目定位为极简Web应用，核心原则是：极简、稳定、易维护、够用。

### 核心设计原则
1. **个人自用优先**：功能以满足个人和家庭使用为标准
2. **极简架构**：纯前端方案，无构建步骤
3. **低维护成本**：代码总量<1000行，文件数量<10个
4. **5年可维护**：代码要简单到5年后还能轻松维护

## 快速开始

### 开发环境设置
```bash
# 安装依赖（仅需Node.js环境）
# 无外部依赖，package.json仅用于开发脚本

# 启动本地开发服务器（选择一种方式）
npm run dev                    # 使用serve（Node.js静态服务器）
python -m http.server 3000    # 使用Python HTTP服务器
```

### 项目结构
```
project/
├── index.html              # 单页面应用入口
├── style.css              # 主样式文件（现代CSS，响应式设计）
├── app.js                 # 主JavaScript逻辑（~1200行，模块化函数）
├── config.js              # 环境配置管理（开发/生产环境自动检测）
├── api/proxy.js           # Serverless代理函数（解决东方财富API CORS限制）
├── data/                  # 本地数据文件
│   ├── mock-stocks.json   # 模拟股票数据（6只示例股票）
│   └── dividend-data.json # 股息数据（手动维护）
├── package.json           # 项目配置（仅dev脚本）
└── vercel.json           # Vercel部署配置
```

## 技术架构

### 数据流架构
```
前端界面 (index.html)
    ↓
用户输入 → cleanSearchQuery() → 智能解析查询（代码/名称）
    ↓
环境检测 → config.js → 判断开发/生产环境
    ↓
数据源选择:
├─ 开发环境 → 使用模拟数据 (mock-stocks.json)
└─ 生产环境 → 调用代理API → 东方财富API → 解析返回数据
    ↓
UI更新 → 显示股票信息、图表、股息数据
```

### 关键设计决策
1. **无构建步骤**：原生HTML/CSS/JS，直接编辑生效
2. **环境智能切换**：基于URL协议自动选择数据源
   - `file://` 或 `localhost` → 开发环境 → 模拟数据
   - `https://` 部署域名 → 生产环境 → 真实API
3. **CORS解决方案**：通过Vercel Serverless函数代理东方财富API
4. **数据持久化**：浏览器localStorage存储自选股列表

### 数据源配置
- **实时股价**：东方财富API（通过代理访问）
  - 实时行情：`https://push2.eastmoney.com/api/qt/stock/get`
  - K线数据：`https://push2.eastmoney.com/api/qt/stock/kline/get`
- **股息/基本面**：本地JSON文件手动维护
- **模拟数据**：6只示例股票用于开发测试

## 开发工作流

### 常用命令
```bash
# 本地开发
npm run dev                    # 启动serve静态服务器（端口3000）
python -m http.server 3000    # Python HTTP服务器（备用）

# 部署到Vercel
vercel                         # 测试部署
vercel --prod                  # 生产部署

# 环境测试
curl http://localhost:3000/data/mock-stocks.json  # 验证数据加载
```

### 代码修改指南
1. **保持极简**：新增功能前评估必要性
2. **向后兼容**：修改API解析时保持旧格式兼容
3. **错误处理**：所有异步操作必须有错误处理
4. **用户反馈**：使用toast通知系统（已实现）替换alert()

### 核心模块位置
- **查询逻辑**：`app.js`中的`findStockInMockData()`、`cleanSearchQuery()`
- **API调用**：`app.js`中的`fetchFromTencentAPI()`（实际调用东方财富API）
- **数据解析**：`app.js`中的`parseEastMoneyData()`
- **配置管理**：`config.js`中的`getCurrentConfig()`、`isLocalDevelopment()`
- **代理函数**：`api/proxy.js`（Vercel Serverless函数）

## 测试与验证

### 本地功能验证清单
1. **模拟数据加载**：控制台显示"模拟股票数据加载成功"
2. **股票代码查询**：输入"000001"显示"平安银行"
3. **中文名称查询**：输入"平安银行"显示正确信息
4. **模糊搜索**：输入"平安"匹配"平安银行"
5. **错误处理**：输入"999999"显示友好错误提示

### 生产环境验证
1. **部署到Vercel**：`vercel --prod`
2. **API连接测试**：验证3只测试股票API响应
   - 中远海控 (601919)
   - 中国核电 (601985)  
   - 长江电力 (600900)
3. **代理函数验证**：检查`/api/proxy`端点正常工作

### 测试脚本
项目包含辅助测试脚本（可临时创建）：
- `test-real-api.js` - 验证东方财富API连接性
- `test-search.js` - 验证搜索逻辑正确性

## 部署指南

### Vercel部署步骤
1. **安装Vercel CLI**：`npm i -g vercel`
2. **测试部署**：`vercel`（跟随提示）
3. **生产部署**：`vercel --prod`
4. **自动部署**：连接GitHub仓库启用自动部署

### 环境配置说明
- **开发环境**：自动检测（file://、localhost、127.0.0.1、局域网IP）
- **生产环境**：Vercel托管域名（https://）
- **智能切换**：开发环境使用模拟数据，生产环境使用真实API

### 部署验证清单
- [ ] 访问部署链接，页面正常加载
- [ ] 股票查询功能正常工作（测试000001）
- [ ] 代理函数正常响应（Network查看/api/proxy请求）
- [ ] 移动端响应式设计正常

## 故障排查

### 常见问题与解决方案
1. **CORS错误**：确保`api/proxy.js`正确部署，检查Vercel的`vercel.json`CORS配置
2. **API数据格式变化**：更新`parseEastMoneyData()`函数中的字段映射
3. **模拟数据无法加载**：检查`loadJSONFile()`函数的备选加载策略
4. **名称匹配不正确**：检查`findStockInMockData()`中的匹配优先级算法

### 调试信息检查
- 控制台查看环境状态：`环境检测: isLocalDev=...`
- 网络面板查看API请求响应
- localStorage检查自选股数据存储

## 维护计划

### 定期维护任务
- **每季度**：更新`data/dividend-data.json`股息数据
- **每半年**：测试东方财富API兼容性，更新解析逻辑
- **每年**：代码审查，清理不再需要的代码

### 扩展建议
如需添加新功能：
1. 评估是否真的需要（核心原则：极简）
2. 保持代码总量<1000行约束
3. 优先使用现有模式和函数
4. 确保向后兼容

---

**记住**：这是一个个人自用小工具，不做过度设计，不做超前架构，只做真正需要的功能。当前版本已解决核心查询问题，优先保证"能正确查股票"。