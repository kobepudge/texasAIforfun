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

// 🚀 扩展筹码深度分层 - 8个精细等级
const STACK_TIERS = {
  'ultra_short': { min: 5, max: 15, name: '超浅筹码', strategy: 'push_fold' },     // 5-15BB (推/弃策略)
  'very_short': { min: 15, max: 25, name: '极浅筹码', strategy: 'aggressive' },    // 15-25BB (激进策略)
  'short': { min: 25, max: 40, name: '浅筹码', strategy: 'tight_aggressive' },    // 25-40BB (紧凶策略)
  'medium_shallow': { min: 40, max: 70, name: '中浅筹码', strategy: 'standard' },  // 40-70BB (标准策略)
  'medium': { min: 70, max: 100, name: '中等筹码', strategy: 'balanced' },        // 70-100BB (平衡策略)
  'medium_deep': { min: 100, max: 150, name: '中深筹码', strategy: 'exploit' },   // 100-150BB (剥削策略)
  'deep': { min: 150, max: 250, name: '深筹码', strategy: 'speculative' },       // 150-250BB (投机策略)
  'ultra_deep': { min: 250, max: 999, name: '超深筹码', strategy: 'implied_odds' } // 250BB+ (隐含赔率策略)
};

// 🔧 精细化筹码深度档位计算
function getStackTier(stackBB) {
  if (stackBB <= 15) return 'ultra_short';
  if (stackBB <= 25) return 'very_short';
  if (stackBB <= 40) return 'short';
  if (stackBB <= 70) return 'medium_shallow';
  if (stackBB <= 100) return 'medium';
  if (stackBB <= 150) return 'medium_deep';
  if (stackBB <= 250) return 'deep';
  return 'ultra_deep';
}

// 决策类型
const DECISIONS = {
  FOLD: { action: 'fold', amount: 0, frequency: 1.0 },
  CALL: { action: 'call', amount: 0, frequency: 1.0 },
  CHECK: { action: 'check', amount: 0, frequency: 1.0 },
  LIMP: { action: 'limp', amount: 1, frequency: 1.0 },

  // 🚀 精细化开池加注尺寸 - 0.1BB间隔
  RAISE_2BB: { action: 'raise', amount: 2.0, frequency: 1.0 },
  RAISE_21BB: { action: 'raise', amount: 2.1, frequency: 1.0 },
  RAISE_22BB: { action: 'raise', amount: 2.2, frequency: 1.0 },
  RAISE_23BB: { action: 'raise', amount: 2.3, frequency: 1.0 },
  RAISE_24BB: { action: 'raise', amount: 2.4, frequency: 1.0 },
  RAISE_25BB: { action: 'raise', amount: 2.5, frequency: 1.0 },  // 标准开池
  RAISE_26BB: { action: 'raise', amount: 2.6, frequency: 1.0 },
  RAISE_27BB: { action: 'raise', amount: 2.7, frequency: 1.0 },
  RAISE_28BB: { action: 'raise', amount: 2.8, frequency: 1.0 },
  RAISE_29BB: { action: 'raise', amount: 2.9, frequency: 1.0 },
  RAISE_3BB: { action: 'raise', amount: 3.0, frequency: 1.0 },
  RAISE_31BB: { action: 'raise', amount: 3.1, frequency: 1.0 },
  RAISE_32BB: { action: 'raise', amount: 3.2, frequency: 1.0 },
  RAISE_33BB: { action: 'raise', amount: 3.3, frequency: 1.0 },
  RAISE_34BB: { action: 'raise', amount: 3.4, frequency: 1.0 },
  RAISE_35BB: { action: 'raise', amount: 3.5, frequency: 1.0 },
  RAISE_36BB: { action: 'raise', amount: 3.6, frequency: 1.0 },
  RAISE_37BB: { action: 'raise', amount: 3.7, frequency: 1.0 },
  RAISE_38BB: { action: 'raise', amount: 3.8, frequency: 1.0 },
  RAISE_39BB: { action: 'raise', amount: 3.9, frequency: 1.0 },
  RAISE_4BB: { action: 'raise', amount: 4.0, frequency: 1.0 },

  // 🎯 扩展决策类型 - 支持复杂多轮行动
  
  // 🚀 精细化3bet策略 - 0.1BB间隔
  THREBET_85BB: { action: 'raise', amount: 8.5, frequency: 1.0 },
  THREBET_9BB: { action: 'raise', amount: 9.0, frequency: 1.0 },   // 标准3bet
  THREBET_95BB: { action: 'raise', amount: 9.5, frequency: 1.0 },
  THREBET_10BB: { action: 'raise', amount: 10.0, frequency: 1.0 },
  THREBET_105BB: { action: 'raise', amount: 10.5, frequency: 1.0 },
  THREBET_11BB: { action: 'raise', amount: 11.0, frequency: 1.0 },
  THREBET_115BB: { action: 'raise', amount: 11.5, frequency: 1.0 },
  THREBET_12BB: { action: 'raise', amount: 12.0, frequency: 1.0 },
  THREBET_125BB: { action: 'raise', amount: 12.5, frequency: 1.0 },
  THREBET_13BB: { action: 'raise', amount: 13.0, frequency: 1.0 },
  THREBET_BALANCED: { action: 'raise', amount: 10.2, frequency: 0.7 }, // 平衡3bet
  
  // 🚀 精细化4bet策略 - 0.5BB间隔  
  FOURBET_20BB: { action: 'raise', amount: 20.0, frequency: 1.0 },
  FOURBET_205BB: { action: 'raise', amount: 20.5, frequency: 1.0 },
  FOURBET_21BB: { action: 'raise', amount: 21.0, frequency: 1.0 },
  FOURBET_215BB: { action: 'raise', amount: 21.5, frequency: 1.0 },
  FOURBET_22BB: { action: 'raise', amount: 22.0, frequency: 1.0 }, // 标准4bet
  FOURBET_225BB: { action: 'raise', amount: 22.5, frequency: 1.0 },
  FOURBET_23BB: { action: 'raise', amount: 23.0, frequency: 1.0 },
  FOURBET_235BB: { action: 'raise', amount: 23.5, frequency: 1.0 },
  FOURBET_24BB: { action: 'raise', amount: 24.0, frequency: 1.0 },
  FOURBET_245BB: { action: 'raise', amount: 24.5, frequency: 1.0 },
  FOURBET_25BB: { action: 'raise', amount: 25.0, frequency: 1.0 },
  FOURBET_26BB: { action: 'raise', amount: 26.0, frequency: 1.0 },
  FOURBET_27BB: { action: 'raise', amount: 27.0, frequency: 1.0 },
  FOURBET_28BB: { action: 'raise', amount: 28.0, frequency: 1.0 },
  FOURBET_29BB: { action: 'raise', amount: 29.0, frequency: 1.0 },
  FOURBET_30BB: { action: 'raise', amount: 30.0, frequency: 1.0 }, // 深筹码4bet
  FOURBET_POLARIZED: { action: 'raise', amount: 22.3, frequency: 0.8 }, // 极化4bet
  
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

// 🧠 智能加注尺寸选择函数
function selectOptimalRaiseSize(handCategory, position, stackTier, opponentCount) {
  const baseSize = 2.5; // 默认2.5BB
  
  // 手牌强度调整
  const handMultiplier = {
    'PREMIUM': 1.2,    // AA, KK, QQ, AK -> 3.0BB
    'STRONG': 1.1,     // JJ, AQ, KQ -> 2.7BB  
    'MEDIUM': 1.0,     // 中等牌力 -> 2.5BB
    'WEAK': 0.9,       // 弱牌诈唬 -> 2.2BB
    'BLUFF': 0.8       // 纯诈唬 -> 2.0BB
  }[handCategory] || 1.0;
  
  // 位置调整
  const positionMultiplier = {
    'UTG': 0.95,       // 前位稍小
    'UTG+1': 0.97,
    'UTG+2': 0.98,
    'MP': 1.0,         // 中位标准
    'MP+1': 1.0,
    'CO': 1.05,        // 后位稍大
    'BTN': 1.1,        // 庄家最大
    'SB': 1.15,        // 小盲3bet稍大
    'BB': 1.2          // 大盲3bet更大
  }[position] || 1.0;
  
  // 筹码深度调整
  const stackMultiplier = {
    'ultra_short': 0.8,  // 浅筹码小尺寸
    'very_short': 0.9,
    'short': 0.95,
    'medium': 1.0,       // 标准深度
    'deep': 1.05,
    'very_deep': 1.1,
    'ultra_deep': 1.15,
    'tournament': 1.2    // 深筹码大尺寸
  }[stackTier] || 1.0;
  
  // 对手数量调整（多人底池用小尺寸）
  const opponentMultiplier = Math.max(0.8, 1.1 - (opponentCount * 0.05));
  
  const finalSize = baseSize * handMultiplier * positionMultiplier * stackMultiplier * opponentMultiplier;
  
  // 取最接近的0.1BB间隔
  return Math.round(finalSize * 10) / 10;
}

function selectPreciseRaiseDecision(handCategory, position, stackTier, potSize, opponentCount) {
  const optimalSize = selectOptimalRaiseSize(handCategory, position, stackTier, opponentCount);
  
  // 找到最接近的决策选项
  const sizeKey = `RAISE_${Math.round(optimalSize * 10)}BB`;
  
  if (DECISIONS[sizeKey]) {
    return {
      ...DECISIONS[sizeKey],
      reasoning: `${handCategory}牌在${position}位置，${stackTier}筹码深度，面对${opponentCount}对手，最优加注${optimalSize}BB`
    };
  }
  
  // 回退到标准尺寸
  return {
    ...DECISIONS.RAISE_25BB,
    reasoning: `标准2.5BB加注（目标尺寸${optimalSize}BB不可用）`
  };
}

function selectPrecise3BetDecision(handCategory, position, stackTier, originalRaiseSize) {
  const base3BetSize = originalRaiseSize * 3 + 1; // 3bet = 3x + 1BB
  
  // 手牌调整
  const handMultiplier = {
    'PREMIUM': 1.1,    // 价值3bet稍大
    'STRONG': 1.0,     // 标准3bet
    'MEDIUM': 0.9,     // 混合3bet稍小
    'WEAK': 0.85,      // 诈唬3bet更小
    'BLUFF': 0.8       // 纯诈唬最小
  }[handCategory] || 1.0;
  
  // 位置调整（out of position更大）
  const positionMultiplier = {
    'SB': 1.2, 'BB': 1.15, 'UTG': 1.1, 'UTG+1': 1.05,
    'UTG+2': 1.0, 'MP': 0.98, 'MP+1': 0.96, 'CO': 0.94, 'BTN': 0.92
  }[position] || 1.0;
  
  const finalSize = Math.max(8.0, base3BetSize * handMultiplier * positionMultiplier);
  const roundedSize = Math.round(finalSize * 10) / 10;
  
  // 查找对应的决策 - 修复命名不一致问题
  for (let size = Math.floor(roundedSize * 10); size <= 130; size++) {
    const sizeKey = `THREBET_${size}BB`;  // 使用THREBET格式
    if (DECISIONS[sizeKey]) {
      return {
        ...DECISIONS[sizeKey],
        reasoning: `${handCategory}牌${position}位置3bet，面对${originalRaiseSize}BB开池，最优尺寸${roundedSize}BB`
      };
    }
  }
  
  return DECISIONS.THREBET_9BB || DECISIONS.RAISE_3BB; // 回退到标准3bet
}

function selectPrecise4BetDecision(handCategory, position, stackTier, threeBetSize) {
  const base4BetSize = threeBetSize * 2.2 + 2; // 4bet = 2.2x + 2BB
  
  // 4bet主要用于价值和平衡，尺寸相对固定
  const handMultiplier = {
    'PREMIUM': 1.05,   // AA/KK稍大
    'STRONG': 1.0,     // QQ/AK标准
    'MEDIUM': 0.95,    // 平衡4bet稍小
    'BLUFF': 0.9       // 诈唬4bet更小
  }[handCategory] || 1.0;
  
  const finalSize = Math.max(22.0, base4BetSize * handMultiplier);
  const roundedSize = Math.round(finalSize * 10) / 10;
  
  // 查找最接近的4bet决策
  for (let size = Math.floor(roundedSize); size <= 30; size++) {
    const sizeKey = `FOURBET_${size}BB`;
    if (DECISIONS[sizeKey]) {
      return {
        ...DECISIONS[sizeKey],
        reasoning: `${handCategory}牌4bet，面对${threeBetSize}BB的3bet，最优尺寸${roundedSize}BB`
      };
    }
  }
  
  return DECISIONS.FOURBET_22BB; // 回退到标准4bet尺寸
}

// 🏆 多人底池动态建模系统 - 3bet/4bet复杂交互

/**
 * 多人底池行动序列分析器
 * 解析复杂的3bet/4bet/5bet交互，支持多人参与的高级策略建模
 */
class MultiPlayerPotModeler {
  constructor() {
    this.actionHistory = [];
    this.playerPositions = new Map();
    this.currentPotStructure = {
      totalPot: 0,
      lastRaiseSize: 0,
      actionCount: 0,
      activePlayers: [],
      potType: 'unopened' // unopened, raised, 3bet, 4bet, 5bet, all_in
    };
  }

  /**
   * 分析行动序列并构建复杂底池结构
   * @param {Array} actions - 完整行动历史 [{playerId, action, amount, position}]
   * @param {Array} activePlayers - 当前活跃玩家列表
   */
  analyzeActionSequence(actions, activePlayers) {
    this.resetAnalysis();
    this.actionHistory = [...actions];
    this.currentPotStructure.activePlayers = [...activePlayers];
    
    let potSize = 1.5; // 小盲+大盲
    let lastRaiseAmount = 2; // 大盲为初始"加注"
    let raiseCount = 0;
    let currentRaiser = null;
    
    // 分析每个行动，构建底池动态
    actions.forEach((action, index) => {
      this.playerPositions.set(action.playerId, action.position);
      
      if (action.action === 'raise') {
        raiseCount++;
        potSize += action.amount;
        lastRaiseAmount = action.amount;
        currentRaiser = action.playerId;
        
        // 根据加注轮数确定底池类型
        if (raiseCount === 1) {
          this.currentPotStructure.potType = 'raised';
        } else if (raiseCount === 2) {
          this.currentPotStructure.potType = '3bet';
        } else if (raiseCount === 3) {
          this.currentPotStructure.potType = '4bet';
        } else if (raiseCount >= 4) {
          this.currentPotStructure.potType = '5bet';
        }
      } else if (action.action === 'call') {
        potSize += lastRaiseAmount;
      } else if (action.action === 'all_in') {
        this.currentPotStructure.potType = 'all_in';
        potSize += action.amount;
      }
    });
    
    this.currentPotStructure.totalPot = potSize;
    this.currentPotStructure.lastRaiseSize = lastRaiseAmount;
    this.currentPotStructure.actionCount = raiseCount;
    
    return this.currentPotStructure;
  }

  /**
   * 获取复杂3bet场景的最优决策
   * @param {string} handCategory - 手牌分类
   * @param {string} position - 玩家位置
   * @param {string} originalRaiserPosition - 原始开池者位置
   * @param {number} originalRaiseSize - 原始开池尺寸
   * @param {Array} callers - 跟注者列表
   */
  get3BetDecisionInMultiWay(handCategory, position, originalRaiserPosition, originalRaiseSize, callers = []) {
    const callerCount = callers.length;
    const isIsolation = callerCount === 0; // 隔离3bet
    const isSqueeze = callerCount >= 1; // 挤压3bet
    
    // 基础3bet尺寸计算
    let base3BetSize = originalRaiseSize * 3 + 1;
    
    // 多人底池调整
    if (isSqueeze) {
      // 挤压3bet需要更大尺寸对抗多个对手
      base3BetSize += callerCount * 1.5; // 每个跟注者增加1.5BB
      
      // 位置劣势需要更大尺寸
      const positionPenalty = this.getPositionDisadvantage(position, originalRaiserPosition);
      base3BetSize *= (1 + positionPenalty * 0.1);
    }
    
    // 手牌强度调整
    const handStrengthMultiplier = {
      'PREMIUM': 1.15,   // 价值导向，稍大
      'STRONG': 1.0,     // 标准尺寸
      'MEDIUM': 0.9,     // 混合策略，稍小
      'WEAK': 0.8,       // 诈唬导向，更小
      'BLUFF': 0.75      // 纯诈唬，最小
    }[handCategory] || 1.0;
    
    const finalSize = base3BetSize * handStrengthMultiplier;
    
    // 构建决策推理
    const reasoning = isSqueeze 
      ? `${handCategory}牌面对${originalRaiserPosition}开池+${callerCount}跟注者，${position}位置挤压3bet${finalSize.toFixed(1)}BB`
      : `${handCategory}牌面对${originalRaiserPosition}开池，${position}位置隔离3bet${finalSize.toFixed(1)}BB`;
    
    return {
      action: 'raise',
      amount: Math.round(finalSize * 10) / 10,
      frequency: this.calculate3BetFrequency(handCategory, isSqueeze),
      reasoning,
      potType: isSqueeze ? 'squeeze' : 'isolation_3bet',
      riskLevel: this.calculateRiskLevel(callerCount, position, originalRaiserPosition)
    };
  }

  /**
   * 获取复杂4bet场景的最优决策
   * @param {string} handCategory - 手牌分类
   * @param {string} position - 玩家位置
   * @param {string} threeBetterPosition - 3bet者位置
   * @param {number} threeBetSize - 3bet尺寸
   * @param {Object} originalPotStructure - 原始底池结构
   */
  get4BetDecisionInComplexPot(handCategory, position, threeBetterPosition, threeBetSize, originalPotStructure) {
    // 判断4bet场景类型
    const is4BetForValue = ['PREMIUM', 'STRONG'].includes(handCategory);
    const is4BetBluff = ['WEAK', 'BLUFF'].includes(handCategory);
    const is4BetBalanced = handCategory === 'MEDIUM';
    
    // 基础4bet尺寸：2.2x + pot adjustment
    let base4BetSize = threeBetSize * 2.2 + 2;
    
    // 复杂底池调整
    if (originalPotStructure.potType === 'squeeze') {
      // 面对挤压3bet的4bet需要更大尺寸
      base4BetSize *= 1.15;
    }
    
    // 位置关系调整
    const positionAdvantage = this.getRelativePositionAdvantage(position, threeBetterPosition);
    if (positionAdvantage < 0) { // Out of position
      base4BetSize *= 1.1; // OOP需要更大尺寸
    }
    
    // 手牌类型调整
    const handTypeMultiplier = {
      'PREMIUM': 1.05,   // AA/KK价值4bet
      'STRONG': 1.0,     // QQ/AK标准4bet
      'MEDIUM': 0.95,    // 平衡4bet稍小
      'WEAK': 0.9,       // 极化诈唬4bet
      'BLUFF': 0.85      // 纯诈唬4bet最小
    }[handCategory] || 1.0;
    
    const finalSize = base4BetSize * handTypeMultiplier;
    
    // 构建推理
    const reasoning = `${handCategory}牌面对${threeBetterPosition}的${threeBetSize}BB 3bet，${position}位置4bet${finalSize.toFixed(1)}BB (${originalPotStructure.potType}底池)`;
    
    return {
      action: 'raise',
      amount: Math.round(finalSize * 10) / 10,
      frequency: this.calculate4BetFrequency(handCategory, originalPotStructure.potType),
      reasoning,
      potType: '4bet',
      isValueBet: is4BetForValue,
      isBluff: is4BetBluff,
      riskLevel: this.calculate4BetRiskLevel(originalPotStructure, position, threeBetterPosition)
    };
  }

  /**
   * 获取5bet/全推决策（终极对抗）
   */
  get5BetOrAllInDecision(handCategory, position, fourBetSize, stackSize, originalPotStructure) {
    const effectiveStack = Math.min(stackSize, 100); // 假设对手也是100BB
    const potSize = originalPotStructure.totalPot;
    const spr = effectiveStack / potSize; // Stack-to-Pot Ratio
    
    // SPR < 3时倾向全推，SPR > 6时倾向fold/call
    if (spr <= 3) {
      return {
        action: 'all_in',
        amount: stackSize,
        frequency: this.calculate5BetFrequency(handCategory, 'low_spr'),
        reasoning: `${handCategory}牌，SPR=${spr.toFixed(1)}，低SPR环境选择全推`,
        potType: 'all_in',
        isCommitted: true
      };
    }
    
    // 只有最强牌才进行5bet
    if (handCategory === 'PREMIUM') {
      const fiveBetSize = Math.min(fourBetSize * 2.3 + 5, stackSize * 0.8);
      return {
        action: 'raise',
        amount: fiveBetSize,
        frequency: 0.8,
        reasoning: `${handCategory}牌价值5bet${fiveBetSize.toFixed(1)}BB，SPR=${spr.toFixed(1)}`,
        potType: '5bet',
        isCommitted: false
      };
    }
    
    // 其他牌力选择弃牌
    return {
      action: 'fold',
      amount: 0,
      frequency: 1.0,
      reasoning: `${handCategory}牌面对4bet，SPR=${spr.toFixed(1)}，牌力不足选择弃牌`,
      potType: 'fold_to_4bet'
    };
  }

  // 辅助计算方法
  getPositionDisadvantage(myPosition, raiserPosition) {
    const positions = ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO', 'BTN'];
    const myIndex = positions.indexOf(myPosition);
    const raiserIndex = positions.indexOf(raiserPosition);
    return Math.max(0, raiserIndex - myIndex) / positions.length;
  }

  getRelativePositionAdvantage(myPosition, opponentPosition) {
    const positions = ['SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO', 'BTN'];
    const myIndex = positions.indexOf(myPosition);
    const oppIndex = positions.indexOf(opponentPosition);
    return myIndex - oppIndex; // 正数=我有位置优势，负数=我位置劣势
  }

  calculate3BetFrequency(handCategory, isSqueeze) {
    const baseFrequencies = {
      'PREMIUM': 0.9,
      'STRONG': 0.7,
      'MEDIUM': 0.4,
      'WEAK': 0.2,
      'BLUFF': 0.15
    };
    
    const frequency = baseFrequencies[handCategory] || 0.1;
    return isSqueeze ? frequency * 0.8 : frequency; // 挤压3bet频率稍低
  }

  calculate4BetFrequency(handCategory, potType) {
    const baseFrequencies = {
      'PREMIUM': 0.85,
      'STRONG': 0.6,
      'MEDIUM': 0.25,
      'WEAK': 0.1,
      'BLUFF': 0.08
    };
    
    const frequency = baseFrequencies[handCategory] || 0.05;
    return potType === 'squeeze' ? frequency * 0.9 : frequency;
  }

  calculate5BetFrequency(handCategory, context) {
    if (context === 'low_spr') {
      return {
        'PREMIUM': 0.95,
        'STRONG': 0.7,
        'MEDIUM': 0.3,
        'WEAK': 0.1,
        'BLUFF': 0.05
      }[handCategory] || 0.02;
    }
    
    return {
      'PREMIUM': 0.8,
      'STRONG': 0.3,
      'MEDIUM': 0.1,
      'WEAK': 0.05,
      'BLUFF': 0.02
    }[handCategory] || 0.01;
  }

  calculateRiskLevel(callerCount, position, raiserPosition) {
    let risk = 0.3; // 基础风险
    risk += callerCount * 0.1; // 每个跟注者增加风险
    risk += this.getPositionDisadvantage(position, raiserPosition) * 0.2;
    return Math.min(risk, 1.0);
  }

  calculate4BetRiskLevel(potStructure, position, threeBetterPosition) {
    let risk = 0.5; // 4bet基础风险较高
    if (potStructure.potType === 'squeeze') risk += 0.15;
    if (this.getRelativePositionAdvantage(position, threeBetterPosition) < 0) risk += 0.1;
    return Math.min(risk, 1.0);
  }

  resetAnalysis() {
    this.actionHistory = [];
    this.playerPositions.clear();
    this.currentPotStructure = {
      totalPot: 0,
      lastRaiseSize: 0,
      actionCount: 0,
      activePlayers: [],
      potType: 'unopened'
    };
  }

  // 获取当前底池分析结果
  getCurrentPotAnalysis() {
    return {
      ...this.currentPotStructure,
      playerPositions: Object.fromEntries(this.playerPositions),
      actionHistory: [...this.actionHistory],
      complexityScore: this.calculateComplexityScore()
    };
  }

  calculateComplexityScore() {
    let complexity = 0;
    complexity += this.actionHistory.length * 0.1;
    complexity += this.currentPotStructure.activePlayers.length * 0.15;
    
    const potTypeComplexity = {
      'unopened': 0,
      'raised': 0.2,
      '3bet': 0.5,
      '4bet': 0.8,
      '5bet': 1.0,
      'all_in': 1.0
    };
    
    complexity += potTypeComplexity[this.currentPotStructure.potType] || 0;
    return Math.min(complexity, 1.0);
  }
}

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

  console.log(`🎯 GTO决策分析: hand=${hand}, position=${position}, facing_action=${facing_action}, handTier=${handTier}, stack_tier=${stack_tier}`);

  // 面对无行动的开池策略
  if (facing_action === 'none') {
    return getOpeningStrategy(hand, handTier, position, positionIndex, stack_tier);
  }

  // 面对跛入的策略
  if (facing_action === 'limp') {
    return getLimpStrategy(hand, handTier, position, stack_tier);
  }

  // 🚀 新逻辑：面对初始开池加注 - 考虑3bet vs 跟注 vs 弃牌
  if (facing_action.includes('raise') && !facing_action.includes('3bet') && !facing_action.includes('4bet')) {
    console.log(`🎯 面对初始开池加注: ${facing_action}, 评估3bet机会`);
    return evaluateThreeBetDecision(hand, handTier, position, facing_action, stack_tier);
  }

  // 🚀 面对3bet - 考虑4bet vs 跟注 vs 弃牌
  if (facing_action === '3bet' || facing_action.includes('3bet')) {
    console.log(`🎯 面对3bet: ${facing_action}, 评估4bet机会`);
    return evaluateFourBetDecision(hand, handTier, position, facing_action, stack_tier);
  }

  // 🚀 面对4bet - 考虑5bet vs 跟注 vs 弃牌 (主要是弃牌)
  if (facing_action === '4bet' || facing_action.includes('4bet')) {
    console.log(`🎯 面对4bet: ${facing_action}, 评估5bet机会`);
    return evaluateFiveBetDecision(hand, handTier, position, facing_action, stack_tier);
  }

  // 面对5bet - 基本只有顶级牌跟注/推进
  if (facing_action === '5bet' || facing_action.includes('5bet')) {
    console.log(`🎯 面对5bet: ${facing_action}, 只有顶级牌继续`);
    return evaluateFiveBetDefense(hand, handTier, position, facing_action, stack_tier);
  }

  // 面对其他复杂行动
  if (facing_action === 'squeeze' || facing_action === 'iso_raise' || facing_action === 'cold_4bet') {
    console.log(`🎯 面对复杂行动: ${facing_action}, 使用防守策略`);
    return getDefenseStrategy(hand, handTier, position, facing_action, stack_tier);
  }

  // 默认弃牌
  console.log(`⚠️ 未识别的行动类型: ${facing_action}, 默认弃牌`);
  return DECISIONS.FOLD;
}

// 🚀 智能3bet决策评估 - 现代GTO的核心
function evaluateThreeBetDecision(hand, handTier, position, facing_action, stack_tier) {
  console.log(`🔥 3bet决策评估: ${handTier}牌, ${position}位置, 面对${facing_action}`);
  
  // 提取原始加注尺寸 (假设格式为 raise_25bb)
  const raiseMatch = facing_action.match(/raise_(\d+(?:\.\d+)?)/);
  const originalRaiseSize = raiseMatch ? parseFloat(raiseMatch[1]) : 2.5;
  
  // 🎯 3bet范围判断 - 基于手牌强度和位置
  const threeBetFrequency = calculateThreeBetFrequency(handTier, position, stack_tier);
  
  if (threeBetFrequency > 0) {
    // 随机决定是否3bet (混合策略)
    if (Math.random() < threeBetFrequency) {
      // 使用现有的精确3bet决策系统
      const threeBetDecision = selectPrecise3BetDecision(handTier, position, stack_tier, originalRaiseSize);
      console.log(`✅ 选择3bet: ${threeBetDecision.amount}BB (${Math.round(threeBetFrequency * 100)}%频率)`);
      return threeBetDecision;
    }
  }
  
  // 🎯 跟注范围判断
  const callFrequency = calculateCallFrequency(handTier, position, stack_tier, originalRaiseSize);
  
  if (callFrequency > 0 && Math.random() < callFrequency) {
    console.log(`✅ 选择跟注 (${Math.round(callFrequency * 100)}%频率)`);
    return {
      ...DECISIONS.CALL,
      reasoning: `${handTier}牌在${position}位置跟注${originalRaiseSize}BB开池 (${Math.round(callFrequency * 100)}%频率)`
    };
  }
  
  // 默认弃牌
  console.log(`❌ 选择弃牌`);
  return {
    ...DECISIONS.FOLD,
    reasoning: `${handTier}牌在${position}位置面对${originalRaiseSize}BB开池，不在3bet/跟注范围内`
  };
}

// 🚀 智能4bet决策评估
function evaluateFourBetDecision(hand, handTier, position, facing_action, stack_tier) {
  console.log(`🔥 4bet决策评估: ${handTier}牌, ${position}位置, 面对3bet`);
  
  // 估算3bet尺寸 (通常9-12BB)
  const threeBetSize = 10; // 标准3bet尺寸
  
  // 🎯 4bet范围判断 - 比3bet更紧
  const fourBetFrequency = calculateFourBetFrequency(handTier, position, stack_tier);
  
  if (fourBetFrequency > 0 && Math.random() < fourBetFrequency) {
    // 使用现有的精确4bet决策系统
    const fourBetDecision = selectPrecise4BetDecision(handTier, position, stack_tier, threeBetSize);
    console.log(`✅ 选择4bet: ${fourBetDecision.amount}BB (${Math.round(fourBetFrequency * 100)}%频率)`);
    return fourBetDecision;
  }
  
  // 🎯 面对3bet的跟注范围 (中等强度牌)
  const callVs3BetFrequency = calculateCallVs3BetFrequency(handTier, position, stack_tier);
  
  if (callVs3BetFrequency > 0 && Math.random() < callVs3BetFrequency) {
    console.log(`✅ 跟注3bet (${Math.round(callVs3BetFrequency * 100)}%频率)`);
    return {
      ...DECISIONS.CALL,
      reasoning: `${handTier}牌在${position}位置跟注3bet (${Math.round(callVs3BetFrequency * 100)}%频率)`
    };
  }
  
  // 默认弃牌
  console.log(`❌ 弃牌面对3bet`);
  return {
    ...DECISIONS.FOLD,
    reasoning: `${handTier}牌在${position}位置面对3bet，不在4bet/跟注范围内`
  };
}

// 🚀 智能5bet决策评估 (面对4bet)
function evaluateFiveBetDecision(hand, handTier, position, facing_action, stack_tier) {
  console.log(`🔥 5bet决策评估: ${handTier}牌, ${position}位置, 面对4bet`);
  
  // 面对4bet主要是弃牌，只有顶级牌继续
  if (handTier === 'PREMIUM' && ['AA', 'KK'].includes(hand)) {
    // AA/KK 可以5bet推进或跟注
    if (stack_tier === 'short') {
      console.log(`✅ 全推面对4bet (浅筹码)`);
      return DECISIONS.ALL_IN;
    } else {
      console.log(`✅ 5bet面对4bet`);
      return DECISIONS.FIVEBET_55BB;
    }
  }
  
  // QQ/AK 有时候跟注4bet
  if ((handTier === 'PREMIUM' && hand === 'QQ') || (handTier === 'STRONG' && ['AKs', 'AKo'].includes(hand))) {
    if (Math.random() < 0.3) { // 30%频率跟注
      console.log(`✅ 跟注4bet (30%频率)`);
      return {
        ...DECISIONS.CALL,
        reasoning: `${hand}在${position}位置30%跟注4bet`
      };
    }
  }
  
  // 默认弃牌
  console.log(`❌ 弃牌面对4bet`);
  return {
    ...DECISIONS.FOLD,
    reasoning: `${handTier}牌面对4bet，弃牌保存筹码`
  };
}

// 🚀 面对5bet的防守
function evaluateFiveBetDefense(hand, handTier, position, facing_action, stack_tier) {
  console.log(`🔥 5bet防守: ${handTier}牌, ${position}位置`);
  
  // 面对5bet只有AA有时候跟注，其他全部弃牌
  if (hand === 'AA') {
    console.log(`✅ AA跟注5bet`);
    return DECISIONS.CALL;
  }
  
  // 所有其他牌弃牌
  console.log(`❌ 弃牌面对5bet`);
  return {
    ...DECISIONS.FOLD,
    reasoning: `面对5bet，只有AA值得跟注`
  };
}

// 开池策略 (根据筹码深度调整)
function getOpeningStrategy(hand, handTier, position, positionIndex, stack_tier) {
  const stackInfo = STACK_TIERS[stack_tier];
  console.log(`🎯 开池策略分析: ${stackInfo.name} (${stackInfo.strategy})`);
  
  // 🔴 超浅筹码策略 (5-15BB) - 纯推弃策略
  if (stack_tier === 'ultra_short') {
    return getUltraShortStackStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🔴 极浅筹码策略 (15-25BB) - 激进推拿策略
  if (stack_tier === 'very_short') {
    return getVeryShortStackStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🔴 浅筹码策略 (25-40BB) - 紧凶策略
  if (stack_tier === 'short') {
    return getShortStackOpeningStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🟡 中浅筹码策略 (40-70BB) - 标准策略
  if (stack_tier === 'medium_shallow') {
    return getMediumShallowStackStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🟡 中等筹码策略 (70-100BB) - 平衡策略
  if (stack_tier === 'medium') {
    return getMediumStackOpeningStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🟡 中深筹码策略 (100-150BB) - 剥削策略
  if (stack_tier === 'medium_deep') {
    return getMediumDeepStackStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🟢 深筹码策略 (150-250BB) - 投机策略
  if (stack_tier === 'deep') {
    return getDeepStackOpeningStrategy(hand, handTier, position, positionIndex);
  }
  
  // 🟢 超深筹码策略 (250BB+) - 隐含赔率策略
  if (stack_tier === 'ultra_deep') {
    return getUltraDeepStackStrategy(hand, handTier, position, positionIndex);
  }

  return DECISIONS.FOLD;
}

// 🚀 新增筹码深度策略函数

// 🔴 超浅筹码策略 (5-15BB) - 纯推弃策略
function getUltraShortStackStrategy(hand, handTier, position, positionIndex) {
  // 超浅筹码只考虑推入或弃牌，不考虑位置细节
  if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
  
  // 后期位置可以推入更多牌
  if (positionIndex >= 4) { // CO/BTN/SB/BB
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (['99', '88', '77', 'ATs', 'A9s', 'KQs', 'KJs'].includes(hand)) return DECISIONS.ALL_IN;
    if (['66', '55', 'A8s', 'A7s', 'KTs', 'QJs'].includes(hand)) return DECISIONS.ALL_IN;
  }
  
  // 早期位置只推premium和strong牌
  if (handTier === 'STRONG' && ['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return DECISIONS.ALL_IN;
  
  return DECISIONS.FOLD;
}

// 🔴 极浅筹码策略 (15-25BB) - 激进推拿策略
function getVeryShortStackStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 (UTG, UTG+1) - 紧一些但仍然激进
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return DECISIONS.ALL_IN;
    if (handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (['TT', '99', 'AQs', 'AQo'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }
  
  // 中期位置 (MP, MP+1) - 扩大推入范围
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM' || handTier === 'STRONG') return DECISIONS.ALL_IN;
    if (['88', '77', 'AJs', 'AJo', 'KQs', 'KQo'].includes(hand)) return DECISIONS.ALL_IN;
    return DECISIONS.FOLD;
  }
  
  // 后期位置 (CO, BTN) - 最宽范围
  if (handTier === 'PREMIUM' || handTier === 'STRONG' || handTier === 'MEDIUM') return DECISIONS.ALL_IN;
  if (['66', '55', '44', 'A9s', 'A8s', 'KJs', 'KTs', 'QJs'].includes(hand)) return DECISIONS.ALL_IN;
  
  return DECISIONS.FOLD;
}

// 🚀 智能开池决策函数 - 使用动态尺寸和混合策略
function getDynamicOpeningDecision(hand, handTier, position, stackTier, frequency = 1.0) {
  // 使用已有的精确加注决策系统
  const baseDecision = selectPreciseRaiseDecision(handTier, position, stackTier, 0, 0);
  
  // 添加混合策略频率
  return {
    ...baseDecision,
    frequency: frequency,
    reasoning: `${handTier}牌在${position}位置动态开池 (${baseDecision.amount}BB, ${Math.round(frequency * 100)}%频率)`
  };
}

// 🚀 智能隔离加注决策函数 - 面对跛入时的动态尺寸
function getDynamicIsolationDecision(hand, handTier, position, stackTier, frequency = 1.0) {
  // 面对跛入的隔离加注通常比开池稍大 (3.5-5BB)
  const baseDecision = selectPreciseRaiseDecision(handTier, position, stackTier, 0, 1); // 1个跛入者
  
  // 隔离加注尺寸调整
  const isolationMultiplier = 1.4; // 比开池大40%
  const adjustedSize = Math.round(baseDecision.amount * isolationMultiplier * 10) / 10;
  
  return {
    action: 'raise',
    amount: adjustedSize,
    frequency: frequency,
    reasoning: `${handTier}牌在${position}位置隔离跛入者 (${adjustedSize}BB, ${Math.round(frequency * 100)}%频率)`
  };
}

// 🟡 中浅筹码策略 (40-70BB) - 标准策略的保守版
function getMediumShallowStackStrategy(hand, handTier, position, positionIndex) {
  // 早期位置 - 标准开池
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow');
    if (handTier === 'STRONG' && ['QQ', 'JJ', 'AKs', 'AKo'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow');
    return DECISIONS.FOLD;
  }
  
  // 中期位置 - 稍微宽松
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM' || handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow');
    if (['TT', '99', 'AQs', 'AQo'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow');
    return DECISIONS.FOLD;
  }
  
  // 后期位置 - 标准范围
  if (handTier === 'PREMIUM' || handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow');
  if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow');
  if (['66', '55', 'A9s', 'KJs', 'QJs'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'medium_shallow', 0.8); // 混合策略
  
  return DECISIONS.FOLD;
}

// 🟡 中深筹码策略 (100-150BB) - 剥削策略
function getMediumDeepStackStrategy(hand, handTier, position, positionIndex) {
  // 可以加入更多投机牌，考虑隐含赔率
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep');
    if (['TT', '99', 'AQs'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep', 0.85); // 混合策略
    return DECISIONS.FOLD;
  }
  
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM' || handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep');
    if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep');
    if (['88', '77', 'A9s', 'KJs'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep', 0.75); // 混合策略
    return DECISIONS.FOLD;
  }
  
  // 后期位置 - 更宽的剥削范围
  if (handTier === 'PREMIUM' || handTier === 'STRONG' || handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep');
  if (['66', '55', '44', '33', '22', 'A8s', 'A7s', 'A6s', 'KTs', 'K9s', 'QTs', 'Q9s', 'JTs', 'J9s'].includes(hand)) {
    return getDynamicOpeningDecision(hand, handTier, position, 'medium_deep', 0.65); // 投机牌混合策略
  }
  
  return DECISIONS.FOLD;
}

// 🟢 超深筹码策略 (250BB+) - 隐含赔率策略
function getUltraDeepStackStrategy(hand, handTier, position, positionIndex) {
  // 超深筹码可以玩更多投机牌，考虑巨大隐含赔率
  if (positionIndex <= 1) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep');
    if (['TT', '99', '88', 'AQs', 'AJs'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep', 0.9); // 混合策略
    // 加入小对子和同花连张
    if (['77', '66', 'JTs', 'T9s', '98s'].includes(hand)) return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep', 0.7); // 投机牌
    return DECISIONS.FOLD;
  }
  
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM' || handTier === 'STRONG' || handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep');
    // 更多投机牌
    if (['55', '44', '33', '22', 'A9s', 'A8s', 'A7s', 'KTs', 'K9s', 'QTs', 'JTs', 'T9s', '98s', '87s'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep', 0.6); // 投机牌混合策略
    }
    return DECISIONS.FOLD;
  }
  
  // 后期位置 - 极宽范围，利用位置和隐含赔率
  if (handTier === 'PREMIUM' || handTier === 'STRONG' || handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep');
  // 几乎所有有潜力的牌
  if (['22', '33', '44', '55', '66', '77', '88', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
       'K8s', 'K7s', 'Q9s', 'Q8s', 'J9s', 'J8s', 'T8s', 'T7s', '97s', '96s', '86s', '85s', '76s', '75s', '65s', '54s'].includes(hand)) {
    return getDynamicOpeningDecision(hand, handTier, position, 'ultra_deep', 0.5); // 极投机牌混合策略
  }
  
  return DECISIONS.FOLD;
}

// 🔴 浅筹码开池策略 (25-40BB) - 推拿为主，避免翻后
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
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'PREMIUM_MEDIUM' && ['ATs', 'KJs', 'QJs', 'JTs', '99'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.85); // 边际牌混合策略
    }
    return DECISIONS.FOLD;
  }

  // 中期位置 (MP, MP+1) - 标准范围，18-22% VPIP  
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'MEDIUM' && ['88', '77', 'A8s', 'A7s', 'A6s', 'A5s'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.75); // 边际牌混合策略
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 (CO, BTN) - 宽范围，28-35% VPIP
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'WEAK' && ['66', '55', '44', '33', '22'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.8); // 小对子混合策略
    }
    // 投机牌在后期位置
    if (handTier === 'SPECULATIVE') return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.7);
    // 额外的同花连牌
    if (['K8s', 'Q8s', 'J8s', 'T8s', '97s', '86s', '75s', '64s', '53s'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.6); // 投机牌混合策略
    }
    return DECISIONS.FOLD;
  }

  // 小盲位置 - 用动态尺寸开池，范围略紧
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'medium');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.9);
    if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'medium', 0.8);
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
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'MEDIUM' && ['88', '77', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.75); // 套牌价值混合策略
    }
    return DECISIONS.FOLD;
  }

  // 中期位置 (MP, MP+1) - 加入更多投机牌和同花连牌
  if (positionIndex <= 3) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'WEAK' && ['66', '55', '44', '33', '22'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.8); // 对子深筹码价值
    }
    return DECISIONS.FOLD;
  }

  // 后期位置 (CO, BTN) - 非常宽的范围，深筹码优势
  if (positionIndex <= 5) {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'WEAK') return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.85);
    if (handTier === 'SPECULATIVE') return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.75);
    // 深筹码可以玩更多边缘牌，寻求隐含赔率
    if (['K7s', 'Q7s', 'J7s', 'T7s', '96s', '85s', '74s', '64s', '53s', '42s'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.55); // 极边缘牌混合策略
    }
    return DECISIONS.FOLD;
  }

  // 小盲位置 - 用动态尺寸开池，范围较宽
  if (position === 'SB') {
    if (handTier === 'PREMIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'STRONG') return getDynamicOpeningDecision(hand, handTier, position, 'deep');
    if (handTier === 'PREMIUM_MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.95);
    if (handTier === 'MEDIUM') return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.85);
    if (handTier === 'WEAK' && ['66', '55', '44', '33', '22'].includes(hand)) {
      return getDynamicOpeningDecision(hand, handTier, position, 'deep', 0.7); // 小对子深筹码价值
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
    if (handTier === 'PREMIUM') {
      return getDynamicIsolationDecision(hand, handTier, position, stack_tier, 0.8); // 强牌混合隔离
    }
    if (handTier === 'STRONG') {
      return getDynamicIsolationDecision(hand, handTier, position, stack_tier, 0.6); // 强牌部分隔离
    }
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
    if (handTier === 'PREMIUM') return getDynamicIsolationDecision(hand, handTier, position, stack_tier);
    if (handTier === 'STRONG') return getDynamicIsolationDecision(hand, handTier, position, stack_tier, 0.85);
    if (handTier === 'MEDIUM') return getDynamicIsolationDecision(hand, handTier, position, stack_tier, 0.7);
    if (handTier === 'WEAK' && ['22', '33', '44', '55', 'A2s', 'A3s', 'A4s', 'A5s'].includes(hand)) {
      return DECISIONS.CALL;
    }
    if (handTier === 'SPECULATIVE') return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  // 深筹码面对跛入 - 更多跟注
  if (stack_tier === 'deep') {
    if (handTier === 'PREMIUM') return getDynamicIsolationDecision(hand, handTier, position, stack_tier);
    if (handTier === 'STRONG') return getDynamicIsolationDecision(hand, handTier, position, stack_tier, 0.8);
    if (handTier === 'MEDIUM') return getDynamicIsolationDecision(hand, handTier, position, stack_tier, 0.6);
    if (handTier === 'WEAK') return DECISIONS.CALL; // 深筹码可以跟注更多弱牌
    if (handTier === 'SPECULATIVE') return DECISIONS.CALL;
    return DECISIONS.FOLD;
  }

  return DECISIONS.FOLD;
}

// 初始化GTO数据
function initializeGTOData() {
  console.log('📊 生成GTO翻前决策表 (包含筹码深度)...');
  
  // 🔥 清除旧的决策表缓存，使用新的混合策略逻辑
  gtoDecisionTable.clear();
  console.log('🧹 清除旧决策缓存，启用混合策略逻辑');

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
  console.log(`🚀 筹码深度扩展: 从3个等级升级到 ${stackTiers.length} 个精细等级`);
  console.log(`📈 场景增长: 从602,880个场景扩展到 ${count} 个场景 (${Math.round(count/602880*100)}%增长)`);
  console.log(`📊 数据表大小: ${gtoDecisionTable.size}`);
  console.log(`🎯 筹码深度细分: ${stackTiers.map(tier => STACK_TIERS[tier].name).join(' | ')}`);
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
  console.log(`📊 筹码层计算: stack_bb=${stack_bb} -> stack_tier=${stack_tier}`);
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

// 🎯 实时对手建模系统 - 集成到GTO决策
/**
 * 对手档案分析器 - 基于历史行动数据构建对手模型
 */
class OpponentModelingEngine {
  constructor() {
    this.opponentProfiles = new Map();
    this.recentActionWeight = 0.3; // 最近行动权重更高
    this.totalActionWeight = 0.7;  // 总体统计权重
  }

  /**
   * 更新对手档案基于最新行动
   * @param {string} playerId - 对手ID
   * @param {Object} action - 行动数据 {action, amount, position, phase}
   * @param {Object} context - 上下文 {potSize, stackSize, opponents}
   */
  updateOpponentProfile(playerId, action, context) {
    if (!this.opponentProfiles.has(playerId)) {
      this.initializeOpponentProfile(playerId);
    }
    
    const profile = this.opponentProfiles.get(playerId);
    
    // 更新基础统计
    profile.totalActions++;
    profile.recentActions.push({
      ...action,
      timestamp: Date.now(),
      context: { ...context }
    });
    
    // 限制历史记录长度
    if (profile.recentActions.length > 50) {
      profile.recentActions.shift();
    }
    
    // 重新计算统计数据
    this.recalculateStatistics(profile);
    
    // 更新倾向性分析
    this.updateTendencyAnalysis(profile);
    
    console.log(`📊 更新对手档案: ${playerId}, VPIP: ${profile.vpip}%, PFR: ${profile.pfr}%, 倾向: ${profile.tendency}`);
  }

  /**
   * 基于对手模型调整GTO决策
   * @param {Object} baseDecision - 基础GTO决策
   * @param {Array} opponentProfiles - 对手档案列表
   * @param {Object} gameContext - 游戏上下文
   */
  adjustDecisionForOpponents(baseDecision, opponentProfiles, gameContext) {
    if (!opponentProfiles || opponentProfiles.length === 0) {
      return baseDecision; // 无对手数据，使用原决策
    }
    
    // 分析对手整体特征
    const opponentAnalysis = this.analyzeOpponentGroup(opponentProfiles);
    console.log(`🎯 对手群体分析:`, opponentAnalysis);
    
    // 基于对手特征调整决策
    const adjustedDecision = { ...baseDecision };
    
    // 1. 调整加注尺寸
    if (baseDecision.action === 'raise') {
      adjustedDecision.amount = this.adjustRaiseSizeForOpponents(
        baseDecision.amount, 
        opponentAnalysis, 
        gameContext
      );
    }
    
    // 2. 调整行动频率
    adjustedDecision.frequency = this.adjustFrequencyForOpponents(
      baseDecision.frequency,
      baseDecision.action,
      opponentAnalysis,
      gameContext
    );
    
    // 3. 更新推理说明
    adjustedDecision.reasoning = this.enhanceReasoningWithOpponentInfo(
      baseDecision.reasoning,
      opponentAnalysis,
      adjustedDecision
    );
    
    // 4. 添加对手建模元数据
    adjustedDecision.opponentModeling = {
      opponentAnalysis,
      adjustmentType: this.getAdjustmentType(baseDecision, adjustedDecision),
      confidenceLevel: this.calculateConfidenceLevel(opponentProfiles)
    };
    
    return adjustedDecision;
  }

  /**
   * 分析对手群体特征
   */
  analyzeOpponentGroup(opponentProfiles) {
    const activeOpponents = opponentProfiles.filter(p => p.recentActions.length >= 3);
    
    if (activeOpponents.length === 0) {
      return {
        dominantType: 'UNKNOWN',
        avgVPIP: 25,
        avgPFR: 18,
        aggression: 1.5,
        tightness: 0.5,
        predictability: 0.5,
        weaknessExploitability: 0.3
      };
    }
    
    // 计算群体平均值
    const avgVPIP = activeOpponents.reduce((sum, p) => sum + p.vpip, 0) / activeOpponents.length;
    const avgPFR = activeOpponents.reduce((sum, p) => sum + p.pfr, 0) / activeOpponents.length;
    const avgAggression = activeOpponents.reduce((sum, p) => sum + p.aggression, 0) / activeOpponents.length;
    const avgTightness = activeOpponents.reduce((sum, p) => sum + p.tightness, 0) / activeOpponents.length;
    
    // 确定主导类型
    const typeDistribution = this.analyzeTendencyDistribution(activeOpponents);
    const dominantType = this.getDominantTendency(typeDistribution);
    
    // 计算可预测性（标准差越小越可预测）
    const vpipVariance = this.calculateVariance(activeOpponents.map(p => p.vpip));
    const predictability = Math.max(0, 1 - (vpipVariance / 400)); // 标准化到0-1
    
    // 计算弱点可利用性
    const weaknessExploitability = this.calculateWeaknessExploitability(activeOpponents);
    
    return {
      dominantType,
      avgVPIP: Math.round(avgVPIP),
      avgPFR: Math.round(avgPFR),
      aggression: Number(avgAggression.toFixed(2)),
      tightness: Number(avgTightness.toFixed(2)),
      predictability: Number(predictability.toFixed(2)),
      weaknessExploitability: Number(weaknessExploitability.toFixed(2)),
      sampleSize: activeOpponents.length
    };
  }

  /**
   * 基于对手特征调整加注尺寸
   */
  adjustRaiseSizeForOpponents(baseAmount, opponentAnalysis, gameContext) {
    let adjustment = 1.0;
    
    // 对抗紧弱对手用更小尺寸
    if (opponentAnalysis.dominantType === 'TP') { // Tight Passive
      adjustment = 0.85; // 减小15%
    }
    
    // 对抗松凶对手用更大尺寸获得价值
    else if (opponentAnalysis.dominantType === 'LAG') { // Loose Aggressive
      adjustment = 1.15; // 增大15%
    }
    
    // 对抗松弱对手用极化尺寸
    else if (opponentAnalysis.dominantType === 'LP') { // Loose Passive
      // 价值手用大尺寸，诈唬手用小尺寸
      adjustment = gameContext.handStrength > 0.7 ? 1.2 : 0.8;
    }
    
    // 对抗高可预测性对手增加利用
    if (opponentAnalysis.predictability > 0.7) {
      adjustment *= 1.1;
    }
    
    const adjustedAmount = baseAmount * adjustment;
    
    console.log(`💰 尺寸调整: ${baseAmount}BB → ${adjustedAmount.toFixed(1)}BB (对手类型: ${opponentAnalysis.dominantType}, 调整倍数: ${adjustment.toFixed(2)})`);
    
    return Math.round(adjustedAmount * 10) / 10;
  }

  /**
   * 基于对手特征调整行动频率
   */
  adjustFrequencyForOpponents(baseFrequency, action, opponentAnalysis, gameContext) {
    let adjustment = 1.0;
    
    // 对抗松对手增加价值下注频率
    if (opponentAnalysis.avgVPIP > 35 && action === 'raise') {
      adjustment = 1.15;
    }
    
    // 对抗紧对手减少诈唬频率
    if (opponentAnalysis.avgVPIP < 20 && gameContext.handStrength < 0.4) {
      adjustment = 0.8;
    }
    
    // 对抗被动对手增加下注频率
    if (opponentAnalysis.aggression < 1.0 && ['bet', 'raise'].includes(action)) {
      adjustment *= 1.1;
    }
    
    // 对抗高度可利用的对手增加利用频率
    if (opponentAnalysis.weaknessExploitability > 0.6) {
      adjustment *= 1.2;
    }
    
    return Math.min(1.0, baseFrequency * adjustment);
  }

  // 辅助方法
  initializeOpponentProfile(playerId) {
    this.opponentProfiles.set(playerId, {
      playerId,
      totalActions: 0,
      vpip: 25,           // 入池率
      pfr: 18,            // 翻前加注率
      aggression: 1.5,    // 激进度
      tightness: 0.5,     // 紧密度
      bluffFrequency: 0.2,
      tendency: 'TAG',    // 默认紧凶
      recentActions: [],
      confidence: 0.1,    // 初始信心很低
      lastUpdate: Date.now()
    });
  }

  recalculateStatistics(profile) {
    const actions = profile.recentActions;
    if (actions.length === 0) return;
    
    // 计算VPIP（入池率）
    const preflopActions = actions.filter(a => a.phase === 'preflop');
    const enteredPot = preflopActions.filter(a => ['call', 'raise', 'all_in'].includes(a.action));
    profile.vpip = preflopActions.length > 0 ? (enteredPot.length / preflopActions.length) * 100 : 25;
    
    // 计算PFR（翻前加注率）
    const preflopRaises = preflopActions.filter(a => ['raise', 'all_in'].includes(a.action));
    profile.pfr = preflopActions.length > 0 ? (preflopRaises.length / preflopActions.length) * 100 : 18;
    
    // 计算激进度
    const aggActions = actions.filter(a => ['raise', 'bet', 'all_in'].includes(a.action));
    const passiveActions = actions.filter(a => ['call', 'check'].includes(a.action));
    profile.aggression = passiveActions.length > 0 ? aggActions.length / passiveActions.length : 1.5;
    
    // 更新信心度
    profile.confidence = Math.min(0.95, actions.length / 30);
  }

  updateTendencyAnalysis(profile) {
    const vpip = profile.vpip;
    const pfr = profile.pfr;
    const aggression = profile.aggression;
    
    // 基于VPIP/PFR分类
    if (vpip >= 25 && pfr >= 18 && aggression >= 1.5) {
      profile.tendency = 'LAG'; // Loose Aggressive
    } else if (vpip < 25 && pfr >= 15 && aggression >= 1.5) {
      profile.tendency = 'TAG'; // Tight Aggressive
    } else if (vpip >= 30 && aggression < 1.2) {
      profile.tendency = 'LP';  // Loose Passive
    } else {
      profile.tendency = 'TP';  // Tight Passive
    }
  }

  analyzeTendencyDistribution(opponents) {
    const distribution = { LAG: 0, TAG: 0, LP: 0, TP: 0 };
    opponents.forEach(p => distribution[p.tendency]++);
    return distribution;
  }

  getDominantTendency(distribution) {
    return Object.keys(distribution).reduce((a, b) => 
      distribution[a] > distribution[b] ? a : b
    );
  }

  calculateVariance(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  }

  calculateWeaknessExploitability(opponents) {
    let exploitability = 0;
    
    opponents.forEach(opponent => {
      // 极端VPIP可利用
      if (opponent.vpip > 50 || opponent.vpip < 10) exploitability += 0.3;
      
      // PFR与VPIP差距过大可利用
      const gap = Math.abs(opponent.vpip - opponent.pfr);
      if (gap > 20) exploitability += 0.2;
      
      // 极端激进度可利用
      if (opponent.aggression > 3.0 || opponent.aggression < 0.5) exploitability += 0.2;
      
      // 高可预测性可利用
      if (opponent.confidence > 0.8) exploitability += 0.3;
    });
    
    return Math.min(1.0, exploitability / opponents.length);
  }

  enhanceReasoningWithOpponentInfo(baseReasoning, opponentAnalysis, adjustedDecision) {
    const opponentInfo = `面对${opponentAnalysis.sampleSize}个${opponentAnalysis.dominantType}对手(VPIP${opponentAnalysis.avgVPIP}% PFR${opponentAnalysis.avgPFR}%)`;
    const exploitInfo = opponentAnalysis.weaknessExploitability > 0.5 ? '，发现可利用弱点' : '';
    
    return `${baseReasoning} | ${opponentInfo}${exploitInfo}`;
  }

  getAdjustmentType(baseDecision, adjustedDecision) {
    if (Math.abs(baseDecision.amount - adjustedDecision.amount) > 0.1) {
      return 'SIZE_ADJUSTED';
    }
    if (Math.abs(baseDecision.frequency - adjustedDecision.frequency) > 0.05) {
      return 'FREQUENCY_ADJUSTED';
    }
    return 'NO_ADJUSTMENT';
  }

  calculateConfidenceLevel(opponentProfiles) {
    if (!opponentProfiles || opponentProfiles.length === 0) return 0.1;
    
    const avgConfidence = opponentProfiles.reduce((sum, p) => 
      sum + (p.confidence || 0.1), 0
    ) / opponentProfiles.length;
    
    return Math.min(0.95, avgConfidence);
  }

  // 获取对手建模统计
  getOpponentModelingStats() {
    const profiles = Array.from(this.opponentProfiles.values());
    
    return {
      totalOpponents: profiles.length,
      averageConfidence: profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length,
      tendencyDistribution: this.analyzeTendencyDistribution(profiles),
      highConfidenceOpponents: profiles.filter(p => p.confidence > 0.7).length
    };
  }
}

// 🚀 集成复杂底池建模到GTO决策系统
function getAdvancedGTODecision(hand, position, actionHistory, activePlayers, stackSize = 100, opponentProfiles = []) {
  console.log(`🏆 启动高级GTO决策分析: ${hand} @ ${position}`);
  
  // 初始化多人底池建模器和对手建模引擎
  const potModeler = new MultiPlayerPotModeler();
  const opponentEngine = new OpponentModelingEngine();
  
  // 分析当前底池结构
  const potStructure = potModeler.analyzeActionSequence(actionHistory, activePlayers);
  
  // 获取手牌分类和基础信息
  const handCategory = getHandTier(hand);
  const stackTier = getStackTier(stackSize);
  const handStrength = calculateHandStrength(hand); // 简化版本
  
  console.log(`🎯 底池分析: ${potStructure.potType}, 复杂度: ${potModeler.calculateComplexityScore().toFixed(2)}`);
  console.log(`📊 底池: ${potStructure.totalPot}BB, 最后加注: ${potStructure.lastRaiseSize}BB, 活跃玩家: ${potStructure.activePlayers.length}`);
  
  // 构建游戏上下文用于对手建模
  const gameContext = {
    handStrength,
    potSize: potStructure.totalPot,
    stackSize,
    position,
    potType: potStructure.potType,
    complexity: potModeler.calculateComplexityScore()
  };
  
  // 根据底池类型选择相应基础决策逻辑
  let baseDecision;
  
  switch (potStructure.potType) {
    case 'unopened':
      // 未开池 - 使用精细化开池策略
      baseDecision = selectPreciseRaiseDecision(handCategory, position, stackTier, potStructure.totalPot, potStructure.activePlayers.length);
      break;
      
    case 'raised':
      // 面对开池 - 使用原有GTO决策 + 精细化3bet
      const originalDecision = getPreflopDecision(hand, position, 'raise_2bb', stackSize);
      if (originalDecision.action === 'raise') {
        // 转换为3bet决策
        const originalRaiser = potModeler.actionHistory.find(a => a.action === 'raise');
        const callers = potModeler.actionHistory.filter(a => a.action === 'call');
        baseDecision = potModeler.get3BetDecisionInMultiWay(
          handCategory, 
          position, 
          originalRaiser?.position || 'UTG', 
          potStructure.lastRaiseSize,
          callers
        );
      } else {
        baseDecision = originalDecision;
      }
      break;
      
    case '3bet':
      // 面对3bet - 使用复杂4bet策略
      const threeBetter = potModeler.actionHistory.findLast(a => a.action === 'raise');
      baseDecision = potModeler.get4BetDecisionInComplexPot(
        handCategory,
        position,
        threeBetter?.position || 'CO',
        potStructure.lastRaiseSize,
        potStructure
      );
      break;
      
    case '4bet':
      // 面对4bet - 使用5bet/全推策略
      baseDecision = potModeler.get5BetOrAllInDecision(
        handCategory,
        position,
        potStructure.lastRaiseSize,
        stackSize,
        potStructure
      );
      break;
      
    case '5bet':
    case 'all_in':
      // 面对5bet/全推 - 只有nuts才继续
      if (handCategory === 'PREMIUM') {
        baseDecision = {
          action: 'call',
          amount: potStructure.lastRaiseSize,
          frequency: 0.9,
          reasoning: `${handCategory}牌面对${potStructure.potType}，nuts级别跟注`,
          potType: potStructure.potType
        };
      } else {
        baseDecision = {
          action: 'fold',
          amount: 0,
          frequency: 1.0,
          reasoning: `${handCategory}牌面对${potStructure.potType}，牌力不足弃牌`,
          potType: 'fold_to_' + potStructure.potType
        };
      }
      break;
      
    default:
      console.warn(`⚠️ 未知底池类型: ${potStructure.potType}, 使用基础GTO策略`);
      baseDecision = getPreflopDecision(hand, position, 'none', stackSize);
      break;
  }
  
  // 🎯 应用对手建模调整 - 这是关键集成点!
  const finalDecision = opponentEngine.adjustDecisionForOpponents(
    baseDecision, 
    opponentProfiles, 
    gameContext
  );
  
  // 添加综合分析元数据
  finalDecision.analysis = {
    handCategory,
    stackTier,
    potStructure: potModeler.getCurrentPotAnalysis(),
    gameContext,
    hasOpponentData: opponentProfiles && opponentProfiles.length > 0,
    decisionFlow: `${potStructure.potType} → base_decision → opponent_adjusted`
  };
  
  console.log(`✅ 最终决策: ${finalDecision.action} ${finalDecision.amount || ''}BB (${finalDecision.reasoning})`);
  
  return finalDecision;
}

// 🎯 频率计算函数 - 实现混合策略核心逻辑

// 🔥 计算3bet频率 (面对开池)
function calculateThreeBetFrequency(handTier, position, stack_tier) {
  const baseFrequencies = {
    // 前位 (UTG, UTG+1, UTG+2) - 更紧的3bet范围
    UTG: { PREMIUM: 0.8, STRONG: 0.3, GOOD: 0.1, MARGINAL: 0.02, WEAK: 0 },
    'UTG+1': { PREMIUM: 0.85, STRONG: 0.35, GOOD: 0.12, MARGINAL: 0.03, WEAK: 0 },
    'UTG+2': { PREMIUM: 0.9, STRONG: 0.4, GOOD: 0.15, MARGINAL: 0.04, WEAK: 0 },
    
    // 中位 (MP, MP+1) - 平衡的3bet范围
    MP: { PREMIUM: 0.95, STRONG: 0.5, GOOD: 0.2, MARGINAL: 0.06, WEAK: 0.01 },
    'MP+1': { PREMIUM: 0.95, STRONG: 0.55, GOOD: 0.25, MARGINAL: 0.08, WEAK: 0.01 },
    
    // 后位 (CO, BTN) - 更宽的3bet范围包含诈唬
    CO: { PREMIUM: 0.98, STRONG: 0.6, GOOD: 0.3, MARGINAL: 0.12, WEAK: 0.03 },
    BTN: { PREMIUM: 1.0, STRONG: 0.7, GOOD: 0.4, MARGINAL: 0.15, WEAK: 0.05 },
    
    // 盲注位 (SB, BB) - 位置劣势补偿
    SB: { PREMIUM: 0.9, STRONG: 0.45, GOOD: 0.18, MARGINAL: 0.05, WEAK: 0.01 },
    BB: { PREMIUM: 0.85, STRONG: 0.4, GOOD: 0.15, MARGINAL: 0.04, WEAK: 0 }
  };
  
  // 筹码深度调整
  const stackAdjustments = {
    ultra_short: 0.6,  // 浅筹码减少3bet，更多推拿
    very_short: 0.7,
    short: 0.8,
    medium_shallow: 0.9,
    medium: 1.0,       // 基准
    medium_deep: 1.1,
    deep: 1.2,         // 深筹码增加3bet，利用隐含赔率
    ultra_deep: 1.3
  };
  
  const baseFreq = baseFrequencies[position]?.[handTier] || 0;
  const stackMultiplier = stackAdjustments[stack_tier] || 1.0;
  
  return Math.min(1.0, baseFreq * stackMultiplier);
}

// 🔥 计算跟注频率 (面对开池)
function calculateCallFrequency(handTier, position, stack_tier, originalRaiseSize) {
  const baseFrequencies = {
    // 前位跟注更紧
    UTG: { PREMIUM: 0.15, STRONG: 0.6, GOOD: 0.7, MARGINAL: 0.3, WEAK: 0.1 },
    'UTG+1': { PREMIUM: 0.12, STRONG: 0.55, GOOD: 0.65, MARGINAL: 0.35, WEAK: 0.12 },
    'UTG+2': { PREMIUM: 0.1, STRONG: 0.5, GOOD: 0.6, MARGINAL: 0.4, WEAK: 0.15 },
    
    // 中位平衡跟注
    MP: { PREMIUM: 0.05, STRONG: 0.4, GOOD: 0.55, MARGINAL: 0.45, WEAK: 0.18 },
    'MP+1': { PREMIUM: 0.05, STRONG: 0.35, GOOD: 0.5, MARGINAL: 0.5, WEAK: 0.2 },
    
    // 后位更宽跟注范围
    CO: { PREMIUM: 0.02, STRONG: 0.3, GOOD: 0.45, MARGINAL: 0.55, WEAK: 0.25 },
    BTN: { PREMIUM: 0, STRONG: 0.25, GOOD: 0.4, MARGINAL: 0.6, WEAK: 0.3 },
    
    // 盲注位获得价格优势
    SB: { PREMIUM: 0.1, STRONG: 0.5, GOOD: 0.6, MARGINAL: 0.5, WEAK: 0.2 },
    BB: { PREMIUM: 0.15, STRONG: 0.55, GOOD: 0.7, MARGINAL: 0.6, WEAK: 0.3 }
  };
  
  // 开池尺寸调整 - 面对更大的开池减少跟注
  const sizeAdjustments = {
    2.2: 1.1,  // 小尺寸开池可以更宽跟注
    2.5: 1.0,  // 标准尺寸
    3.0: 0.9,  // 大尺寸开池收紧跟注
    3.5: 0.8,
    4.0: 0.7
  };
  
  // 筹码深度调整
  const stackAdjustments = {
    ultra_short: 0.5,  // 浅筹码减少跟注，更多推拿
    very_short: 0.6,
    short: 0.7,
    medium_shallow: 0.85,
    medium: 1.0,
    medium_deep: 1.1,  // 深筹码利用隐含赔率更宽跟注
    deep: 1.2,
    ultra_deep: 1.3
  };
  
  const baseFreq = baseFrequencies[position]?.[handTier] || 0;
  const sizeMultiplier = sizeAdjustments[originalRaiseSize] || 
    (originalRaiseSize > 4.0 ? 0.6 : 1.0);
  const stackMultiplier = stackAdjustments[stack_tier] || 1.0;
  
  return Math.min(1.0, baseFreq * sizeMultiplier * stackMultiplier);
}

// 🔥 计算4bet频率 (面对3bet)
function calculateFourBetFrequency(handTier, position, stack_tier) {
  const baseFrequencies = {
    // 前位4bet范围最紧
    UTG: { PREMIUM: 0.7, STRONG: 0.2, GOOD: 0.05, MARGINAL: 0, WEAK: 0 },
    'UTG+1': { PREMIUM: 0.75, STRONG: 0.25, GOOD: 0.08, MARGINAL: 0.01, WEAK: 0 },
    'UTG+2': { PREMIUM: 0.8, STRONG: 0.3, GOOD: 0.1, MARGINAL: 0.02, WEAK: 0 },
    
    // 中位4bet范围
    MP: { PREMIUM: 0.85, STRONG: 0.35, GOOD: 0.12, MARGINAL: 0.03, WEAK: 0.005 },
    'MP+1': { PREMIUM: 0.9, STRONG: 0.4, GOOD: 0.15, MARGINAL: 0.04, WEAK: 0.01 },
    
    // 后位4bet包含更多诈唬
    CO: { PREMIUM: 0.95, STRONG: 0.5, GOOD: 0.2, MARGINAL: 0.06, WEAK: 0.02 },
    BTN: { PREMIUM: 1.0, STRONG: 0.6, GOOD: 0.25, MARGINAL: 0.08, WEAK: 0.03 },
    
    // 盲注位4bet
    SB: { PREMIUM: 0.8, STRONG: 0.3, GOOD: 0.1, MARGINAL: 0.02, WEAK: 0.005 },
    BB: { PREMIUM: 0.75, STRONG: 0.25, GOOD: 0.08, MARGINAL: 0.01, WEAK: 0 }
  };
  
  // 筹码深度调整 - 浅筹码更多4bet-推拿
  const stackAdjustments = {
    ultra_short: 1.5,  // 浅筹码4bet-推拿策略
    very_short: 1.3,
    short: 1.1,
    medium_shallow: 1.0,
    medium: 1.0,       // 基准
    medium_deep: 0.9,  // 深筹码减少4bet频率
    deep: 0.8,
    ultra_deep: 0.7
  };
  
  const baseFreq = baseFrequencies[position]?.[handTier] || 0;
  const stackMultiplier = stackAdjustments[stack_tier] || 1.0;
  
  return Math.min(1.0, baseFreq * stackMultiplier);
}

// 🔥 计算面对3bet的跟注频率
function calculateCallVs3BetFrequency(handTier, position, stack_tier) {
  const baseFrequencies = {
    // 前位面对3bet跟注更紧
    UTG: { PREMIUM: 0.25, STRONG: 0.5, GOOD: 0.3, MARGINAL: 0.1, WEAK: 0 },
    'UTG+1': { PREMIUM: 0.2, STRONG: 0.45, GOOD: 0.35, MARGINAL: 0.12, WEAK: 0.02 },
    'UTG+2': { PREMIUM: 0.15, STRONG: 0.4, GOOD: 0.4, MARGINAL: 0.15, WEAK: 0.03 },
    
    // 中位面对3bet跟注
    MP: { PREMIUM: 0.1, STRONG: 0.35, GOOD: 0.45, MARGINAL: 0.18, WEAK: 0.04 },
    'MP+1': { PREMIUM: 0.08, STRONG: 0.3, GOOD: 0.5, MARGINAL: 0.2, WEAK: 0.05 },
    
    // 后位面对3bet跟注范围最宽
    CO: { PREMIUM: 0.05, STRONG: 0.25, GOOD: 0.55, MARGINAL: 0.25, WEAK: 0.08 },
    BTN: { PREMIUM: 0, STRONG: 0.2, GOOD: 0.6, MARGINAL: 0.3, WEAK: 0.1 },
    
    // 盲注位面对3bet
    SB: { PREMIUM: 0.15, STRONG: 0.4, GOOD: 0.35, MARGINAL: 0.15, WEAK: 0.03 },
    BB: { PREMIUM: 0.2, STRONG: 0.5, GOOD: 0.4, MARGINAL: 0.2, WEAK: 0.05 }
  };
  
  // 筹码深度调整 - 深筹码更愿意跟注3bet利用隐含赔率
  const stackAdjustments = {
    ultra_short: 0.3,  // 浅筹码很少跟注3bet
    very_short: 0.4,
    short: 0.6,
    medium_shallow: 0.8,
    medium: 1.0,       // 基准
    medium_deep: 1.2,  // 深筹码利用隐含赔率
    deep: 1.4,
    ultra_deep: 1.6
  };
  
  const baseFreq = baseFrequencies[position]?.[handTier] || 0;
  const stackMultiplier = stackAdjustments[stack_tier] || 1.0;
  
  return Math.min(1.0, baseFreq * stackMultiplier);
}

// 🔧 辅助函数 - 简化版手牌强度计算
function calculateHandStrength(hand) {
  if (!hand || hand.length !== 2) return 0.5;
  
  // 解析手牌 (例如: "AhKs", "QQ", "A8o")
  let rank1, rank2, suited = false;
  
  if (hand.length === 3 && (hand.endsWith('s') || hand.endsWith('o'))) {
    // 格式: AKs, A8o
    rank1 = hand[0];
    rank2 = hand[1];
    suited = hand[2] === 's';
  } else if (hand.length === 2 && hand[0] === hand[1]) {
    // 格式: AA, KK
    rank1 = rank2 = hand[0];
  } else if (hand.length === 4) {
    // 格式: AhKs
    rank1 = hand[0];
    rank2 = hand[2];
    suited = hand[1] === hand[3];
  } else {
    return 0.5; // 无法解析，返回中等强度
  }
  
  // 转换为数值
  const getValue = (rank) => {
    const values = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14};
    return values[rank] || 7;
  };
  
  const val1 = getValue(rank1);
  const val2 = getValue(rank2);
  const highCard = Math.max(val1, val2);
  const lowCard = Math.min(val1, val2);
  
  let strength = 0;
  
  // 对子
  if (val1 === val2) {
    strength = 0.5 + (highCard / 28); // 对子基础强度50%+
    if (highCard >= 11) strength += 0.2; // JJ+额外奖励
    if (highCard >= 13) strength += 0.1; // KK+额外奖励
  } else {
    // 非对子
    strength = (highCard + lowCard) / 56; // 基于两张牌总值
    
    // 同花奖励
    if (suited) strength += 0.05;
    
    // 连牌奖励
    const gap = highCard - lowCard;
    if (gap <= 4) strength += (5 - gap) * 0.02;
    
    // 高牌奖励
    if (highCard === 14) strength += 0.1; // A
    if (lowCard >= 10) strength += 0.05;  // T+踢脚
  }
  
  return Math.min(1.0, Math.max(0.0, strength));
}

module.exports = {
  initializeGTOData,
  getPreflopDecision,
  getStackTier,
  POSITIONS,
  ACTIONS,
  HAND_TIERS,
  STACK_TIERS,
  DECISIONS,
  // 🧠 智能决策选择函数
  selectOptimalRaiseSize,
  selectPreciseRaiseDecision,
  selectPrecise3BetDecision,
  selectPrecise4BetDecision,
  // 🏆 多人底池建模系统
  MultiPlayerPotModeler,
  getAdvancedGTODecision,
  // 🎯 实时对手建模系统
  OpponentModelingEngine,
  calculateHandStrength
};
