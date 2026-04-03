# 股察小助手 - Vercel部署指南

## 📦 部署包
- **文件**：`deploy.zip`
- **大小**：约40KB
- **包含**：所有项目文件，包括最新的修复和测试文件

## 🌐 Vercel网页部署步骤

### 步骤1：访问Vercel
1. 打开浏览器，访问 **[vercel.com/new](https://vercel.com/new)**
2. 如果没有账号，点击"Sign Up"注册（推荐使用GitHub账号登录）

### 步骤2：上传项目
1. 在Vercel新建项目页面，找到 **"Import Git Repository"** 区域
2. 将 **[deploy.zip](deploy.zip)** 文件拖拽到上传区域
   - 或者点击"Browse Files"按钮选择该ZIP文件
3. 点击 **"Upload"** 按钮

### 步骤3：配置项目
Vercel会自动检测配置，保持默认即可：
- **项目名称**：`stock-helper`（可修改）
- **框架预设**：静态网站（自动检测）
- **构建命令**：无（静态文件）
- **输出目录**：无（根目录）
- **环境变量**：无需配置

### 步骤4：开始部署
1. 点击 **"Deploy"** 按钮
2. 等待部署完成（约1-2分钟）
3. 部署成功后获得访问URL，例如：
   ```
   https://stock-helper.vercel.app
   ```
4. 点击URL即可访问你的股票查询工具

## 🔍 生产环境验证清单

### 1. 基础功能验证
- [ ] 访问部署URL（如 `https://stock-helper.vercel.app`）
- [ ] 页面正常加载，无红色错误提示
- [ ] 打开浏览器开发者工具（F12），查看控制台日志

### 2. 环境检测验证
控制台应显示以下信息：
```
环境检测 - 协议: https:, 主机名: stock-helper.vercel.app
环境检测结果: 生产环境
模拟股票数据加载成功
```

### 3. API代理验证
1. 在搜索框输入 **`000001`** 点击搜索
2. 在开发者工具的 **Network** 面板查看请求
3. 应该看到：
   - 请求：`GET /api/proxy?code=000001&type=realtime`
   - 状态码：`200`
   - 响应：真实的东方财富API数据（非模拟数据）

### 4. 测试股票清单
建议测试以下股票验证不同市场：

| 股票代码 | 名称 | 市场 | 验证要点 |
|---------|------|------|----------|
| `000001` | 平安银行 | 深圳 | 基本功能 |
| `600036` | 招商银行 | 上海 | 跨市场支持 |
| `601318` | 中国平安 | 上海 | API稳定性 |
| `000858` | 五粮液 | 深圳 | 名称查询 |

## 🚨 故障排查指南

### 常见问题及解决方案

#### 1. **API代理返回错误**
**现象**：搜索后显示"获取股票数据失败"
**检查**：
1. 查看Network面板 `/api/proxy` 响应
2. 检查控制台是否有红色错误

**可能原因**：东方财富API格式变化
**解决方案**：需要更新 `app.js` 中的 `parseEastMoneyData()` 函数

#### 2. **CORS错误**
**现象**：控制台显示跨域错误
**验证**：
1. 直接访问 `https://你的域名/api/proxy?code=000001`
2. 应该返回JSON数据

**解决方案**：
- 确认 `api/proxy.js` 文件的CORS头设置正确
- 检查 `vercel.json` 中的CORS配置

#### 3. **环境检测异常**
**现象**：显示模拟数据而非实时数据
**检查**：控制台环境检测日志

**解决方案**：
在浏览器控制台执行：
```javascript
Config.setEnvironment('production'); // 强制设置为生产环境
```

#### 4. **Vercel部署失败**
**可能原因**：
1. ZIP文件损坏
2. 项目配置错误

**解决方案**：
1. 重新下载 **[deploy.zip](deploy.zip)**
2. 检查Vercel部署日志
3. 确保项目结构完整

## 📱 移动端访问
- 项目支持响应式设计，移动端访问正常
- 建议在手机浏览器中测试布局

## 🔄 后续更新
如需更新项目：
1. 修改本地文件
2. 重新生成ZIP包：
   ```bash
   git archive --format zip --output deploy.zip HEAD
   ```
3. 在Vercel仪表板重新部署

## 📞 技术支持
部署后如有问题，请在浏览器控制台执行以下命令并反馈结果：

```javascript
// 环境状态检查
console.log('协议:', window.location.protocol);
console.log('环境:', Config.environment);
console.log('useMockData:', Config.getCurrentConfig().useMockData);

// 直接测试API
fetch('/api/proxy?code=000001')
  .then(r => r.json())
  .then(d => console.log('API响应:', d))
  .catch(e => console.error('API错误:', e));
```

## ✅ 部署成功标志
1. 访问URL正常显示页面
2. 搜索股票显示**实时数据**（非模拟数据）
3. 控制台无红色错误
4. API代理请求返回200状态码

---

**祝部署顺利！** 如有问题，请随时反馈。