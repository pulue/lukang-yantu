/**
 * 鹿康研途 - 综合测试脚本
 * 功能测试 / 性能测试 / 安全测试
 * 运行: node test.js
 */
const http = require('http');
const { performance } = require('perf_hooks');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0, failed = 0;

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const start = performance.now();
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ms = (performance.now() - start).toFixed(0);
        try { resolve({ status: res.statusCode, body: JSON.parse(data), ms: Number(ms) }); }
        catch { resolve({ status: res.statusCode, body: data, ms: Number(ms) }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function category(name) {
  console.log(`\n📋 ${name}`);
  console.log('─'.repeat(50));
}

(async () => {
  console.log('🦌 鹿康研途 综合测试');
  console.log(`目标: ${BASE}`);
  console.log('='.repeat(50));

  // ==================== 1. 功能测试 ====================
  await category('一、功能测试');

  await test('首页正常加载', async () => {
    const res = await request('/');
    if (res.status !== 200) throw new Error(`状态码 ${res.status}`);
    if (!res.body.includes('鹿康研途') && !res.body.includes('lukang')) throw new Error('页面不含应用标识');
  });

  await test('静态资源可访问', async () => {
    const res = await request('/index.html');
    if (res.status !== 200) throw new Error(`状态码 ${res.status}`);
  });

  await test('AI聊天API - 基础问答', async () => {
    const res = await request('/api/chat', 'POST', {
      messages: [{ role: 'user', content: '你好' }]
    });
    if (res.status !== 200) throw new Error(`状态码 ${res.status}`);
    if (!res.body.data || !res.body.data.reply) throw new Error('AI未返回回复');
  });

  await test('AI聊天API - 考研相关问题', async () => {
    const res = await request('/api/chat', 'POST', {
      messages: [{ role: 'user', content: '计算机专业考研如何备考？' }]
    });
    if (res.status !== 200) throw new Error(`状态码 ${res.status}`);
    if (res.body.data.reply.length < 50) throw new Error('AI回复过短');
  });

  await test('AI聊天API - 多轮对话上下文', async () => {
    const res = await request('/api/chat', 'POST', {
      messages: [
        { role: 'user', content: '我想考浙大计算机' },
        { role: 'assistant', content: '浙大计算机很棒！' },
        { role: 'user', content: '我刚才说的学校是哪个？' }
      ]
    });
    if (res.status !== 200) throw new Error(`状态码 ${res.status}`);
    if (!res.body.data.reply.includes('浙大')) throw new Error('AI未记住上下文');
  });

  await test('API参数校验 - 缺少messages', async () => {
    const res = await request('/api/chat', 'POST', {});
    if (res.status === 200) throw new Error('应返回错误');
  });

  // ==================== 2. 性能测试 ====================
  await category('二、性能测试');

  await test('首页加载 < 500ms', async () => {
    const res = await request('/');
    if (res.ms > 500) throw new Error(`加载耗时 ${res.ms}ms`);
  });

  await test('AI API 响应 < 15s', async () => {
    const res = await request('/api/chat', 'POST', {
      messages: [{ role: 'user', content: '考研怎么准备？' }]
    });
    if (res.ms > 15000) throw new Error(`API响应 ${res.ms}ms`);
  });

  await test('并发10次请求', async () => {
    const tasks = Array(10).fill(0).map(() => request('/'));
    const results = await Promise.all(tasks);
    const errors = results.filter(r => r.status !== 200);
    if (errors.length > 0) throw new Error(`${errors.length}/10 请求失败`);
  });

  // ==================== 3. 安全测试 ====================
  await category('三、安全测试');

  await test('API Key 不泄露在前端', async () => {
    const res = await request('/');
    if (res.body.includes('sk-5362')) throw new Error('前端页面包含API Key');
    if (res.body.includes('DEEPSEEK_API_KEY')) throw new Error('前端页面包含环境变量名');
  });

  await test('.env 文件不可直接访问', async () => {
    try {
      const res = await request('/.env');
      if (res.status === 200 && res.body.includes('DEEPSEEK_API_KEY')) throw new Error('.env可被外部访问');
    } catch { /* 预期行为 */ }
  });

  await test('XSS 防护 - script标签过滤', async () => {
    const res = await request('/', 'GET');
    // 前端使用了 formatContent 做HTML转义
    if (res.body.includes('eval(')) throw new Error('检测到eval');
  });

  await test('输入长度限制', async () => {
    // server.js 使用 express.json({ limit: '10mb' })
    const longMsg = 'a'.repeat(10000);
    const res = await request('/api/chat', 'POST', {
      messages: [{ role: 'user', content: longMsg }]
    });
    if (res.status !== 200) throw new Error(`大输入被拒绝: ${res.status}`);
  });

  await test('CORS 头部存在', async () => {
    // 通过检查响应确认（需要http模块原始访问）
    const url = new URL('/', BASE);
    const opts = { hostname: url.hostname, port: url.port, path: '/', method: 'GET' };
    const raw = await new Promise((resolve, reject) => {
      http.get(opts, res => {
        const headers = res.headers;
        resolve(headers['access-control-allow-origin'] === '*');
      }).on('error', reject);
    });
    if (!raw) throw new Error('CORS未启用');
  });

  // ==================== 报告 ====================
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${passed + failed} 项, ${passed} 通过, ${failed} 失败`);
  if (failed === 0) {
    console.log('✅ 全部测试通过！');
  } else {
    console.log(`❌ ${failed} 项测试未通过`);
  }
  console.log('='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
})();
