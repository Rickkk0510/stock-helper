# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**股察小助手**是一个个人与家人专用的A股观察小工具，专注少量关注股票的价格、股息率查看与简单跟踪。项目定位为极简Web应用，核心原则是：极简、稳定、易维护、够用。

## 核心设计原则

1. **个人自用优先**：功能以满足个人和家庭使用为标准，不追求商业软件的功能完备性
2. **极简架构**：优先纯前端方案，避免不必要的后端服务
3. **低维护成本**：代码总量<1000行，文件数量<10个，配置项<5个
4. **为5年后的自己开发**：代码要简单到1年后还能看懂，架构简单到不需要文档也能维护

## 技术架构决策（当前实现）

### 技术栈选择（实际采用）
- **前端框架**：原生JavaScript（纯HTML/CSS/JS）
  - 无构建步骤，直接编辑静态文件
  - 使用模块化函数组织代码，避免框架复杂性
- **样式**：纯CSS，包含响应式设计
- **图表**：Chart.js CDN（仅用于简单价格走势图）
- **数据存储**：浏览器localStorage，用于存储自选股列表
- **部署平台**：Vercel（静态托管 + Serverless代理函数）

### 架构方案（当前实现）
采用**方案B（极简后端）**：
1. **前端静态文件**：HTML/CSS/JS直接部署到Vercel静态托管
2. **Serverless代理函数**：`api/proxy.js`解决东方财富API的CORS限制
3. **数据流**：前端 → Vercel代理 → 东方财富API → 前端展示

### 数据源（当前实现）
- **实时股价**：东方财富API（通过Vercel代理访问）
  - 实时行情API：`https://push2.eastmoney.com/api/qt/stock/get`
  - K线数据API：`https://push2.eastmoney.com/api/qt/stock/kline/get`
- **股息和基本面数据**：手动维护的本地JSON文件（`data/dividend-data.json`）
- **备用数据**：模拟股票数据（`data/mock-stocks.json`），用于开发和测试

### 关键API接口
- **代理端点**：`/api/proxy?code=000001&type=realtime`
  - `code`: 6位股票代码（000001）
  - `type`: 数据类型（`realtime`实时行情，`kline`K线数据）
- **数据格式**：东方财富API返回JSON，通过代理转发给前端

## 开发环境设置

### 常用命令
```bash
# 启动本地开发服务器（使用serve静态文件服务器）
npm run dev

# 访问本地应用
open http://localhost:3000  # 或浏览器访问
```

### 项目结构（实际文件）
```
project/
├── index.html              # 单页面应用入口
├── style.css              # 主样式文件
├── app.js                 # 主JavaScript逻辑（约600行）
├── config.js              # 环境配置管理（开发/生产环境检测）
├── api/                   # Serverless函数目录
│   └── proxy.js           # 东方财富API代理函数（解决CORS）
├── data/                  # 本地数据文件
│   ├── mock-stocks.json   # 模拟股票数据（备用）
│   └── dividend-data.json # 股息数据（手动维护）
├── package.json           # 项目配置（包含dev脚本）
└── vercel.json           # Vercel部署配置（路由、CORS头等）
```

### 本地开发流程
1. 确保Node.js已安装（v14+）
2. 运行 `npm run dev` 启动本地服务器
3. 编辑HTML/CSS/JS文件，浏览器自动刷新（依赖serve的默认行为）
4. 开发环境自动使用模拟数据，避免频繁调用外部API

## 核心功能实现指南

### 1. 股票查询功能（已修复）
- 搜索框支持股票代码（000001）或名称（平安银行）
- **智能查询处理**：`cleanSearchQuery()`函数区分代码和名称
- **三级匹配策略**：代码精确匹配 > 名称精确匹配 > 模糊匹配
- **安全数据解析**：`parseFloatSafe()`、`validateStockData()`等安全函数
- **东方财富API集成**：通过Vercel代理获取实时数据

### 2. 自选股管理
- 使用`localStorage`存储自选股列表
- 数据格式：`{code: "000001", name: "平安银行", addedAt: "2026-04-02"}`
- 支持添加、删除、列表展示、点击查看详情
- 容量限制：最多50只股票

### 3. 股票详情展示
- 实时数据区：价格、涨跌幅、市值、成交量
- 股息信息区：股息率、最近3年股息历史（从本地JSON获取）
- 基本面区：PE、PB、行业等（从本地JSON获取）
- 图表区：30天价格走势图（使用东方财富K线数据）

### 4. 错误处理与用户反馈
- 网络错误：显示友好提示，自动重试（最多3次）
- API错误：代理函数返回详细错误信息
- 数据验证：所有外部数据都经过`validateStockData()`验证
- 用户提示：加载状态、成功/失败反馈

## 代码架构与关键模块

### 1. 查询模块 (`app.js`)
- **`cleanSearchQuery(query)`**: 智能清理搜索词，区分股票代码和名称
- **`fuzzyMatch(query, target)`**: 模糊匹配算法，支持中文字符
- **`findStockInMockData(query)`**: 在模拟数据中查找股票（三级匹配）
- **`fetchFromTencentAPI(code)`**: 实际调用东方财富API（保持原名兼容性）
- **`parseEastMoneyData(data)`**: 解析东方财富API返回格式

### 2. 安全处理模块 (`app.js`)
- **`parseFloatSafe(value, defaultValue)`**: 安全解析浮点数
- **`validateStockData(data)`**: 验证股票数据结构完整性
- **`safeToFixed(number, decimals)`**: 安全格式化小数
- **`safeText(text)`**: 安全处理文本显示，防止XSS

### 3. 配置管理 (`config.js`)
- **环境检测**：自动判断开发/生产环境（通过URL协议）
- **配置管理**：统一管理API端点、超时设置等
- **方法**：`getCurrentConfig()`, `setEnvironment(env)`

### 4. 代理函数 (`api/proxy.js`)
- CORS处理：设置`Access-Control-Allow-Origin: *`
- 请求转发：转发到东方财富API，添加浏览器请求头
- 错误处理：API失败时返回友好JSON错误
- 代码验证：验证6位数字股票代码格式

## 部署指南

### Vercel部署步骤
1. **准备工作**：确保所有文件已提交到Git仓库
2. **安装Vercel CLI**（可选）：`npm i -g vercel`
3. **部署命令**：
   ```bash
   # 首次部署
   vercel
   
   # 生产环境部署
   vercel --prod
   ```
4. **自动部署**：连接GitHub仓库，每次push自动部署
5. **访问地址**：部署后获得 `https://stock-helper.vercel.app` 类似链接

### 环境配置
- **开发环境**：本地运行（`file://`协议），使用模拟数据
- **生产环境**：Vercel托管（`https://`协议），使用真实API
- **自动切换**：`config.js`根据运行环境自动选择配置

### 部署验证清单
- [ ] 访问部署链接，页面正常加载
- [ ] 股票查询功能正常工作（测试000001）
- [ ] 自选股管理功能正常（添加/删除）
- [ ] 代理函数正常响应（检查浏览器Network请求）
- [ ] 移动端访问基本正常

## 故障排查

### 常见问题
1. **CORS错误**：浏览器控制台显示跨域错误
   - 解决方案：确保代理函数正确设置CORS头（`api/proxy.js`已处理）
   - 检查Vercel部署的`vercel.json`中的CORS配置

2. **API返回数据格式变化**：东方财富API可能调整返回格式
   - 解决方案：更新`parseEastMoneyData()`函数中的解析逻辑
   - 添加更灵活的数据提取，减少对固定字段位置的依赖

3. **代理函数超时**：Vercel Serverless函数默认10秒超时
   - 解决方案：优化API调用，添加超时处理
   - 考虑使用更快的API端点或添加缓存

4. **股息数据过时**：本地JSON文件未及时更新
   - 解决方案：添加数据最后更新时间显示，提醒手动更新
   - 考虑定期维护计划（每季度更新一次）

5. **本地存储限制**：localStorage超出浏览器限制
   - 解决方案：提示用户清理或减少自选股数量
   - 添加数据导出功能，避免数据丢失

## 开发注意事项

### 代码修改指南
1. **保持极简**：每次新增功能前问"是否真的需要？"
2. **向后兼容**：修改API解析时保持旧格式兼容性
3. **错误处理**：所有异步操作必须包含错误处理
4. **用户反馈**：所有操作都应提供明确的状态反馈
5. **性能考虑**：避免频繁API调用，合理使用缓存

### 测试重点
- **核心查询**：股票代码查询、名称查询、模糊搜索
- **数据解析**：东方财富API数据解析正确性
- **错误恢复**：网络错误、API错误、数据格式错误的处理
- **持久化**：localStorage操作的正确性和可靠性

### 维护计划
- **每季度**：更新`data/dividend-data.json`股息数据
- **每半年**：测试东方财富API兼容性，必要时更新解析逻辑
- **每年**：审查代码，清理不再需要的代码，保持简单

## 项目文档
- **详细产品需求**：`股察小助手-PRD-优化版.md`
- **原始产品需求**：`A股监测应用PRD.md`（包含更复杂但已简化的设计）
- **部署配置**：`vercel.json`（Vercel路由和CORS配置）
- **代理函数**：`api/proxy.js`（东方财富API代理实现）

---

**记住**：这是一个个人自用小工具，不做过度设计，不做超前架构，只做真正需要的功能。代码要简单到5年后的自己还能轻松维护。当前版本已解决核心查询问题，优先保证"能正确查股票"。