const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// ==================== AI 聊天代理 ====================
app.post('/api/chat', async (req, res) => {
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

## 禁止行为
- 不要编造具体院校的分数线、报录比等精确数据（除非你知道）
- 不要给出绝对化的保证（如"你一定能考上"）
- 不要建议用户做违法违规的事情`
    };

    const apiMessages = [systemPrompt, ...messages];

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
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', response.status, errText);
      return res.status(response.status).json({ code: -1, msg: 'AI 服务暂时不可用，请稍后重试' });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({ code: 0, data: { reply } });
  } catch (err) {
    console.error('Chat proxy error:', err);
    res.status(500).json({ code: -1, msg: '服务器内部错误' });
  }
});

// ==================== SPA 回退 ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🦌 鹿康研途服务器已启动: http://localhost:${PORT}`);
  console.log(`🔑 DeepSeek AI 已连接`);
});
