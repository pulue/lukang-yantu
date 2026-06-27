# 鹿康研途 - AI考研规划师

一个面向考研学生的智能规划Web应用，集成DeepSeek AI实现智能问答。

## 技术栈
- **前端**: 原生 HTML/CSS/JS（响应式设计）
- **后端**: Node.js + Express
- **AI**: DeepSeek API（通过后端代理，API Key不暴露）
- **部署**: Render / Vercel / 任何支持Node.js的云平台

## 功能模块
- 🏠 首页看板（考研倒计时、每日一句、工具箱）
- 🤖 AI考研规划师（真实DeepSeek API驱动）
- 🏫 院校查询（100所高校详细信息）
- 📊 院校对比（100所院校任意对比）
- 📚 知识库（32篇考研知识文章）
- ⏰ 历史记录

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 创建 .env 文件（复制 .env.example 并填入你的 DeepSeek API Key）
cp .env.example .env

# 3. 启动
node server.js

# 4. 浏览器打开
http://localhost:3000
```

获取DeepSeek API Key: https://platform.deepseek.com

## 运行测试

```bash
# 先启动服务器
node server.js &

# 运行测试
node test.js
```

## 云部署

### Render（推荐，免费）

1. 推送代码到GitHub
2. 在 [render.com](https://render.com) 注册并连接GitHub
3. 点击 New > Web Service，选择本仓库
4. 在 Environment 中添加：`DEEPSEEK_API_KEY` = 你的API Key
5. 点击 Deploy，等待完成

### Vercel

1. 安装Vercel CLI: `npm i -g vercel`
2. 运行: `vercel`
3. 在Vercel Dashboard添加环境变量 `DEEPSEEK_API_KEY`

## 项目结构

```
├── dist/                # 前端静态文件
│   └── index.html       # 单页面应用
├── server.js            # Express后端（静态服务 + AI代理）
├── test.js              # 综合测试脚本
├── render.yaml          # Render部署配置
├── package.json         # 项目依赖
├── .env.example         # 环境变量模板
├── .gitignore           # Git忽略规则（保护.env）
└── 启动鹿康研途.bat      # Windows一键启动
```

## 安全性

- API Key 存储在 `.env` 中，已通过 `.gitignore` 排除
- 前端通过后端 `/api/chat` 代理调用AI，Key不会出现在浏览器或源代码中
- 代码上传GitHub后不会泄露任何密钥信息

## 测试结果

```
📊 测试结果: 14 项, 14 通过, 0 失败
✅ 全部测试通过！
```

- 功能测试: 6/6 通过
- 性能测试: 3/3 通过
- 安全测试: 5/5 通过
