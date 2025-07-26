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

// 行动类型
const ACTIONS = {
  'none': 0,        // 无人行动
  'limp': 1,        // 跛入
  'raise_2bb': 2,   // 加注2BB
  'raise_3bb': 3,   // 加注3BB
  'raise_4bb': 4,   // 加注4BB
  '3bet': 5,        // 3bet
  '4bet': 6,        // 4bet
  '5bet': 7         // 5bet
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

  // 3bet/4bet大小
  THREBET_9BB: { action: 'raise', amount: 9, frequency: 1.0 },   // 标准3bet
  THREBET_10BB: { action: 'raise', amount: 10, frequency: 1.0 },
  THREBET_12BB: { action: 'raise', amount: 12, frequency: 1.0 },
  FOURBET_22BB: { action: 'raise', amount: 22, frequency: 1.0 }, // 标准4bet
  FOURBET_25BB: { action: 'raise', amount: 25, frequency: 1.0 },

  // 全推
  ALL_IN: { action: 'all_in', amount: 0, frequency: 1.0 },

  // 最小加注
  MIN_RAISE: { action: 'raise', amount: 2.2, frequency: 1.0 }
};

// 手牌强度分类
const HAND_TIERS = {
  PREMIUM: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'],
  STRONG: ['TT', '99', 'AQs', 'AQo', 'AJs', 'AJo', 'KQs', 'KQo'],
  MEDIUM: ['88', '77', 'ATs', 'ATo', 'A9s', 'A9o', 'KJs', 'KJo', 'KTs', 'QJs', 'QJo', 'JTs'],
  WEAK: ['66', '55', '44', '33', '22', 'A8s', 'A8o', 'A7s', 'A7o', 'A6s', 'A6o', 'A5s', 'A5o', 'A4s', 'A4o', 'A3s', 'A3o', 'A2s', 'A2o'],
  SPECULATIVE: ['K9s', 'Q9s', 'J9s', 'T9s', '98s', '87s', '76s', '65s', '54s'],
  TRASH: ['72o', '83o', '92o', '84o', '93o', '85o', '94o', '86o', '95o']
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

  // 面对无行动的开池策略
  if (facing_action === 'none') {
    return getOpeningStrategy(hand, handTier, position, positionIndex, stack_tier);
  }

  // 面对加注的策略
  if (facing_action.includes('raise') || facing_action === '3bet') {
    return getDefenseStrategy(hand, handTier, position, facing_action, stack_tier);
  }

  // 面对跛入的策略
  if (facing_action === 'limp') {
    return getLimpStrategy(hand, handTier, position, stack_tier);
  }

  // 默认弃牌
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

// 浅筹码开池策略
function getShortStackOpeningStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 - 只推拿强牌
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG' && ['TT', '99', 'AQs', 'AQo'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  // 中期位置 - 扩大推拿范围
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM' && ['88', '77', 'ATs', 'ATo', 'KQs', 'KQo'].includes(hand)) {
      return DECISIONS.ALL_IN;
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 - 更宽的推拿范围
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM') return DECISIONS.ALL_IN;
    if (handTier === 'WEAK' && ['66', '55', '44', 'A9s', 'A8s', 'A7s'].includes(hand)) {
      return DECISIONS.ALL_IN;
    }
    if (['K9s', 'Q9s', 'J9s', 'T9s'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  // 盲注位置
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (handTier === 'MEDIUM') return DECISIONS.ALL_IN;
    if (['A9s', 'A8s', 'K9s', 'Q9s'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }

  if (position === 'BB') {
    // BB位置面对无行动可以免费看牌
    return DECISIONS.CHECK;
  }

  return DECISIONS.FOLD;
}

// 中等筹码开池策略 (标准GTO)
function getMediumStackOpeningStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 (UTG, UTG+1) - 紧一点，用2.5BB开池
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM' && ['TT', '99', 'ATs', 'KQs', 'QJs', 'JTs'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 中期位置 (MP, MP+1) - 标准范围，2.5BB开池
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK' && ['66', '55', 'A5s', 'A4s'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 (CO, BTN) - 宽范围，2.5BB开池
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK') return DECISIONS.RAISE_25BB;
    if (handTier === 'SPECULATIVE') return DECISIONS.RAISE_25BB;
    if (['K8s', 'Q8s', 'J8s', 'T8s', '97s', '86s', '75s'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 盲注位置 - SB用3BB，BB免费看牌
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_3BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_3BB;
    return DECISIONS.FOLD;
  }

  if (position === 'BB') {
    // BB位置面对无行动可以免费看牌
    return DECISIONS.CHECK;
  }

  return DECISIONS.FOLD;
}

// 深筹码开池策略 (更多投机牌)
function getDeepStackOpeningStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 - 稍微松一点，用2.5BB开池
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (['66', '55', 'A5s', 'A4s', 'A3s', 'A2s'].includes(hand)) return DECISIONS.RAISE_25BB;
    return DECISIONS.FOLD;
  }

  // 中期位置 - 加入更多投机牌，用2.5BB开池
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK') return DECISIONS.RAISE_25BB;
    if (handTier === 'SPECULATIVE') return DECISIONS.RAISE_25BB;
    return DECISIONS.FOLD;
  }

  // 后期位置 - 非常宽的范围，用2.5BB开池
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_25BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_25BB;
    if (handTier === 'WEAK') return DECISIONS.RAISE_25BB;
    if (handTier === 'SPECULATIVE') return DECISIONS.RAISE_25BB;
    // 深筹码可以玩更多垃圾牌
    if (['K7s', 'Q7s', 'J7s', 'T7s', '96s', '85s', '74s', '64s', '53s'].includes(hand)) {
      return DECISIONS.RAISE_25BB;
    }
    return DECISIONS.FOLD;
  }

  // 盲注位置 - SB用3BB，BB免费看牌
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'STRONG') return DECISIONS.RAISE_3BB;
    if (handTier === 'MEDIUM') return DECISIONS.RAISE_3BB;
    if (handTier === 'WEAK') return DECISIONS.RAISE_3BB;
    return DECISIONS.FOLD;
  }

  if (position === 'BB') {
    // BB位置面对无行动可以免费看牌
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

  // 所有行动
  const actions = ['none', 'limp', 'raise_2bb', 'raise_3bb', '3bet'];

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

// 获取翻前决策
function getPreflopDecision({ hand, position, facing_action, players_behind, stack_bb }) {
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

  return {
    ...decision,
    hand_tier: getHandTier(hand),
    stack_tier: stack_tier,
    stack_bb: stack_bb || 100,
    scenario: key,
    reasoning: generateReasoning(hand, position, facing_action, decision, stack_tier)
  };
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
