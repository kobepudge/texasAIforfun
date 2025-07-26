const express = require('express');
const cors = require('cors');
const redis = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 使用内存存储 (暂时不使用Redis)
let redisClient = null;
console.log('📝 使用内存存储GTO数据');

// 导入GTO数据
const { getPreflopDecision, initializeGTOData } = require('./gto-data');

// 初始化GTO数据
console.log('🚀 初始化GTO翻前数据...');
initializeGTOData();
console.log('✅ GTO数据初始化完成');

// API路由
app.get('/api/preflop-decision', async (req, res) => {
  try {
    const { hand, position, facing_action, players_behind, stack_bb } = req.query;

    // 参数验证
    if (!hand || !position) {
      return res.status(400).json({
        error: '缺少必要参数: hand, position'
      });
    }

    // 获取GTO决策
    const decision = getPreflopDecision({
      hand,
      position,
      facing_action: facing_action || 'none',
      players_behind: parseInt(players_behind) || 0,
      stack_bb: parseFloat(stack_bb) || 100
    });

    res.json({
      success: true,
      decision,
      query: { hand, position, facing_action, players_behind, stack_bb }
    });

  } catch (error) {
    console.error('❌ API错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    redis: redisClient ? 'connected' : 'disconnected'
  });
});

// 获取所有支持的手牌
app.get('/api/hands', (req, res) => {
  const hands = [
    // 对子
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    // 同花
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
    'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
    'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
    '98s', '97s', '96s', '95s', '94s', '93s', '92s',
    '87s', '86s', '85s', '84s', '83s', '82s',
    '76s', '75s', '74s', '73s', '72s',
    '65s', '64s', '63s', '62s',
    '54s', '53s', '52s',
    '43s', '42s',
    '32s',
    // 非同花
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
    'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
    'QJo', 'QTo', 'Q9o', 'Q8o', 'Q7o', 'Q6o', 'Q5o', 'Q4o', 'Q3o', 'Q2o',
    'JTo', 'J9o', 'J8o', 'J7o', 'J6o', 'J5o', 'J4o', 'J3o', 'J2o',
    'T9o', 'T8o', 'T7o', 'T6o', 'T5o', 'T4o', 'T3o', 'T2o',
    '98o', '97o', '96o', '95o', '94o', '93o', '92o',
    '87o', '86o', '85o', '84o', '83o', '82o',
    '76o', '75o', '74o', '73o', '72o',
    '65o', '64o', '63o', '62o',
    '54o', '53o', '52o',
    '43o', '42o',
    '32o'
  ];
  
  res.json({ hands, total: hands.length });
});

app.listen(PORT, () => {
  console.log(`🚀 GTO服务器启动成功: http://localhost:${PORT}`);
  console.log(`📊 API端点: http://localhost:${PORT}/api/preflop-decision`);
});
