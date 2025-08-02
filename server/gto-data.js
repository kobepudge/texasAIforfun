// GTO翻前策略数据模块

// 内存存储GTO决策表
let gtoDecisionTable = new Map();

// 位置定义
const POSITIONS = {
  'UTG': 0,
  'UTG+1': 1, 
  'MP': 2,
  'MP+1': 3,
  'CO': 4,
  'BTN': 5,
  'SB': 6,
  'BB': 7
};

// 🎯 扩展行动类型 - 支持复杂多轮行动和位置关系
const ACTIONS = {
  'none': 0,        // 无人行动
  'limp': 1,        // 跛入
  'raise_2bb': 2,   // 加注2BB
  'raise_3bb': 3,   // 加注3BB  
  'raise_4bb': 4,   // 加注4BB
  '3bet': 5,        // 3bet (通常9-12BB)
  '4bet': 6,        // 4bet (通常22-25BB)
  '5bet': 7,        // 5bet (通常50BB+)
  'squeeze': 8,     // Squeeze (面对开池+跟注)
  'limp_raise': 9,  // 跛入后加注
  'multi_limp': 10, // 多人跛入
  'btn_straddle': 11, // 庄家位straddle
  'utg_straddle': 12, // UTG位straddle
  
  // 🚀 新增高级对战场景
  'cold_4bet': 13,     // Cold 4bet (未参与3bet直接4bet)
  'iso_raise': 14,     // 隔离加注 (针对跛入者)
  'btn_vs_sb': 15,     // 按钮位对小盲位
  'co_vs_btn': 16,     // CO位对按钮位
  'utg_vs_late': 17,   // 早期位对后期位
  'multi_way_2': 18,   // 2人多方底池
  'multi_way_3': 19,   // 3+人多方底池
  'limped_pot': 20,    // 跛入底池
  'reopened_action': 21, // 重开行动
  'cap_action': 22,    // 封顶行动
  'sb_complete': 23,   // 小盲位补齐
  'bb_option': 24,     // 大盲位选择权
  'straddle_action': 25 // 面对straddle行动
};

// 筹码深度分层
const STACK_TIERS = {
  'short': { min: 10, max: 40, name: '浅筹码' },      // 10-40BB
  'medium': { min: 40, max: 150, name: '中等筹码' },   // 40-150BB
  'deep': { min: 150, max: 999, name: '深筹码' }      // 150BB+
};

// 获取筹码深度档位
function getStackTier(stackBB) {
  if (stackBB <= 40) return 'short';
  if (stackBB <= 150) return 'medium';
  return 'deep';
}

// 决策类型
const DECISIONS = {
  FOLD: { action: 'fold', amount: 0, frequency: 1.0 },
  CALL: { action: 'call', amount: 0, frequency: 1.0 },
  CHECK: { action: 'check', amount: 0, frequency: 1.0 },
  LIMP: { action: 'limp', amount: 1, frequency: 1.0 },

  // 开池加注大小
  RAISE_2BB: { action: 'raise', amount: 2, frequency: 1.0 },
  RAISE_25BB: { action: 'raise', amount: 2.5, frequency: 1.0 },  // 标准开池
  RAISE_3BB: { action: 'raise', amount: 3, frequency: 1.0 },
  RAISE_35BB: { action: 'raise', amount: 3.5, frequency: 1.0 },
  RAISE_4BB: { action: 'raise', amount: 4, frequency: 1.0 },

  // 🎯 扩展决策类型 - 支持复杂多轮行动
  
  // 3bet策略
  THREBET_9BB: { action: 'raise', amount: 9, frequency: 1.0 },   // 标准3bet
  THREBET_10BB: { action: 'raise', amount: 10, frequency: 1.0 },
  THREBET_12BB: { action: 'raise', amount: 12, frequency: 1.0 },
  THREBET_BALANCED: { action: 'raise', amount: 10, frequency: 0.7 }, // 平衡3bet
  
  // 4bet策略  
  FOURBET_22BB: { action: 'raise', amount: 22, frequency: 1.0 }, // 标准4bet
  FOURBET_25BB: { action: 'raise', amount: 25, frequency: 1.0 },
  FOURBET_30BB: { action: 'raise', amount: 30, frequency: 1.0 }, // 深筹码4bet
  FOURBET_POLARIZED: { action: 'raise', amount: 22, frequency: 0.8 }, // 极化4bet
  
  // 5bet策略
  FIVEBET_55BB: { action: 'raise', amount: 55, frequency: 1.0 },
  FIVEBET_70BB: { action: 'raise', amount: 70, frequency: 1.0 },
  FIVEBET_ALL_IN: { action: 'all_in', amount: 0, frequency: 1.0 },
  FIVEBET_BLUFF: { action: 'all_in', amount: 0, frequency: 0.3 }, // 诈唬5bet
  
  // Squeeze策略
  SQUEEZE_12BB: { action: 'raise', amount: 12, frequency: 1.0 },
  SQUEEZE_14BB: { action: 'raise', amount: 14, frequency: 1.0 },
  SQUEEZE_16BB: { action: 'raise', amount: 16, frequency: 1.0 },
  SQUEEZE_18BB: { action: 'raise', amount: 18, frequency: 1.0 }, // 多人挤压
  
  // 🚀 新增高级策略
  // Cold 4bet策略
  COLD_4BET_20BB: { action: 'raise', amount: 20, frequency: 1.0 },
  COLD_4BET_25BB: { action: 'raise', amount: 25, frequency: 1.0 },
  COLD_4BET_BLUFF: { action: 'raise', amount: 22, frequency: 0.25 },
  
  // 隔离加注策略
  ISO_RAISE_4BB: { action: 'raise', amount: 4, frequency: 1.0 },
  ISO_RAISE_5BB: { action: 'raise', amount: 5, frequency: 1.0 },
  ISO_RAISE_6BB: { action: 'raise', amount: 6, frequency: 1.0 }, // 多人跛入
  
  // 位置对战策略
  BTN_VS_SB_3BB: { action: 'raise', amount: 3, frequency: 1.0 },
  BTN_VS_SB_CALL: { action: 'call', amount: 0, frequency: 1.0 },
  SB_VS_BTN_3BET: { action: 'raise', amount: 9, frequency: 1.0 },
  
  // 多方底池策略
  MULTIWAY_CALL: { action: 'call', amount: 0, frequency: 1.0 },
  MULTIWAY_FOLD: { action: 'fold', amount: 0, frequency: 1.0 },
  MULTIWAY_SQUEEZE: { action: 'raise', amount: 14, frequency: 1.0 },
  
  // 混合策略
  CALL_3BET_DEFEND: { action: 'call', amount: 0, frequency: 1.0 },
  CALL_4BET_DEFEND: { action: 'call', amount: 0, frequency: 1.0 },
  FOLD_TO_4BET: { action: 'fold', amount: 0, frequency: 1.0 },
  FOLD_TO_5BET: { action: 'fold', amount: 0, frequency: 1.0 },
  
  // 频率混合策略
  MIXED_CALL_FOLD: { action: 'call', amount: 0, frequency: 0.6 }, // 60%跟注40%弃牌
  MIXED_RAISE_CALL: { action: 'raise', amount: 10, frequency: 0.3 }, // 30%加注70%跟注

  // 全推和最小加注
  ALL_IN: { action: 'all_in', amount: 0, frequency: 1.0 },
  MIN_RAISE: { action: 'raise', amount: 2.2, frequency: 1.0 }
};

// 🎯 完整169手牌强度分类 - 基于现代GTO理论
const HAND_TIERS = {
  // 🔥 PREMIUM (2.6% - 4个组合) - 绝对强牌，几乎总是开池
  PREMIUM: [
    'AA', 'KK', 'QQ', 'AKs'
  ],

  // 💪 STRONG (5.4% - 9个组合) - 强牌，大部分位置开池
  STRONG: [
    'JJ', 'AKo', 'AQs', 'AJs', 'KQs', 'TT', 'AQo', 'AJo', 'KQo'
  ],

  // 🎯 PREMIUM_MEDIUM (7% - 12个组合) - 高中等牌，后期位置很强
  PREMIUM_MEDIUM: [
    'ATs', 'KJs', 'QJs', 'JTs', '99', 'ATo', 'KJo', 'QJo', 'JTo', 'A9s', 'KTs', 'QTs'
  ],

  // 📊 MEDIUM (15% - 25个组合) - 中等牌力，位置敏感
  MEDIUM: [
    '88', '77', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 
    'K9s', 'Q9s', 'J9s', 'T9s', '98s', '87s', '76s', '65s', '54s',
    'A9o', 'K9o', 'Q9o', 'J9o', 'T9o', '98o', '87o'
  ],

  // 🔧 WEAK (25% - 42个组合) - 弱牌，需要好位置或特殊情况
  WEAK: [
    '66', '55', '44', '33', '22',
    'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
    'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
    'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
    'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
    'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
    '97s', '96s', '95s', '94s', '93s', '92s',
    '86s', '85s', '84s', '83s', '82s',
    '75s', '74s', '73s', '72s'
  ],

  // 🎲 SPECULATIVE (7% - 12个组合) - 投机牌，深筹码多人底池
  SPECULATIVE: [
    'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
    'Q8o', 'Q7o', 'Q6o', 'Q5o', 'Q4o'
  ],

  // 🗑️ TRASH (38% - 65个组合) - 垃圾牌，几乎总是弃牌
  TRASH: [
    'Q3o', 'Q2o', 'J8o', 'J7o', 'J6o', 'J5o', 'J4o', 'J3o', 'J2o',
    'T8o', 'T7o', 'T6o', 'T5o', 'T4o', 'T3o', 'T2o',
    '97o', '96o', '95o', '94o', '93o', '92o',
    '86o', '85o', '84o', '83o', '82o',
    '76o', '75o', '74o', '73o', '72o',
    '65s', '64s', '63s', '62s',
    '54s', '53s', '52s',
    '43s', '42s', '32s',
    '65o', '64o', '63o', '62o',
    '54o', '53o', '52o',
    '43o', '42o', '32o'
  ]
};

// 生成决策键
function generateDecisionKey(hand, position, facing_action, players_behind, stack_tier) {
  return `${hand}_${position}_${facing_action}_${players_behind}_${stack_tier}`;
}

// 获取手牌等级
function getHandTier(hand) {
  for (const [tier, hands] of Object.entries(HAND_TIERS)) {
    if (hands.includes(hand)) {
      return tier;
    }
  }
  return 'UNKNOWN';
}

// 基础GTO策略逻辑
function generateGTODecision(hand, position, facing_action, players_behind, stack_tier) {
  const handTier = getHandTier(hand);
  const positionIndex = POSITIONS[position];

  // console.log(`🎯 GTO决策分析: hand=${hand}, position=${position}, facing_action=${facing_action}, handTier=${handTier}`);

  // 🎯 关键修复：面对任何加注类型都使用防守策略
  if (facing_action.includes('raise') || facing_action === '3bet' || facing_action === '4bet' || facing_action === '5bet') {
    // console.log(`🎯 面对加注类型: ${facing_action}, 使用防守策略`);
    return getDefenseStrategy(hand, handTier, position, facing_action, stack_tier);
  }

  // 面对无行动的开池策略
  if (facing_action === 'none') {
    return getOpeningStrategy(hand, handTier, position, positionIndex, stack_tier);
  }

  // 面对跛入的策略
  if (facing_action === 'limp') {
    return getLimpStrategy(hand, handTier, position, stack_tier);
  }

  // 面对其他复杂行动
  if (facing_action === 'squeeze' || facing_action === 'iso_raise' || facing_action === 'cold_4bet') {
    // console.log(`🎯 面对复杂行动: ${facing_action}, 使用防守策略`);
    return getDefenseStrategy(hand, handTier, position, facing_action, stack_tier);
  }

  // 默认弃牌
  console.log(`⚠️ 未识别的行动类型: ${facing_action}, 默认弃牌`);
  return DECISIONS.FOLD;
}

// 开池策略 (根据筹码深度调整)
function getOpeningStrategy(hand, handTier, position, positionIndex, stack_tier) {

  // 🔴 浅筹码策略 (10-40BB) - 推拿为主
  if (stack_tier === 'short') {
    return getShortStackOpeningStrategy(hand, handTier, position, positionIndex);
  }

  // 🟡 中等筹码策略 (40-150BB) - 标准策略
  if (stack_tier === 'medium') {
    return getMediumStackOpeningStrategy(hand, handTier, position, positionIndex);
  }

  // 🟢 深筹码策略 (150BB+) - 更多投机牌
  if (stack_tier === 'deep') {
    return getDeepStackOpeningStrategy(hand, handTier, position, positionIndex);
  }

  return DECISIONS.FOLD;
}

// 🔴 浅筹码开池策略 (10-40BB) - 推拿为主，避免翻后
function getShortStackOpeningStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 (UTG, UTG+1) - 只推拿绝对强牌
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG' && ['JJ', 'TT', 'AQs', 'AQo'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  // 中期位置 (MP, MP+1) - 扩大推拿范围
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'PREMIUM_MEDIUM' && ['99', 'ATs', 'KJs', 'QJs', 'JTs'].includes(hand)) {
      return DECISIONS.ALL_IN;
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 (CO, BTN) - 更宽的推拿范围
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM' && ['88', '77', 'A8s', 'A7s', 'A6s', 'A5s'].includes(hand)) {
      return DECISIONS.ALL_IN;
    }
    // 同花连牌在后期位置有推拿价值
    if (['K9s', 'Q9s', 'J9s', 'T9s', '98s', '87s'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  // 小盲位置 - 积极推拿策略
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM' && ['88', '77', 'A8s', 'A7s', 'K9s', 'Q9s'].includes(hand)) {
      return DECISIONS.ALL_IN;
    }
    return DECISIONS.FOLD;
  }

  // 大盲位置 - 只有在真正无人行动时才能免费看牌
  if (position === 'BB') {
    console.log('🎯 BB位置浅筹码开池策略: 无人行动，可以check');
    return DECISIONS.CHECK;
  }

  return DECISIONS.FOLD;
}

// 🟡 中等筹码开池策略 (40-150BB) - 标准GTO策略
function getMediumStackOpeningStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 (UTG, UTG+1) - 紧范围，12-15% VPIP
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'PREMIUM_MEDIUM' && ['ATs', 'KJs', 'QJs', 'JTs', '99'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 中期位置 (MP, MP+1) - 标准范围，18-22% VPIP  
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM' && ['88', '77', 'A8s', 'A7s', 'A6s', 'A5s'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 (CO, BTN) - 宽范围，28-35% VPIP
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK' && ['66', '55', '44', '33', '22'].includes(hand)) {
      return DECISIONS.RAISE_25BB; // 小对子在后期位置有价值
    }
    // 投机牌在后期位置
    if (handTier === 'SPECULATIVE') return DECISIONS.RAISE_25BB;
    // 额外的同花连牌
    if (['K8s', 'Q8s', 'J8s', 'T8s', '97s', '86s', '75s', '64s', '53s'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 小盲位置 - 用3BB开池，范围略紧
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_3BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_3BB;
    return DECISIONS.FOLD;
  }

  // 大盲位置 - 只有在真正无人行动时才能免费看牌
  if (position === 'BB') {
    console.log('🎯 BB位置中等筹码开池策略: 无人行动，可以check');
    return DECISIONS.CHECK;
  }

  return DECISIONS.FOLD;
}

// 🟢 深筹码开池策略 (150BB+) - 更多投机牌，强调隐含赔率
function getDeepStackOpeningStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 (UTG, UTG+1) - 稍微松一点，重视套牌价值
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM' && ['88', '77', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s'].includes(hand)) {
      return DECISIONS.RAISE_25BB; // 小对子和A-x同花在深筹码有套牌价值
    }
    return DECISIONS.FOLD;
  }

  // 中期位置 (MP, MP+1) - 加入更多投机牌和同花连牌
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK' && ['66', '55', '44', '33', '22'].includes(hand)) {
      return DECISIONS.RAISE_25BB; // 所有对子在深筹码都有价值
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 (CO, BTN) - 非常宽的范围，深筹码优势
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK') return DECISIONS.RAISE_25BB;
    if (handTier === 'SPECULATIVE') return DECISIONS.RAISE_25BB;
    // 深筹码可以玩更多边缘牌，寻求隐含赔率
    if (['K7s', 'Q7s', 'J7s', 'T7s', '96s', '85s', '74s', '64s', '53s', '42s'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 小盲位置 - 用3BB开池，范围较宽
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_3BB;
    if (handTier === 'PREMIUM_MEDIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'WEAK' && ['66', '55', '44', '33', '22'].includes(hand)) {
      return DECISIONS.RAISE_3BB;
    }
    return DECISIONS.FOLD;
  }

  // 大盲位置 - 只有在真正无人行动时才能免费看牌
  if (position === 'BB') {
    console.log('🎯 BB位置深筹码开池策略: 无人行动，可以check');
    return DECISIONS.CHECK;
  }

  return DECISIONS.FOLD;
}

// 防守策略 (根据筹码深度调整)
function getDefenseStrategy(hand, handTier, position, facing_action, stack_tier) {

  // 🔴 浅筹码防守 - 推拿或弃牌
  if (stack_tier === 'short') {
    return getShortStackDefenseStrategy(hand, handTier, position, facing_action);
  }

  // 🟡 中等筹码防守 - 标准策略
  if (stack_tier === 'medium') {
    return getMediumStackDefenseStrategy(hand, handTier, position, facing_action);
  }

  // 🟢 深筹码防守 - 更多跟注
  if (stack_tier === 'deep') {
    return getDeepStackDefenseStrategy(hand, handTier, position, facing_action);
  }

  return DECISIONS.FOLD;
}

// 浅筹码防守策略
function getShortStackDefenseStrategy(hand, handTier, position, facing_action) {
  // 面对标准加注 - 推拿或弃牌
  if (facing_action.includes('raise')) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG' && ['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM' && ['TT', '99', 'AQs', 'AQo'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  // 面对3bet - 只有最强牌推拿
  if (facing_action === '3bet') {
    if (['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  return DECISIONS.FOLD;
}

// 中等筹码防守策略 (标准GTO)
function getMediumStackDefenseStrategy(hand, handTier, position, facing_action) {
  // 面对标准加注 (2.5BB-3BB)
  if (facing_action.includes('raise')) {
    if (handTier === 'PREMIUM') {
      if (['AA', 'KK'].includes(hand)) return DECISIONS.THREBET_10BB; // 3bet价值
      if (['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.CALL;
      return DECISIONS.CALL;
    }
    if (handTier === 'STRONG') {
      if (['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.CALL;
      if (['TT', '99', 'AQs', 'AQo'].includes(hand)) return DECISIONS.CALL;
      return DECISIONS.FOLD;
    }
    if (handTier === 'MEDIUM') {
      if (['TT', '99', 'AQs', 'AQo', 'KQs'].includes(hand)) return DECISIONS.CALL;
      return DECISIONS.FOLD;
    }
    // 添加一些诈唬3bet
    if (['A5s', 'A4s', 'K9s', 'Q9s'].includes(hand) && position === 'BB') {
      return DECISIONS.THREBET_9BB; // 诈唬3bet
    }
    return DECISIONS.FOLD;
  }

  // 面对3bet
  if (facing_action === '3bet') {
    if (handTier === 'PREMIUM') {
      if (['AA', 'KK'].includes(hand)) return DECISIONS.FOURBET_22BB; // 4bet价值
      if (['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.CALL;
      return DECISIONS.CALL;
    }
    if (['AKs', 'AKo', 'QQ'].includes(hand)) return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  // 🚀 面对4bet - 新增高级策略
  if (facing_action === '4bet') {
    if (handTier === 'PREMIUM') {
      if (['AA', 'KK'].includes(hand)) return DECISIONS.FIVEBET_55BB; // 5bet价值
      if (['QQ', 'AKs'].includes(hand)) return DECISIONS.CALL_4BET_DEFEND; // 防守跟注
      return DECISIONS.FOLD_TO_4BET;
    }
    if (['AKs', 'AKo'].includes(hand)) return DECISIONS.MIXED_CALL_FOLD; // 混合策略
    return DECISIONS.FOLD_TO_4BET;
  }

  // 🚀 面对5bet - 超高级策略
  if (facing_action === '5bet') {
    if (['AA', 'KK'].includes(hand)) return DECISIONS.CALL; // 只有最强牌跟注
    return DECISIONS.FOLD_TO_5BET;
  }

  // 🚀 面对squeeze - 挤压策略
  if (facing_action === 'squeeze') {
    if (handTier === 'PREMIUM') {
      if (['AA', 'KK', 'QQ'].includes(hand)) return DECISIONS.COLD_4BET_22BB; // Cold 4bet
      return DECISIONS.CALL;
    }
    if (handTier === 'STRONG' && ['AKs', 'AKo', 'QQ', 'JJ'].includes(hand)) {
      return DECISIONS.CALL;
    }
    return DECISIONS.FOLD; // 面对squeeze大部分牌弃牌
  }

  // 🚀 面对isolation raise
  if (facing_action === 'iso_raise') {
    if (handTier === 'PREMIUM') return DECISIONS.THREBET_10BB;
    if (handTier === 'STRONG') return DECISIONS.CALL;
    if (handTier === 'MEDIUM' && ['TT', '99', 'AQs', 'AQo'].includes(hand)) return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  return DECISIONS.FOLD;
}

// 深筹码防守策略 (更多跟注)
function getDeepStackDefenseStrategy(hand, handTier, position, facing_action) {
  // 面对标准加注 - 更宽的跟注范围
  if (facing_action.includes('raise')) {
    if (handTier === 'PREMIUM') {
      if (['AA', 'KK'].includes(hand)) return DECISIONS.THREBET_12BB; // 3bet价值
      return DECISIONS.CALL;
    }
    if (handTier === 'STRONG') return DECISIONS.CALL;
    if (handTier === 'MEDIUM') return DECISIONS.CALL;
    if (handTier === 'WEAK' && ['22', '33', '44', '55', '66', 'A2s', 'A3s', 'A4s', 'A5s'].includes(hand)) {
      return DECISIONS.CALL; // 深筹码可以用小对子和A小同花追set
    }
    if (handTier === 'SPECULATIVE') return DECISIONS.CALL; // 同花连张有隐含赔率
    // 深筹码可以有更多诈唬3bet
    if (['A5s', 'A4s', 'K9s', 'Q9s', 'J9s'].includes(hand) && ['BB', 'SB'].includes(position)) {
      return DECISIONS.THREBET_10BB; // 诈唬3bet
    }
    return DECISIONS.FOLD;
  }

  // 面对3bet - 稍微宽一点
  if (facing_action === '3bet') {
    if (handTier === 'PREMIUM') {
      if (['AA', 'KK'].includes(hand)) return DECISIONS.FOURBET_25BB; // 4bet价值
      if (['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.CALL;
      return DECISIONS.CALL;
    }
    if (['AKs', 'AKo', 'QQ', 'JJ', 'TT'].includes(hand)) return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  return DECISIONS.FOLD;
}

// 跛入策略 (根据筹码深度调整)
function getLimpStrategy(hand, handTier, position, stack_tier) {
  // 🎯 BB位置特殊处理：面对跛入可以免费看翻牌
  if (position === 'BB') {
    // BB面对跛入时，大部分牌都可以check看翻牌
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_3BB; // 强牌可以加注
    if (handTier === 'STRONG') return DECISIONS.RAISE_3BB;
    if (handTier === 'MEDIUM') return DECISIONS.CHECK; // 中等牌check看翻牌
    if (handTier === 'WEAK') return DECISIONS.CHECK;   // 弱牌也可以check
    if (handTier === 'SPECULATIVE') return DECISIONS.CHECK; // 投机牌check
    return DECISIONS.CHECK; // 默认check
  }

  // 浅筹码面对跛入 - 推拿或弃牌
  if (stack_tier === 'short') {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM') return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  // 中等筹码面对跛入 - 标准策略
  if (stack_tier === 'medium') {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_4BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_4BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'WEAK' && ['22', '33', '44', '55', 'A2s', 'A3s', 'A4s', 'A5s'].includes(hand)) {
      return DECISIONS.CALL;
    }
    if (handTier === 'SPECULATIVE') return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  // 深筹码面对跛入 - 更多跟注
  if (stack_tier === 'deep') {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_4BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_4BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'WEAK') return DECISIONS.CALL; // 深筹码可以跟注更多弱牌
    if (handTier === 'SPECULATIVE') return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  return DECISIONS.FOLD;
}

// 初始化GTO数据
function initializeGTOData() {
  console.log('📊 生成GTO翻前决策表 (包含筹码深度)...');

  // 所有手牌
  const allHands = [
    ...HAND_TIERS.PREMIUM,
    ...HAND_TIERS.STRONG,
    ...HAND_TIERS.MEDIUM,
    ...HAND_TIERS.WEAK,
    ...HAND_TIERS.SPECULATIVE,
    ...HAND_TIERS.TRASH
  ];

  // 所有位置
  const positions = Object.keys(POSITIONS);

  // 🚀 扩展所有行动类型 - 支持复杂对战场景
  const actions = [
    // 基础行动
    'none', 'limp', 'raise_2bb', 'raise_3bb', 'raise_4bb', 
    // 多轮加注
    '3bet', '4bet', '5bet', 
    // 高级策略
    'squeeze', 'iso_raise', 'cold_4bet',
    // 位置对战
    'btn_vs_sb', 'co_vs_btn', 'utg_vs_late',
    // 多人底池
    'multi_way_2', 'multi_way_3', 'limped_pot',
    // 特殊情况
    'sb_complete', 'bb_option', 'straddle_action'
  ];

  // 所有筹码深度
  const stackTiers = Object.keys(STACK_TIERS);

  let count = 0;

  for (const hand of allHands) {
    for (const position of positions) {
      for (const action of actions) {
        for (let players_behind = 0; players_behind <= 7; players_behind++) {
          for (const stack_tier of stackTiers) {
            const key = generateDecisionKey(hand, position, action, players_behind, stack_tier);
            const decision = generateGTODecision(hand, position, action, players_behind, stack_tier);
            gtoDecisionTable.set(key, decision);
            count++;
          }
        }
      }
    }
  }

  console.log(`✅ 生成了 ${count} 个GTO决策场景`);
  console.log(`📈 包含 ${stackTiers.length} 个筹码深度档位`);
  console.log(`📊 数据表大小: ${gtoDecisionTable.size}`);
}

// 🔍 决策合法性验证
function validateDecision(decision, facing_action, position) {
  // 🎯 关键验证：面对加注时不能check
  if (facing_action.includes('raise') || facing_action === '3bet' || facing_action === '4bet' || facing_action === '5bet') {
    if (decision.action === 'check') {
      console.error(`❌ 不合法决策: 面对${facing_action}时不能check, 位置: ${position}`);
      
      // 自动纠正为fold
      return {
        action: 'fold',
        amount: 0,
        frequency: 1.0,
        isAutoCorrected: true,
        originalAction: 'check'
      };
    }
  }

  // 其他基础验证可以在这里添加
  return decision;
}

// 获取翻前决策
function getPreflopDecision({ hand, position, facing_action, players_behind, stack_bb }) {
  console.log(`🎯 GTO翻前决策请求: hand=${hand}, position=${position}, facing_action=${facing_action}, stack_bb=${stack_bb}`);
  
  // 确定筹码深度档位
  const stack_tier = getStackTier(stack_bb || 100); // 默认100BB
  const key = generateDecisionKey(hand, position, facing_action, players_behind, stack_tier);

  // 从缓存获取
  let decision = gtoDecisionTable.get(key);

  if (!decision) {
    // 实时生成
    decision = generateGTODecision(hand, position, facing_action, players_behind, stack_tier);
    gtoDecisionTable.set(key, decision);
  }

  // 🔥 新增：验证决策合法性
  const validatedDecision = validateDecision(decision, facing_action, position);

  const result = {
    ...validatedDecision,
    hand_tier: getHandTier(hand),
    stack_tier: stack_tier,
    stack_bb: stack_bb || 100,
    scenario: key,
    reasoning: generateReasoning(hand, position, facing_action, validatedDecision, stack_tier)
  };

  // 如果决策被自动纠正，更新推理
  if (validatedDecision.isAutoCorrected) {
    result.reasoning = `自动纠正: 面对${facing_action}不能${validatedDecision.originalAction}，改为${result.action}`;
  }

  console.log(`✅ GTO决策结果: ${result.action} (${result.reasoning})`);

  return result;
}

// 生成决策理由
function generateReasoning(hand, position, facing_action, decision, stack_tier) {
  const handTier = getHandTier(hand);
  const action = decision.action;
  const stackName = STACK_TIERS[stack_tier]?.name || stack_tier;

  if (action === 'fold') {
    return `${hand} (${handTier}) 在 ${position} 位置面对 ${facing_action}，${stackName}下牌力不足，选择弃牌`;
  }

  if (action === 'call') {
    return `${hand} (${handTier}) 在 ${position} 位置，${stackName}下有足够牌力跟注`;
  }

  if (action === 'raise') {
    return `${hand} (${handTier}) 在 ${position} 位置，${stackName}下价值下注 ${decision.amount}BB`;
  }

  if (action === 'all_in') {
    return `${hand} (${handTier}) 在 ${position} 位置，${stackName}下推拿全部筹码`;
  }

  if (action === 'limp') {
    return `${hand} (${handTier}) 在 ${position} 位置，${stackName}下选择跛入`;
  }

  return `${stackName}GTO策略`;
}

module.exports = {
  initializeGTOData,
  getPreflopDecision,
  getStackTier,
  POSITIONS,
  ACTIONS,
  HAND_TIERS,
  STACK_TIERS
};
