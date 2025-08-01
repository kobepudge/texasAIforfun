# 德州扑克AI - Vercel + Railway 部署指南

## 🚀 快速部署 (30分钟完成)

### 前置准备
- [x] GitHub账号
- [x] Vercel账号 (vercel.com)
- [x] Railway账号 (railway.app)
- [x] AI API密钥 (tu-zi.com)

---

## 第1步: 推送代码到GitHub (5分钟)

### 1.1 创建GitHub仓库
1. 访问 [GitHub](https://github.com)
2. 点击 "New repository"
3. 仓库名: `poker-ai-demo`
4. 设为Public
5. 点击 "Create repository"

### 1.2 推送代码
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial deployment setup"
git branch -M main
git remote add origin https://github.com/你的用户名/poker-ai-demo.git
git push -u origin main
```

---

## 第2步: 部署后端到Railway (10分钟)

### 2.1 创建Railway项目
1. 访问 [Railway](https://railway.app)
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的 `poker-ai-demo` 仓库

### 2.2 配置后端服务
1. Railway检测到项目后，点击 "Deploy Now"
2. 在设置中配置：
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2.3 设置环境变量
在Railway项目的Variables标签页添加：
```env
NODE_ENV=production
PORT=3001
```

### 2.4 获取Railway域名
- 部署完成后，在Settings > Domains获取域名
- 格式类似：`poker-ai-demo-production.railway.app`
- **记录此域名，下一步需要使用**

### 2.5 测试后端
访问：`https://你的railway域名.railway.app/api/health`
应该返回：`{"status":"ok","timestamp":"..."}`

---

## 第3步: 部署前端到Vercel (10分钟)

### 3.1 创建Vercel项目
1. 访问 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 从GitHub导入 `poker-ai-demo` 仓库

### 3.2 配置构建设置
- **Framework Preset**: React
- **Root Directory**: `./` (项目根目录)
- **Build Command**: `npm run deploy:build`
- **Output Directory**: `build`
- **Install Command**: `npm install --legacy-peer-deps`

### 3.3 设置环境变量
在Vercel项目的Settings > Environment Variables添加：
```env
REACT_APP_API_BASE_URL=https://你的railway域名.railway.app
REACT_APP_AI_API_KEY=你的AI密钥
REACT_APP_AI_BASE_URL=https://api.tu-zi.com/v1
```

### 3.4 更新vercel.json
编辑根目录的 `vercel.json` 文件，将Railway域名更新为实际域名：
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://你的railway域名.railway.app/api/$1"
    }
  ]
}
```

---

## 第4步: 配置跨域 (5分钟)

### 4.1 更新后端环境变量
在Railway项目添加Vercel域名：
```env
FRONTEND_URL=https://你的vercel域名.vercel.app
```

### 4.2 重新部署
```bash
git add .
git commit -m "Update deployment configs with actual domains"
git push origin main
```

等待两个平台自动重新部署（约2-3分钟）。

---

## 第5步: 测试和验证 ✅

### 5.1 访问应用
- 前端: `https://你的vercel域名.vercel.app`
- 后端: `https://你的railway域名.railway.app`

### 5.2 功能测试
1. 打开前端网站
2. 点击"开始游戏"
3. 测试AI决策功能
4. 检查浏览器控制台无错误

---

## 🎯 完成状态检查

- [ ] GitHub仓库创建成功
- [ ] Railway后端部署成功 (`/api/health` 返回正常)
- [ ] Vercel前端部署成功 (网站可访问)
- [ ] API调用正常 (AI决策功能工作)
- [ ] 移动端适配正常

---

## 📊 监控和管理

### Vercel监控
- 访问统计: Vercel仪表板
- 构建日志: Deployments标签页
- 实时日志: Functions标签页

### Railway监控
- 应用日志: Deployments > Logs
- 资源使用: Metrics标签页
- 健康检查: `GET /api/health`

### 自动部署
推送到GitHub main分支会自动触发两个平台的重新部署。

---

## 🔧 故障排除

### 前端构建失败
```bash
# 本地测试构建
npm install --legacy-peer-deps
npm run build
```

### API调用失败
1. 检查Railway后端是否运行正常
2. 验证vercel.json中的代理配置
3. 检查CORS设置

### 样式问题
确保Tailwind CSS构建正常，检查build目录是否包含CSS文件。

---

## 💰 成本估算

**免费额度**:
- Vercel: 100GB流量/月
- Railway: 500小时运行时间/月
- **总计**: 免费使用3-6个月

**付费计划** (可选):
- Vercel Pro: $20/月
- Railway Pro: $5/月
- **总计**: $25/月

---

## 🚀 下一步

部署成功后，您可以：
1. 绑定自定义域名
2. 配置SSL证书
3. 设置监控告警
4. 优化性能和SEO
5. 添加更多AI功能

---

需要帮助？检查日志或联系技术支持！