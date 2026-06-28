const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// JWT 和加密
let jwt, bcrypt;
try { jwt = require('jsonwebtoken'); } catch(e) { jwt = null; }
try { bcrypt = require('bcryptjs'); } catch(e) { bcrypt = null; }

const JWT_SECRET = process.env.JWT_SECRET || 'lukang_yantu_secret_2024';

// 用户数据文件
const USERS_FILE = path.join(__dirname, 'users.json');

// 读取用户数据
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch(e) {
    return {};
  }
}

// 保存用户数据
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// JWT 认证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: -1, msg: '请先登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e) {
    return res.status(401).json({ code: -1, msg: '登录已过期，请重新登录' });
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// ==================== 用户注册 ====================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ code: -1, msg: '用户名和密码不能为空' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ code: -1, msg: '密码长度至少6位' });
    }
    
    const users = loadUsers();
    
    if (users[username]) {
      return res.status(400).json({ code: -1, msg: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = bcrypt ? bcrypt.hashSync(password, 10) : password;
    
    users[username] = {
      username,
      password: hashedPassword,
      email: email || '',
      createdAt: new Date().toISOString()
    };
    
    saveUsers(users);
    
    res.json({ code: 0, msg: '注册成功' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ code: -1, msg: '服务器错误' });
  }
});

// ==================== 用户登录 ====================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ code: -1, msg: '用户名和密码不能为空' });
    }
    
    const users = loadUsers();
    const user = users[username];
    
    if (!user) {
      return res.status(400).json({ code: -1, msg: '用户不存在' });
    }
    
    // 验证密码
    let valid = false;
    if (bcrypt) {
      valid = bcrypt.compareSync(password, user.password);
    } else {
      valid = (password === user.password);
    }
    
    if (!valid) {
      return res.status(400).json({ code: -1, msg: '密码错误' });
    }
    
    // 生成 JWT token
    const token = jwt ? jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' }) : 'dummy_token';
    
    res.json({
      code: 0,
      data: {
        token,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ code: -1, msg: '服务器错误' });
  }
});

// ==================== 获取当前用户信息 ====================
app.get('/api/user/info', authMiddleware, (req, res) => {
  const users = loadUsers();
  const user = users[req.user.username];
  if (!user) {
    return res.status(404).json({ code: -1, msg: '用户不存在' });
  }
  res.json({
    code: 0,
    data: {
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    }
  });
});

// ==================== AI 聊天代理（需要登录）====================
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ code: -1, msg: '缺少 messages 参数' });
    }

    // 构建系统提示词 - 考研规划师人设
    const systemPrompt = {
      role: 'system',
      content: `你是"鹿康研途"的AI考研规划师，你的任务是帮助用户解决考研相关问题。

## 你的身份
- 名称：鹿康研途 AI 考研规划师
- 性格：专业、耐心、温暖、鼓励
- 风格：结构化回答，善用标题、列表、emoji 增强可读性

## 你的能力范围
1. 择校分析：根据用户背景推荐院校，分析院校难度等级
2. 备考规划：制定全年/月度/每日复习计划
3. 资料推荐：推荐各科经典教材和辅导书
4. 政策解读：解释国家线、院校线、调剂规则等
5. 复试攻略：面试技巧、导师联系、笔试准备
6. 心态调节：缓解考研焦虑，提供心理支持
7. 学习方法：各科高效学习技巧

## 回答要求
- 每次回答控制在 300-800 字，结构清晰
- 优先使用分点/分步骤的形式
- 适当使用 emoji 增强可读性
- 语气温暖鼓励，像学长学姐在聊天
- 如果用户问的问题超出考研范围，礼貌引导回考研话题
- 如果信息不足，主动追问用户背景信息以给出更精准建议
- 绝对不要使用任何markdown格式符号。严禁使用 # ## ### **** __ ~~ \` 等所有markdown标记。用纯文本和emoji来排版

## 禁止行为
- 不要编造具体院校的分数线、报录比等精确数据（除非你知道）
- 不要给出绝对化的保证（如"你一定能考上"）
- 不要建议用户做违法违规的事情
- 不要在回复中使用 markdown 标题（###）或加粗语法
    };

    const apiMessages = [systemPrompt, ...messages];

    // 调用AI接口（非流式，等全文生成完一次性返回）
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1200,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', response.status, errText);
      return res.status(response.status).json({ code: -1, msg: 'AI 服务暂时不可用，请稍后重试' });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('Chat proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ code: -1, msg: '服务器内部错误' });
    }
  }
});

// ==================== SPA 回退 ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🦌 鹿康研途服务器已启动: http://localhost:${PORT}`);
  console.log(`🔑 DeepSeek AI 已连接`);
  console.log(`🔐 登录功能已启用`);
});
