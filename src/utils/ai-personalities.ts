export interface AIPersonality {
  key: string;
  name: string;
  description: string;
  instruction: string;
  // 🔥 新增：动态性格参数
  aggressionLevel: number; // 0-1，攻击性程度
  tightnessLevel: number; // 0-1，紧密性程度
  bluffFrequency: number; // 0-1，虚张声势频率
  adaptability: number; // 0-1，适应性
  unpredictability: number; // 0-1，不可预测性
}

// 🔥 全新设计：动态AI性格系统
export const AI_PERSONALITIES: { [key: string]: AIPersonality } = {
  aggressive: {
    key: 'aggressive',
    name: '激进猛攻型',
    description: '喜欢主动出击，频繁加注施压，但会根据对手调整策略',
    instruction: '你是激进型玩家，偏向主动加注和施压，但要保持理性。根据牌力和位置灵活调整，不要盲目激进。时不时展现不同风格来迷惑对手。',
    aggressionLevel: 0.75,
    tightnessLevel: 0.25,
    bluffFrequency: 0.35,
    adaptability: 0.7,
    unpredictability: 0.6
  },
  conservative: {
    key: 'conservative',
    name: '稳健保守型',
    description: '谨慎选择手牌，重视位置和赔率，偶尔会出其不意地激进',
    instruction: '你是保守型玩家，以稳健为主但不死板。仔细评估手牌和位置，选择合适时机出击。偶尔做一些意外的激进动作来平衡形象。',
    aggressionLevel: 0.35,
    tightnessLevel: 0.65,
    bluffFrequency: 0.15,
    adaptability: 0.6,
    unpredictability: 0.4
  },
  calculated: {
    key: 'calculated',
    name: '数学计算型',
    description: '严格按照概率和赔率做决策，但会混入随机元素避免被读透',
    instruction: '你是数学型玩家，重视概率和赔率计算。根据底池赔率和胜率做决策，但要加入一些随机性和直觉判断来保持神秘感。',
    aggressionLevel: 0.5,
    tightnessLevel: 0.55,
    bluffFrequency: 0.2,
    adaptability: 0.8,
    unpredictability: 0.5
  },
  unpredictable: {
    key: 'unpredictable',
    name: '变化多端型',
    description: '行为模式难以捉摸，经常变换打法，让对手无法适应',
    instruction: '你是变化型玩家，经常改变策略让对手摸不透。有时激进有时保守，关键是要保持逻辑性，不要做出明显不理智的决策。制造混乱但不失控。',
    aggressionLevel: 0.6,
    tightnessLevel: 0.4,
    bluffFrequency: 0.3,
    adaptability: 0.9,
    unpredictability: 0.85
  },
  deceptive: {
    key: 'deceptive',
    name: '心理战术型',
    description: '善于虚张声势和心理战，营造假象误导对手，但把握时机',
    instruction: '你是心理战型玩家，善于通过下注模式和行为来误导对手。适时虚张声势，营造假象，但要选择合适的时机。建立紧密形象后突然变得激进，或反之。',
    aggressionLevel: 0.65,
    tightnessLevel: 0.35,
    bluffFrequency: 0.4,
    adaptability: 0.75,
    unpredictability: 0.7
  },
  balanced: {
    key: 'balanced',
    name: '平衡全能型',
    description: '各种策略运用自如，根据局面灵活调整，是最难对付的对手',
    instruction: '你是平衡型玩家，能够灵活运用各种策略。根据对手、位置、筹码状况等因素调整打法。有时保守有时激进，关键是选择最合适的策略。',
    aggressionLevel: 0.55,
    tightnessLevel: 0.45,
    bluffFrequency: 0.25,
    adaptability: 0.85,
    unpredictability: 0.6
  }
};

// 🔥 新增：动态性格调整函数
export function adjustPersonalityForContext(
  basePersonality: AIPersonality,
  context: {
    chipRatio: number; // 相对筹码量
    position: string; // 位置信息
    phase: string; // 游戏阶段
    recentActions: string[]; // 最近行动
    opponentCount: number; // 对手数量
  }
): AIPersonality {
  const adjusted = { ...basePersonality };
  
  // 根据筹码状况调整
  if (context.chipRatio < 0.3) {
    // 筹码不足时稍微激进一些
    adjusted.aggressionLevel = Math.min(1, adjusted.aggressionLevel + 0.2);
    adjusted.tightnessLevel = Math.max(0, adjusted.tightnessLevel - 0.15);
  } else if (context.chipRatio > 2) {
    // 筹码充足时可以更加激进
    adjusted.aggressionLevel = Math.min(1, adjusted.aggressionLevel + 0.15);
  }
  
  // 根据位置调整
  const isLatePosition = ['截止位', '庄家', '按钮位'].includes(context.position);
  if (isLatePosition) {
    adjusted.aggressionLevel = Math.min(1, adjusted.aggressionLevel + 0.1);
    adjusted.bluffFrequency = Math.min(1, adjusted.bluffFrequency + 0.1);
  }
  
  // 根据游戏阶段调整
  if (context.phase === 'river') {
    // 河牌阶段更加谨慎
    adjusted.tightnessLevel = Math.min(1, adjusted.tightnessLevel + 0.1);
    adjusted.bluffFrequency = Math.max(0, adjusted.bluffFrequency - 0.1);
  }
  
  // 🔥 关键：反侦察机制 - 根据最近行动调整
  const recentAggressive = context.recentActions.filter(a => 
    a.includes('加注') || a.includes('all-in')
  ).length;
  
  const recentPassive = context.recentActions.filter(a => 
    a.includes('跟注') || a.includes('过牌')
  ).length;
  
  // 如果最近太激进，适当收敛
  if (recentAggressive >= 3) {
    adjusted.aggressionLevel = Math.max(0, adjusted.aggressionLevel - 0.2);
    adjusted.tightnessLevel = Math.min(1, adjusted.tightnessLevel + 0.15);
  }
  
  // 如果最近太被动，适当激进
  if (recentPassive >= 3) {
    adjusted.aggressionLevel = Math.min(1, adjusted.aggressionLevel + 0.15);
    adjusted.tightnessLevel = Math.max(0, adjusted.tightnessLevel - 0.1);
  }
  
  // 增加随机性因子防止被完全预测
  const randomFactor = 0.15;
  adjusted.aggressionLevel += (Math.random() - 0.5) * randomFactor;
  adjusted.tightnessLevel += (Math.random() - 0.5) * randomFactor;
  adjusted.bluffFrequency += (Math.random() - 0.5) * randomFactor * 0.5;
  
  // 确保值在合理范围内
  adjusted.aggressionLevel = Math.max(0, Math.min(1, adjusted.aggressionLevel));
  adjusted.tightnessLevel = Math.max(0, Math.min(1, adjusted.tightnessLevel));
  adjusted.bluffFrequency = Math.max(0, Math.min(1, adjusted.bluffFrequency));
  
  return adjusted;
}

// 🔥 新增：高级伪装策略
export function generateDeceptionStrategy(personality: AIPersonality): {
  shouldBluff: boolean;
  shouldSlowPlay: boolean;
  shouldTrap: boolean;
  aggressionModifier: number;
} {
  const random = Math.random();
  
  // 基于性格和随机性生成伪装策略
  const shouldBluff = random < personality.bluffFrequency * personality.unpredictability;
  const shouldSlowPlay = random < (1 - personality.aggressionLevel) * 0.3;
  const shouldTrap = random < personality.adaptability * 0.2;
  
  // 计算攻击性修正因子
  let aggressionModifier = 0;
  if (shouldBluff) aggressionModifier += 0.3;
  if (shouldSlowPlay) aggressionModifier -= 0.2;
  if (shouldTrap) aggressionModifier -= 0.4;
  
  return {
    shouldBluff,
    shouldSlowPlay,
    shouldTrap,
    aggressionModifier: Math.max(-0.5, Math.min(0.5, aggressionModifier))
  };
}

// 获取随机性格
export function getRandomPersonality(): AIPersonality {
  const personalities = Object.values(AI_PERSONALITIES);
  const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];
  
  // 🔥 新增：为每个实例添加额外的随机变化
  return {
    ...randomPersonality,
    aggressionLevel: Math.max(0, Math.min(1, 
      randomPersonality.aggressionLevel + (Math.random() - 0.5) * 0.3
    )),
    tightnessLevel: Math.max(0, Math.min(1, 
      randomPersonality.tightnessLevel + (Math.random() - 0.5) * 0.3
    )),
    bluffFrequency: Math.max(0, Math.min(1, 
      randomPersonality.bluffFrequency + (Math.random() - 0.5) * 0.2
    )),
    unpredictability: Math.max(0, Math.min(1,
      randomPersonality.unpredictability + (Math.random() - 0.5) * 0.2
    ))
  };
}

// 根据key获取性格
export function getPersonalityByKey(key: string): AIPersonality | undefined {
  return AI_PERSONALITIES[key];
}

// 🔥 新增：性格演化系统 - 根据游戏结果动态调整
export function evolvePersonality(
  personality: AIPersonality,
  gameResults: {
    wins: number;
    losses: number;
    totalHands: number;
    profitability: number; // 盈利情况 -1 to 1
  }
): AIPersonality {
  const evolved = { ...personality };
  
  // 如果盈利良好，加强当前策略
  if (gameResults.profitability > 0.2) {
    evolved.adaptability = Math.min(1, evolved.adaptability + 0.05);
  }
  
  // 如果亏损严重，调整策略
  if (gameResults.profitability < -0.3) {
    // 变得更加谨慎
    evolved.tightnessLevel = Math.min(1, evolved.tightnessLevel + 0.1);
    evolved.bluffFrequency = Math.max(0, evolved.bluffFrequency - 0.05);
    // 增加不可预测性
    evolved.unpredictability = Math.min(1, evolved.unpredictability + 0.1);
  }
  
  return evolved;
}

// 🔥 新增：获取性格表现描述
export function getPersonalityDescription(personality: AIPersonality): string {
  const traits = [];
  
  if (personality.aggressionLevel > 0.7) traits.push("高度激进");
  else if (personality.aggressionLevel > 0.5) traits.push("适度激进");
  else if (personality.aggressionLevel > 0.3) traits.push("谨慎保守");
  else traits.push("极度保守");
  
  if (personality.unpredictability > 0.7) traits.push("变化莫测");
  else if (personality.unpredictability > 0.5) traits.push("灵活多变");
  else traits.push("相对稳定");
  
  if (personality.bluffFrequency > 0.4) traits.push("善于虚张声势");
  else if (personality.bluffFrequency > 0.2) traits.push("偶尔虚张声势");
  else traits.push("很少虚张声势");
  
  return traits.join(", ");
}