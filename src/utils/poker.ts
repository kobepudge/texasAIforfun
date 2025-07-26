import { GameContext } from "../types/gto-poker.ts";
import {
    ActionHistoryItem,
    Card,
    GameState,
    HandRanking,
    Message,
    PersonalityAnalysis,
    Player,
    PlayerBehavior,
    Rank,
    Suit,
} from "../types/poker.ts";
import { HandHistoryManager, PlayerNotesManager } from "./player-notes.ts";
import { RealtimeAISystem } from "./realtime-ai-system.ts";

// 🚀 AI上下文缓存 - 简化版内置实现
class SimpleAICache {
  private static instance: SimpleAICache;
  private playerProfiles: Map<string, any> = new Map();
  private gameContexts: Map<string, any> = new Map();

  public static getInstance(): SimpleAICache {
    if (!SimpleAICache.instance) {
      SimpleAICache.instance = new SimpleAICache();
    }
    return SimpleAICache.instance;
  }

  public updatePlayerProfile(playerId: string, action: string, amount: number, phase: string): void {
    const profile = this.playerProfiles.get(playerId) || { actions: [], lastUpdate: Date.now() };
    profile.actions.push({ action, amount, phase, timestamp: Date.now() });
    profile.lastUpdate = Date.now();

    // 保持最近20个行动
    if (profile.actions.length > 20) {
      profile.actions = profile.actions.slice(-20);
    }

    this.playerProfiles.set(playerId, profile);
    console.log(`🧠 更新玩家档案: ${playerId}, 行动: ${action}`);
  }

  public getPlayerProfile(playerId: string): any {
    return this.playerProfiles.get(playerId);
  }

  public cacheGameContext(gameState: GameState, playerId: string, context: any): void {
    const key = `${gameState.phase}_${gameState.pot}_${playerId}`;
    this.gameContexts.set(key, { ...context, timestamp: Date.now() });
    console.log(`💾 缓存游戏上下文: ${key}`);
  }

  public getGameContext(gameState: GameState, playerId: string): any {
    const key = `${gameState.phase}_${gameState.pot}_${playerId}`;
    const cached = this.gameContexts.get(key);
    if (cached && Date.now() - cached.timestamp < 30000) { // 30秒TTL
      console.log(`🎯 命中游戏上下文缓存: ${key}`);
      return cached;
    }
    return null;
  }
}

// 获取阶段文本
export function getPhaseText(phase: string): string {
  switch (phase) {
    case 'preflop': return '翻牌前';
    case 'flop': return '翻牌';
    case 'turn': return '转牌';
    case 'river': return '河牌';
    case 'showdown': return '摊牌';
    default: return phase;
  }
}

// 获取牌的数值（用于比较）
export function getCardValue(rank: Rank): number {
  switch (rank) {
    case "2": return 2;
    case "3": return 3;
    case "4": return 4;
    case "5": return 5;
    case "6": return 6;
    case "7": return 7;
    case "8": return 8;
    case "9": return 9;
    case "10": return 10;
    case "J": return 11;
    case "Q": return 12;
    case "K": return 13;
    case "A": return 14;
  }
}

// 获取位置名称 - 支持9人桌
export function getPositionName(player: Player, gameState: GameState): string {
  if (player.isDealer) {
    return "Button (BTN)";
  } else if (player.isSmallBlind) {
    return "Small Blind (SB)";
  } else if (player.isBigBlind) {
    return "Big Blind (BB)";
  } else {
    // 对于其他位置，计算相对于庄家的位置
    const dealerIndex = gameState.dealerIndex;
    const playerIndex = player.position;
    let relativePosition = (playerIndex - dealerIndex + gameState.players.length) % gameState.players.length;
    
    // 根据玩家数量确定位置命名
    if (gameState.players.length === 9) {
      // 9人桌的标准位置命名
      switch (relativePosition) {
        case 0: return "Button (BTN)";
        case 1: return "Small Blind (SB)";
        case 2: return "Big Blind (BB)";
        case 3: return "Under The Gun (UTG)";
        case 4: return "UTG+1";
        case 5: return "UTG+2";
        case 6: return "Middle Position (MP)";
        case 7: return "MP+1";
        case 8: return "Cut-off (CO)";
        default: return `位置${playerIndex}`;
      }
    } else if (gameState.players.length === 10) {
      // 10人桌的位置命名（保持兼容性）
      switch (relativePosition) {
        case 0: return "Button (BTN)";
        case 1: return "Small Blind (SB)";
        case 2: return "Big Blind (BB)";
        case 3: return "Under The Gun (UTG)";
        case 4: return "UTG+1";
        case 5: return "UTG+2";
        case 6: return "Middle Position (MP)";
        case 7: return "MP+1";
        case 8: return "Cut-off (CO)";
        case 9: return "Button (BTN)";
        default: return `位置${playerIndex}`;
      }
    } else {
      // 6人桌的位置命名（保持兼容性）
      switch (relativePosition) {
        case 0: return "Button (BTN)";
        case 1: return "Small Blind (SB)";
        case 2: return "Big Blind (BB)";
        case 3: return "Under The Gun (UTG)";
        case 4: return "Middle Position (MP)";
        case 5: return "Cut-off (CO)";
        default: return `位置${playerIndex}`;
      }
    }
  }
}

// 记录玩家行为
export function recordPlayerBehavior(
  player: Player,
  action: string,
  amount: number | undefined,
  potSize: number,
  phase: string,
  handStrength: number,
  gameState: GameState,
): PlayerBehavior {
  const positionName = getPositionName(player, gameState);
  const betFacingRatio = amount ? amount / Math.max(potSize, 1) : 0;

  return {
    phase: phase as any,
    handStrength,
    action,
    amount,
    potSize,
    position: positionName,
    betFacingRatio,
    timestamp: Date.now(),
  };
}

// 分析玩家行为模式并动态评估性格
export function analyzePlayerPersonality(player: Player): PersonalityAnalysis {
  const behaviors = player.behaviorHistory;
  if (behaviors.length < 3) {
    return {
      observed: "数据不足",
      confidence: 0.1,
      traits: {
        aggression: 0,
        tightness: 0,
        bluffFrequency: 0,
        predictability: 0.5,
        adaptability: 0.5,
      },
      recentTrends: "需要更多观察",
    };
  }

  const recentBehaviors = behaviors.slice(-10);
  const raiseCalls = recentBehaviors.filter(b => b.action.includes("加注") || b.action === "all-in").length;
  const passiveCalls = recentBehaviors.filter(b => b.action === "跟注" || b.action === "过牌").length;
  const aggression = (raiseCalls - passiveCalls) / recentBehaviors.length;

  const folds = recentBehaviors.filter(b => b.action === "弃牌").length;
  const tightness = (folds / recentBehaviors.length) * 2 - 1;

  const weakHandRaises = recentBehaviors.filter(b => 
    (b.action.includes("加注") || b.action === "all-in") && b.handStrength <= 2
  ).length;
  const totalWeakHands = recentBehaviors.filter(b => b.handStrength <= 2).length;
  const bluffFrequency = totalWeakHands > 0 ? weakHandRaises / totalWeakHands : 0;

  const actionVariety = new Set(recentBehaviors.map(b => b.action)).size;
  const predictability = 1 - actionVariety / 5;

  const phaseActions = new Map();
  recentBehaviors.forEach(b => {
    if (!phaseActions.has(b.phase)) phaseActions.set(b.phase, new Set());
    phaseActions.get(b.phase).add(b.action);
  });
  const adaptability = phaseActions.size > 1 
    ? Array.from(phaseActions.values()).reduce((acc, actions) => acc + actions.size, 0) / (phaseActions.size * 3)
    : 0.5;

  let observed = "未知";
  let confidence = 0.6;

  if (aggression > 0.3 && bluffFrequency > 0.3) {
    observed = "激进虚张声势型";
    confidence = 0.8;
  } else if (aggression > 0.2) {
    observed = "主动进攻型";
    confidence = 0.7;
  } else if (tightness > 0.3) {
    observed = "保守稳健型";
    confidence = 0.7;
  } else if (predictability < 0.3) {
    observed = "变化多端型";
    confidence = 0.6;
  } else if (Math.abs(aggression) < 0.1 && Math.abs(tightness) < 0.1) {
    observed = "数学计算型";
    confidence = 0.6;
  }

  const recent5 = behaviors.slice(-5);
  const recentAggression = recent5.filter(b => b.action.includes("加注") || b.action === "all-in").length;
  const recentFolds = recent5.filter(b => b.action === "弃牌").length;

  let recentTrends = "";
  if (recentAggression >= 3) {
    recentTrends = "最近表现得更加激进";
  } else if (recentFolds >= 3) {
    recentTrends = "最近表现得更加保守";
  } else {
    recentTrends = "最近行为相对平衡";
  }

  return {
    observed,
    confidence,
    traits: {
      aggression: Math.max(-1, Math.min(1, aggression)),
      tightness: Math.max(-1, Math.min(1, tightness)),
      bluffFrequency: Math.max(0, Math.min(1, bluffFrequency)),
      predictability: Math.max(0, Math.min(1, predictability)),
      adaptability: Math.max(0, Math.min(1, adaptability)),
    },
    recentTrends,
  };
}

// 生成对手分析报告
export function generateOpponentAnalysis(player: Player): string {
  if (!player.personalityAnalysis || player.behaviorHistory.length < 3) {
    return `${player.name}[数据不足，需要更多观察]`;
  }

  const analysis = player.personalityAnalysis;
  const traits = analysis.traits;

  let report = `${player.name}[${analysis.observed}, 可信度:${Math.round(analysis.confidence * 100)}%] - `;

  const characteristics = [];
  if (traits.aggression > 0.3) characteristics.push("喜欢加注");
  if (traits.aggression < -0.3) characteristics.push("偏好被动");
  if (traits.tightness > 0.3) characteristics.push("频繁弃牌");
  if (traits.tightness < -0.3) characteristics.push("跟注��极");
  if (traits.bluffFrequency > 0.4) characteristics.push("经常虚张声势");
  if (traits.predictability > 0.7) characteristics.push("行为可预测");
  if (traits.adaptability > 0.6) characteristics.push("策略多变");

  report += characteristics.join(", ");
  if (analysis.recentTrends !== "最近行为相对平衡") {
    report += ` (${analysis.recentTrends})`;
  }

  return report;
}

// 创建标准52张牌
export function createDeck(): Card[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// 洗牌
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 格式化牌显示
export function formatCard(card: Card): string {
  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

// 格式化手牌
export function formatHand(cards: Card[]): string {
  return cards.map(formatCard).join(", ");
}

// 检查是否为顺子
function checkStraight(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] - 1) {
      // 检查A-2-3-4-5的特殊顺子
      if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        return true;
      }
      return false;
    }
  }
  return true;
}

// 获取所有5张牌的组合
function getCombinations(cards: Card[], size: number): Card[][] {
  if (size > cards.length) return [];
  if (size === 1) return cards.map(card => [card]);

  const combinations: Card[][] = [];
  for (let i = 0; i <= cards.length - size; i++) {
    const head = cards[i];
    const tail = cards.slice(i + 1);
    const tailCombinations = getCombinations(tail, size - 1);
    for (const combo of tailCombinations) {
      combinations.push([head, ...combo]);
    }
  }
  return combinations;
}

// 评估5张牌的手牌强度
function evaluateFiveCards(cards: Card[]): HandRanking {
  const sortedCards = cards.sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank));
  const isFlush = cards.every(card => card.suit === cards[0].suit);
  const values = sortedCards.map(card => getCardValue(card.rank));
  const isStraight = checkStraight(values);

  const rankCounts: { [key: string]: number } = {};
  sortedCards.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const ranks = Object.keys(rankCounts).sort((a, b) => {
    const countA = rankCounts[a];
    const countB = rankCounts[b];
    if (countA !== countB) {
      return countB - countA; // 先按出现次数排序
    }
    return getCardValue(b as Rank) - getCardValue(a as Rank); // 再按牌值排序
  });

  // 皇家同花顺
  if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
    return { 
      rank: 9, 
      name: "皇家同花顺", 
      cards: sortedCards, 
      kickers: [],
      primaryValue: 0,
      secondaryValue: 0
    };
  }

  // 同花顺
  if (isFlush && isStraight) {
    return { 
      rank: 8, 
      name: "同花顺", 
      cards: sortedCards, 
      kickers: [],
      primaryValue: values[0],
      secondaryValue: 0
    };
  }

  // 四条
  if (counts[0] === 4) {
    const fourKindRank = ranks[0];
    const kicker = ranks[1];
    return { 
      rank: 7, 
      name: "四条", 
      cards: sortedCards, 
      kickers: [kicker],
      primaryValue: getCardValue(fourKindRank as Rank),
      secondaryValue: getCardValue(kicker as Rank)
    };
  }

  // 葫芦
  if (counts[0] === 3 && counts[1] === 2) {
    const threeKindRank = ranks[0];
    const pairRank = ranks[1];
    return { 
      rank: 6, 
      name: "葫芦", 
      cards: sortedCards, 
      kickers: [],
      primaryValue: getCardValue(threeKindRank as Rank),
      secondaryValue: getCardValue(pairRank as Rank)
    };
  }

  // 同花
  if (isFlush) {
    const kickers = ranks.slice(0, 5);
    return { 
      rank: 5, 
      name: "同花", 
      cards: sortedCards, 
      kickers,
      primaryValue: getCardValue(ranks[0] as Rank),
      secondaryValue: getCardValue(ranks[1] as Rank)
    };
  }

  // 顺子
  if (isStraight) {
    return { 
      rank: 4, 
      name: "顺子", 
      cards: sortedCards, 
      kickers: [],
      primaryValue: values[0],
      secondaryValue: 0
    };
  }

  // 三条
  if (counts[0] === 3) {
    const threeKindRank = ranks[0];
    const kickers = ranks.slice(1, 3);
    return { 
      rank: 3, 
      name: "三条", 
      cards: sortedCards, 
      kickers,
      primaryValue: getCardValue(threeKindRank as Rank),
      secondaryValue: getCardValue(kickers[0] as Rank)
    };
  }

  // 两对
  if (counts[0] === 2 && counts[1] === 2) {
    const higherPair = ranks[0];
    const lowerPair = ranks[1];
    const kicker = ranks[2];
    return { 
      rank: 2, 
      name: "两对", 
      cards: sortedCards, 
      kickers: [kicker],
      primaryValue: getCardValue(higherPair as Rank),
      secondaryValue: getCardValue(lowerPair as Rank)
    };
  }

  // 一对
  if (counts[0] === 2) {
    const pairRank = ranks[0];
    const kickers = ranks.slice(1, 4);
    return { 
      rank: 1, 
      name: "一对", 
      cards: sortedCards, 
      kickers,
      primaryValue: getCardValue(pairRank as Rank),
      secondaryValue: getCardValue(kickers[0] as Rank)
    };
  }

  // 高牌
  const kickers = ranks.slice(0, 5);
  return { 
    rank: 0, 
    name: "高牌", 
    cards: sortedCards, 
    kickers,
    primaryValue: getCardValue(ranks[0] as Rank),
    secondaryValue: getCardValue(ranks[1] as Rank)
  };
}

// 比较两个手牌，返回 1 表示 hand1 更大，-1 表示 hand2 更大，0 表示平局
function compareHands(hand1: HandRanking, hand2: HandRanking): number {
  // 先比较牌型等级
  if (hand1.rank !== hand2.rank) {
    return hand1.rank > hand2.rank ? 1 : -1;
  }

  // 牌型相同，比较主要牌值
  if (hand1.primaryValue !== hand2.primaryValue) {
    return hand1.primaryValue! > hand2.primaryValue! ? 1 : -1;
  }

  // 主要牌值相同，比较次要牌值
  if (hand1.secondaryValue !== hand2.secondaryValue) {
    return hand1.secondaryValue! > hand2.secondaryValue! ? 1 : -1;
  }

  // 比较踢脚牌
  for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
    const kicker1 = hand1.kickers[i] ? getCardValue(hand1.kickers[i] as Rank) : 0;
    const kicker2 = hand2.kickers[i] ? getCardValue(hand2.kickers[i] as Rank) : 0;
    
    if (kicker1 !== kicker2) {
      return kicker1 > kicker2 ? 1 : -1;
    }
  }

  return 0; // 完全平局
}

// 完整的德扑手牌评估
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandRanking {
  const allCards = [...holeCards, ...communityCards];
  const sortedCards = allCards.sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank));

  const combinations = getCombinations(sortedCards, 5);
  let bestHand: HandRanking = {
    rank: 0,
    name: "高牌",
    cards: [],
    kickers: [],
    primaryValue: 0,
    secondaryValue: 0
  };

  for (const combo of combinations) {
    const handRank = evaluateFiveCards(combo);
    if (compareHands(handRank, bestHand) > 0) {
      bestHand = handRank;
    }
  }

  return bestHand;
}

// 检查是否应该转换阶段 - 符合德州扑克规则
export function shouldTransitionPhase(gameState: GameState): boolean {
  console.log(`[阶段检查] 当前阶段: ${gameState.phase}`);
  
  const activePlayers = gameState.players.filter(p => !p.isFolded && p.isActive);
  console.log(`[阶段检查] 活跃玩家数量: ${activePlayers.length}`);
  
  if (activePlayers.length <= 1) {
    console.log(`[阶段检查] 只剩${activePlayers.length}个玩家，应该立即结束`);
    return false;
  }
  
  const playersCanAct = activePlayers.filter(p => !p.isAllIn);
  const allInPlayers = activePlayers.filter(p => p.isAllIn);
  
  console.log(`[阶段检查] 可行动玩家数量: ${playersCanAct.length}, All-in玩家数量: ${allInPlayers.length}`);
  
  if (playersCanAct.length === 0) {
    console.log(`[阶段检查] 所有玩家都已全押，启用快速发牌模式直接到摊牌`);
    return true;
  }
  
  const allPlayersActed = playersCanAct.every(p => p.hasActed);
  console.log(`[阶段检查] 所有可行动玩家是否都已行动: ${allPlayersActed}`);
  console.log(`[阶段检查] 可行动玩家行动状态:`, playersCanAct.map(p => ({
    name: p.name,
    hasActed: p.hasActed,
    currentBet: p.currentBet,
    chips: p.chips
  })));

  // 🚀 关键修复：如果没有玩家行动过，绝对不能转换阶段
  if (!allPlayersActed) {
    console.log(`[阶段检查] 还有玩家未行动，不应转换阶段`);
    return false;
  }

  // 🚀 关键检查：确保至少有一个玩家真正行动过
  const hasAnyPlayerActed = playersCanAct.some(p => p.hasActed);
  if (!hasAnyPlayerActed) {
    console.log(`[阶段检查] 没有任何玩家行动过，不应转换阶段`);
    return false;
  }

  // 🚀 额外检查：如果所有玩家都没有行动且下注都为0，说明阶段刚开始
  const allPlayersNoAction = playersCanAct.every(p => !p.hasActed);
  const allBetsZero = playersCanAct.every(p => p.currentBet === 0);
  if (allPlayersNoAction && allBetsZero) {
    console.log(`[阶段检查] 所有玩家都未行动且下注为0，阶段刚开始，不应转换`);
    return false;
  }
  
  const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
  const betsBalanced = activePlayers.every(p => 
    p.currentBet === maxBet || p.isAllIn || p.chips === 0
  );
  
  console.log(`[阶段检查] 最高下注: ${maxBet}, 下注是否平衡: ${betsBalanced}`);
  console.log(`[阶段检查] 各玩家下注详情:`, activePlayers.map(p => ({
    name: p.name,
    currentBet: p.currentBet,
    isAllIn: p.isAllIn,
    chips: p.chips,
    balanced: p.currentBet === maxBet || p.isAllIn || p.chips === 0
  })));
  
  if (!betsBalanced) {
    console.log(`[阶段检查] 下注不平衡，不应转换阶段`);
    return false;
  }
  
  console.log(`[阶段检查] ✅ 满足转换条件：所有可行动玩家已行动且下注平衡`);
  return true;
}

// 添加行动到历史记录
export function addActionToHistory(
  gameState: GameState,
  playerName: string,
  action: string,
  amount?: number,
): ActionHistoryItem[] {
  const newAction: ActionHistoryItem = {
    playerName,
    action,
    amount,
    phase: gameState.phase,
    timestamp: Date.now(),
  };
  
  return [...gameState.actionHistory, newAction];
}

// 计算边池
export function calculateSidePots(players: Player[]): any[] {
  const sidePots = [];
  const eligiblePlayers = players.filter(p => p.totalBet > 0);
  
  if (eligiblePlayers.length === 0) return [];
  
  eligiblePlayers.sort((a, b) => a.totalBet - b.totalBet);
  
  let previousBet = 0;
  for (let i = 0; i < eligiblePlayers.length; i++) {
    const currentBet = eligiblePlayers[i].totalBet;
    if (currentBet > previousBet) {
      const potAmount = (currentBet - previousBet) * (eligiblePlayers.length - i);
      const eligibleForThisPot = eligiblePlayers.slice(i);
      
      sidePots.push({
        amount: potAmount,
        eligiblePlayers: eligibleForThisPot,
      });
      
      previousBet = currentBet;
    }
  }
  
  return sidePots;
}

// 确定获胜者
export function determineWinners(players: Player[], communityCards: Card[]): any[] {
  const activePlayers = players.filter(p => !p.isFolded && p.isActive);
  
  console.log(`[获胜者判定] 活跃玩家数量: ${activePlayers.length}`);
  
  if (activePlayers.length === 0) return [];
  if (activePlayers.length === 1) {
    console.log(`[获胜者判定] 只有一个玩家，${activePlayers[0].name} 获胜`);
    return [{
      winners: activePlayers,
      handRanking: { rank: 10, name: '其他玩家弃牌', cards: [], kickers: [] }
    }];
  }
  
  // 评估每个玩家的手牌
  const playerHands = activePlayers.map(player => {
    const handRanking = evaluateHand(player.holeCards, communityCards);
    console.log(`[获胜者判定] ${player.name}: ${handRanking.name}, 主要牌值: ${handRanking.primaryValue}, 次要牌值: ${handRanking.secondaryValue}, 踢脚牌: ${handRanking.kickers.join(',')}`);
    return {
      player,
      handRanking
    };
  });
  
  // 按手牌强度排序
  playerHands.sort((a, b) => compareHands(b.handRanking, a.handRanking));
  
  // 找到最强手牌的玩家们（可能有平局）
  const bestHand = playerHands[0].handRanking;
  const winners = playerHands.filter(ph => compareHands(ph.handRanking, bestHand) === 0).map(ph => ph.player);
  
  console.log(`[获胜者判定] 获胜者: ${winners.map(w => w.name).join(', ')}`);
  
  return [{
    winners,
    handRanking: bestHand
  }];
}

// 🔥 极致增强的智能文本提取决策 - 与GTO AI系统保持一致
export function extractDecisionFromText(
  text: string,
  gameState: GameState,
  player: Player,
): { action: string; amount?: number } | null {
  console.log(`🔍 ===== JSON解析开始 =====`);
  console.log(`👤 玩家: ${player.name}`);
  console.log(`📝 原始文本长度: ${text.length}`);
  console.log(`📄 完整原始文本:`, text);

  // 清理文本
  const cleanText = text.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`🧹 清理后文本:`, cleanText);

  // 方法1: 提取markdown代码块中的JSON - 增强版
  const markdownPatterns = [
    /```json\s*(\{[\s\S]*?\})\s*```/gi,
    /```\s*(\{[\s\S]*?\})\s*```/gi,
    /`\`\`json\s*(\{[\s\S]*?\})\s*`\`\`/gi,
    /`\`\`\s*(\{[\s\S]*?\})\s*`\`\`/gi,
    // 新增：处理单行JSON
    /```json\s*(\{[^}]*\})\s*```/gi,
    /```\s*(\{[^}]*\})\s*```/gi
  ];

  for (const pattern of markdownPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        try {
          let jsonStr = match[1].trim();

          // 🔧 JSON预处理 - 修复常见格式问题
          jsonStr = jsonStr
            .replace(/'/g, '"')  // 单引号转双引号
            .replace(/(\w+):/g, '"$1":')  // 属性名加引号
            .replace(/,\s*}/g, '}')  // 移除尾随逗号
            .replace(/,\s*]/g, ']'); // 移除数组尾随逗号

          console.log(`📋 提取到markdown JSON:`, jsonStr);
          const decision = JSON.parse(jsonStr);
          console.log(`✅ Markdown JSON解析成功:`, decision);
          
          if (decision.action && ["fold", "check", "call", "bet", "raise", "all-in"].includes(decision.action)) {
            // 将bet映射为raise以保持兼容性
            if (decision.action === "bet") {
              decision.action = "raise";
            }
            return {
              action: decision.action,
              amount: decision.amount || 0
            };
          }
        } catch (e) {
          console.log(`❌ 传统Markdown JSON解析失败:`, e.message);
        }
      }
    }
  }

  // 方法2: 使用增强的JSON解析
  console.log(`🔧 尝试增强JSON解析...`);
  const enhancedResult = parseOptimizedDecisionJSON(text);
  if (enhancedResult) {
    console.log(`✅ 增强JSON解析成功:`, enhancedResult);
    return enhancedResult;
  }

  // 方法3: 提取标准JSON对象（备用）
  const jsonPatterns = [
    /\{[\s\S]*?"action"[\s\S]*?\}/gi,
    /\{[\s\S]*?"reasoning"[\s\S]*?\}/gi,
    /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi,
    /\{[\s\S]*?\}/gi
  ];

  for (const pattern of jsonPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      try {
        let jsonStr = match[0].trim();

        // 应用修复
        jsonStr = jsonStr
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');

        console.log(`📋 传统提取到标准JSON:`, jsonStr);
        const decision = JSON.parse(jsonStr);
        console.log(`✅ 传统标准JSON解析成功:`, decision);

        if (decision.action && ["fold", "check", "call", "bet", "raise", "all-in"].includes(decision.action)) {
          // 将bet映射为raise以保持兼容性
          if (decision.action === "bet") {
            decision.action = "raise";
          }
          return {
            action: decision.action,
            amount: decision.amount || 0
          };
        }
      } catch (e) {
        console.log(`❌ 传统标准JSON解析失败:`, e.message);
      }
    }
  }

  // 方法3: 传统文本解析作为备用
  console.log(`🔧 使用传统文本解析作为备用...`);
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("fold") || lowerText.includes("弃牌")) {
    return { action: "fold" };
  } else if (lowerText.includes("check") || lowerText.includes("过牌")) {
    return { action: "check" };
  } else if (lowerText.includes("call") || lowerText.includes("跟注")) {
    return { action: "call" };
  } else if (lowerText.includes("all-in") || lowerText.includes("全押")) {
    return { action: "all-in" };
  } else if (lowerText.includes("bet") || lowerText.includes("raise") || lowerText.includes("加注") || lowerText.includes("下注")) {
    const amountMatch = text.match(/(\d+)/);
    if (amountMatch) {
      return { action: "raise", amount: parseInt(amountMatch[1]) };
    }
    return { action: "raise", amount: gameState.currentBet + gameState.bigBlindAmount };
  }
  
  console.log(`❌ 传统提取无法从文本中提取决策: "${text}"`);
  return null;
}

// 🚀 实时AI事件触发器
export async function initializeRealtimeAI(
  player: Player,
  gameState: GameState,
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<void> {
  console.log(`🔧 ===== 初始化实时AI =====`);
  console.log(`👤 玩家: ${player.name}`);
  console.log(`🤖 是否AI: ${!player.isHuman}`);
  console.log(`🔑 API配置: ${!!apiKey}, ${!!baseUrl}, ${!!model}`);

  if (!apiKey || !baseUrl || !model) {
    console.warn(`⚠️ ${player.name} API配置不完整，跳过实时AI初始化`);
    return;
  }

  if (player.isHuman) {
    console.log(`👤 ${player.name} 是真人玩家，跳过实时AI初始化`);
    return;
  }

  try {
    const realtimeAI = RealtimeAISystem.getInstance(player.id, player.name);
    console.log(`🎯 获取 ${player.name} 的实时AI实例`);

    realtimeAI.configureAPI(apiKey, baseUrl, model);
    console.log(`🔧 ${player.name} API配置完成`);

    // 玩家坐下时触发
    const playerPosition = gameState.players.findIndex(p => p.id === player.id);
    console.log(`📍 ${player.name} 位置: ${playerPosition}`);

    await realtimeAI.onPlayerSitDown(gameState, playerPosition);
    console.log(`✅ ${player.name} 实时AI初始化完成`);
  } catch (error) {
    console.error(`❌ ${player.name} 实时AI初始化失败:`, error);
    throw error;
  }
}

export async function notifyRealtimeAI_CardsDealt(
  player: Player,
  holeCards: Card[],
  gameState: GameState
): Promise<void> {
  if (player.isHuman) return;

  const realtimeAI = RealtimeAISystem.getInstance(player.id, player.name);
  await realtimeAI.onCardsDealt(holeCards, gameState);
}

export async function notifyRealtimeAI_ActionUpdate(
  action: string,
  amount: number,
  playerId: string,
  gameState: GameState,
  apiKey?: string,
  baseUrl?: string,
  model?: string
): Promise<void> {
  if (!apiKey || !baseUrl || !model) return;

  // 通知所有其他AI玩家
  for (const player of gameState.players) {
    if (!player.isHuman && player.id !== playerId) {
      const realtimeAI = RealtimeAISystem.getInstance(player.id, player.name);
      await realtimeAI.onActionUpdate(action, amount, playerId, gameState);
    }
  }
}

export function resetRealtimeAI(player: Player): void {
  if (player.isHuman) return;

  const realtimeAI = RealtimeAISystem.getInstance(player.id, player.name);
  realtimeAI.reset();
}

// 🚀 快速AI决策函数 - 内置优化版
async function makeFastAIDecision(
  player: Player,
  gameState: GameState,
  communityCards: Card[],
  conversationHistory: Message[],
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<{ action: string; amount?: number }> {

  const startTime = Date.now();
  const cache = SimpleAICache.getInstance();

  console.log(`
🚀 ===== 快速AI决策开始 =====
👤 玩家: ${player.name}
🎯 策略: 智能缓存 + 压缩上下文
⏰ 开始时间: ${new Date().toLocaleTimeString()}
============================`);

  // 检查缓存的上下文
  const cachedContext = cache.getGameContext(gameState, player.id);
  const playerProfile = cache.getPlayerProfile(player.id);

  // 构建优化的对话历史
  const optimizedHistory = buildOptimizedHistory(
    player,
    gameState,
    communityCards,
    conversationHistory,
    cachedContext,
    playerProfile
  );

  console.log(`
📊 ===== 优化统计 =====
📝 原始对话长度: ${conversationHistory.length}
🎯 优化后长度: ${optimizedHistory.length}
💾 缓存命中: ${cachedContext ? '是' : '否'}
🧠 玩家档案: ${playerProfile ? '已加载' : '新建'}
⚡ 预处理时间: ${Date.now() - startTime}ms
============================`);

  // 发送优化的API请求
  const requestPayload = {
    model: model,
    messages: optimizedHistory,
    response_format: { type: 'json_object' },
    temperature: 0.3, // 降低温度以获得更一致的响应
    max_tokens: 150   // 限制token数量以加快响应
  };

  console.log(`🌐 发送优化API请求 - 消息数: ${optimizedHistory.length}, max_tokens: 150`);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API请求失败: ${response.status} - ${errorText}`);
    throw new Error(`API request failed with status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const decisionText = result.choices[0].message.content;

  console.log(`📥 API响应: ${decisionText}`);

  // 使用增强的JSON解析
  const decision = parseOptimizedDecisionJSON(decisionText);

  if (!decision) {
    throw new Error("Failed to parse decision from AI response");
  }

  // 更新缓存
  cache.updatePlayerProfile(player.id, decision.action, decision.amount || 0, gameState.phase);
  cache.cacheGameContext(gameState, player.id, { lastDecision: decision, timestamp: Date.now() });

  const totalTime = Date.now() - startTime;
  console.log(`
✅ ===== 快速决策完成 =====
👤 玩家: ${player.name}
🎯 决策: ${decision.action}${decision.amount ? ` (${decision.amount})` : ''}
⏱️ 总耗时: ${totalTime}ms
💾 缓存更新: 完成
============================`);

  return decision;
}

// 🎯 构建优化的对话历史
function buildOptimizedHistory(
  player: Player,
  gameState: GameState,
  communityCards: Card[],
  originalHistory: Message[],
  cachedContext: any,
  playerProfile: any
): Message[] {

  // 保留系统提示
  const systemMessage = originalHistory.find(msg => msg.role === 'system');

  // 如果有缓存上下文且历史较长，使用增量模式
  if (cachedContext && originalHistory.length > 3) {
    console.log(`🎯 使用增量更新模式`);

    const optimizedHistory: Message[] = [];

    if (systemMessage) {
      optimizedHistory.push(systemMessage);
    }

    // 添加压缩的历史摘要
    optimizedHistory.push({
      role: 'assistant',
      content: '已加载之前的牌局上下文和玩家行为分析。'
    });

    // 添加最新的增量信息
    optimizedHistory.push({
      role: 'user',
      content: buildIncrementalPrompt(player, gameState, communityCards, playerProfile)
    });

    return optimizedHistory;
  }

  // 否则使用压缩的完整上下文
  console.log(`🎯 使用压缩完整上下文模式`);

  const optimizedHistory: Message[] = [];

  if (systemMessage) {
    optimizedHistory.push(systemMessage);
  }

  optimizedHistory.push({
    role: 'user',
    content: buildCompressedGamePrompt(player, gameState, communityCards, playerProfile)
  });

  return optimizedHistory;
}

// 🎯 构建增量提示
function buildIncrementalPrompt(
  player: Player,
  gameState: GameState,
  communityCards: Card[],
  playerProfile: any
): string {

  return `**最新局面更新:**
- **当前阶段:** ${gameState.phase}
- **你的位置:** ${gameState.activePlayerIndex}
- **公共牌:** [${communityCards.map(c => `${c.rank}${c.suit}`).join(', ')}]
- **你的手牌:** [${player.holeCards?.map(c => `${c.rank}${c.suit}`).join(', ') || ''}]
- **底池:** ${gameState.pot}
- **你的筹码:** ${player.chips}
- **当前下注:** ${gameState.currentBet}

${playerProfile ? `**你的最近表现:** 最近${playerProfile.actions.length}个行动已分析` : ''}

轮到你行动。基于之前的分析，请快速做出GTO决策。

⚡ 返回格式：{"action": "你的行动", "amount": 金额, "reasoning": "简短理由"}`;
}

// 🎯 构建压缩游戏提示
function buildCompressedGamePrompt(
  player: Player,
  gameState: GameState,
  communityCards: Card[],
  playerProfile: any
): string {

  return `**快速决策请求:**
你是${player.name}，世界级德州扑克AI。

**当前局面:**
- 阶段: ${gameState.phase} | 底池: ${gameState.pot} | 你的筹码: ${player.chips}
- 公共牌: [${communityCards.map(c => `${c.rank}${c.suit}`).join(', ')}]
- 你的手牌: [${player.holeCards?.map(c => `${c.rank}${c.suit}`).join(', ') || ''}]
- 当前下注: ${gameState.currentBet} | 你的位置: ${gameState.activePlayerIndex}

**要求:** 基于GTO策略快速决策，考虑底池赔率和位置优势。

⚡ 返回格式：{"action": "fold/check/call/raise/all-in", "amount": 数字, "reasoning": "理由"}`;
}

// 🔧 增强的JSON解析 - 支持混合内容
function parseOptimizedDecisionJSON(text: string): { action: string; amount?: number } | null {
  console.log(`🔧 ===== 增强JSON解析开始 =====`);
  console.log(`📝 原始文本:`, text);

  try {
    // 方法1: 寻找最后一个完整的JSON对象（通常是决策）
    const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      // 取最后一个JSON对象（通常是决策）
      const lastJson = jsonMatches[jsonMatches.length - 1];
      console.log(`🎯 找到JSON对象: ${lastJson}`);

      try {
        const decision = JSON.parse(lastJson);
        if (decision.action && ['fold', 'check', 'call', 'raise', 'all-in', 'bet'].includes(decision.action)) {
          // 将bet映射为raise
          if (decision.action === 'bet') {
            decision.action = 'raise';
          }
          console.log(`✅ JSON解析成功:`, decision);
          return {
            action: decision.action,
            amount: decision.amount || 0
          };
        }
      } catch (e) {
        console.log(`❌ JSON对象解析失败: ${e.message}`);
      }
    }

    // 方法2: 寻找包含action字段的JSON
    const actionJsonPattern = /\{[^{}]*"action"[^{}]*\}/g;
    const actionMatches = Array.from(text.matchAll(actionJsonPattern));

    for (const match of actionMatches) {
      try {
        let jsonStr = match[0];

        // 修复常见JSON问题
        jsonStr = jsonStr
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/"\s*(\d+)\s*"/g, '$1'); // 修复数字被引号包围的问题

        console.log(`🔧 修复后的JSON: ${jsonStr}`);

        const decision = JSON.parse(jsonStr);
        if (decision.action && ['fold', 'check', 'call', 'raise', 'all-in', 'bet'].includes(decision.action)) {
          if (decision.action === 'bet') {
            decision.action = 'raise';
          }
          console.log(`✅ Action JSON解析成功:`, decision);
          return {
            action: decision.action,
            amount: decision.amount || 0
          };
        }
      } catch (e) {
        console.log(`❌ Action JSON解析失败: ${e.message}`);
      }
    }

    // 方法3: 更宽松的JSON提取
    const flexibleJsonPattern = /\{[\s\S]*?\}/g;
    const flexibleMatches = Array.from(text.matchAll(flexibleJsonPattern));

    for (const match of flexibleMatches) {
      try {
        let jsonStr = match[0];

        // 更激进的修复
        jsonStr = jsonStr
          .replace(/[\r\n\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/'/g, '"')
          .replace(/(\w+)\s*:/g, '"$1":')
          .replace(/:\s*([^",\{\}\[\]]+)(?=\s*[,\}])/g, ':"$1"')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');

        console.log(`🔧 激进修复后的JSON: ${jsonStr}`);

        const decision = JSON.parse(jsonStr);
        if (decision.action && ['fold', 'check', 'call', 'raise', 'all-in', 'bet'].includes(decision.action)) {
          if (decision.action === 'bet') {
            decision.action = 'raise';
          }
          console.log(`✅ 宽松JSON解析成功:`, decision);
          return {
            action: decision.action,
            amount: decision.amount || 0
          };
        }
      } catch (e) {
        console.log(`❌ 宽松JSON解析失败: ${e.message}`);
      }
    }

    console.warn(`⚠️ 所有JSON解析方法都失败了`);
    return null;
  } catch (error) {
    console.error(`❌ JSON解析完全失败:`, error);
    return null;
  }
}

// 🔥 修复：构建增强的手牌历史字符串 - 包含位置信息
function buildHandHistoryString(gameState: GameState): string {
  const actionsByPhase: { [phase: string]: ActionHistoryItem[] } = {
    preflop: [],
    flop: [],
    turn: [],
    river: []
  };

  // 按阶段分组行动
  gameState.actionHistory.forEach(action => {
    if (actionsByPhase[action.phase]) {
      actionsByPhase[action.phase].push(action);
    }
  });

  let historyString = '';
  
  Object.entries(actionsByPhase).forEach(([phase, actions]) => {
    if (actions.length > 0) {
      historyString += `[${getPhaseText(phase)}] `;
      actions.forEach(action => {
        // 🔥 关键修复：添加位置信息
        const player = gameState.players.find(p => p.name === action.playerName);
        const position = player ? getPositionName(player, gameState) : '未知位置';
        const amountText = action.amount ? ` ${action.amount}` : '';
        historyString += `${action.playerName}(${position}) ${action.action}${amountText}。`;
      });
      historyString += '\n';
    }
  });

  return historyString || '新手牌开始，暂无行动历史。';
}

// 🔥 V3.0 实时AI决策函数 - 流式分析 + 即时响应
export async function makeAIDecision(
  player: Player,
  gameState: GameState,
  communityCards: Card[],
  conversationHistory: Message[], // 新增参数
  apiKey?: string,
  baseUrl?: string,
  model?: string,
): Promise<{ action: string; amount?: number }> {

  console.log(`
🚀 ${player.name} [V3.0 实时决策] 开始分析`);

  // 🚀 优先使用实时AI系统
  if (apiKey && baseUrl && model) {
    try {
      const realtimeAI = RealtimeAISystem.getInstance(player.id, player.name);

      // 确保API已配置
      realtimeAI.configureAPI(apiKey, baseUrl, model);

      console.log(`⚡ 使用实时AI系统 - 基于持续分析做出决策`);
      return await realtimeAI.makeInstantDecision(gameState, communityCards);
    } catch (error) {
      console.warn(`⚠️ 实时AI失败，回退到快速决策:`, error);
      // 回退到快速决策
      try {
        return await makeFastAIDecision(
          player,
          gameState,
          communityCards,
          conversationHistory,
          apiKey,
          baseUrl,
          model
        );
      } catch (fastError) {
        console.warn(`⚠️ 快速决策也失败，使用标准流程:`, fastError);
      }
    }
  }

  console.log(`🎯 ${player.name} [标准流程] 开始决策分析`);
  
  if (!apiKey || !baseUrl || !model) {
    console.log(`${player.name}: AI配置不完整，使用GTO备用决策`);
    const context: GameContext = {
      position: getPositionName(player, gameState),
      communityCards: formatHand(communityCards),
      yourHand: formatHand(player.holeCards),
      potSize: gameState.pot,
      yourStack: player.chips,
      opponentStack: Math.max(...gameState.players.filter(p => !p.isFolded && p.id !== player.id).map(p => p.chips)),
      phase: gameState.phase as any,
      blindLevels: { small: gameState.smallBlindAmount, big: gameState.bigBlindAmount },
      tableSize: gameState.players.length
    };
    return getGTOBackupDecision(context);
  }

  try {
    // 🌐 API请求详细日志
    const requestPayload = {
      model: model,
      messages: conversationHistory,
      response_format: { type: 'json_object' }
    };

    console.log(`
🌐 ===== API请求发送 =====
👤 玩家: ${player.name}
🔗 URL: ${baseUrl}/chat/completions
📝 请求体:`, requestPayload);
    console.log(`📨 对话历史 (${conversationHistory.length} 条消息):`, conversationHistory);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`
❌ ===== API请求失败 =====
👤 玩家: ${player.name}
🚨 状态码: ${response.status}
📝 错误信息: ${errorText}
⏰ 失败时间: ${new Date().toLocaleTimeString()}
============================`);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // 📥 API响应详细日志
    console.log(`
📥 ===== API响应接收 =====
👤 玩家: ${player.name}
✅ 状态: 成功
📊 完整响应:`, result);

    const decisionText = result.choices[0].message.content;
    console.log(`🎯 AI原始决策文本: ${decisionText}`);

    const decision = extractDecisionFromText(decisionText, gameState, player);

    console.log(`
🎲 ===== 决策解析结果 =====
👤 玩家: ${player.name}
🎯 解析后决策:`, decision);

    if (!decision) {
        console.error(`❌ 决策解析失败 - 玩家: ${player.name}, 原始文本: ${decisionText}`);
        throw new Error("Failed to extract decision from AI response");
    }

    console.log(`✅ ${player.name} 决策解析成功: ${decision.action}${decision.amount ? ` (${decision.amount})` : ''}`);
    return decision;

  } catch (error) {
    console.error(`❌ ${player.name} V1.5混合会话决策失败:`, error);
    const context: GameContext = {
      position: getPositionName(player, gameState),
      communityCards: formatHand(communityCards),
      yourHand: formatHand(player.holeCards),
      potSize: gameState.pot,
      yourStack: player.chips,
      opponentStack: Math.max(...gameState.players.filter(p => !p.isFolded && p.id !== player.id).map(p => p.chips)),
      phase: gameState.phase as any,
      blindLevels: { small: gameState.smallBlindAmount, big: gameState.bigBlindAmount },
      tableSize: gameState.players.length
    };
    return getGTOBackupDecision(context);
  }
}

// GTO备用决策逻辑
function getGTOBackupDecision(context: GameContext): { action: string; amount?: number } {
  const { phase, yourStack, potSize, position } = context;
  const stackToPotRatio = yourStack / Math.max(potSize, 1);
  
  console.log(`🔄 使用GTO备用决策: 阶段=${phase}, 位置=${position}, SPR=${stackToPotRatio.toFixed(1)}`);
  
  if (phase === 'preflop') {
    // 基于位置的翻前GTO策略
    const latePositions = ['Button (BTN)', 'Cut-off (CO)'];
    const middlePositions = ['Middle Position (MP)', 'MP+1'];
    
    if (latePositions.includes(position)) {
      return {
        action: 'raise',
        amount: context.blindLevels.big * 2.5
      };
    } else if (middlePositions.includes(position)) {
      return {
        action: 'fold',
        amount: 0
      };
    } else {
      return {
        action: 'fold',
        amount: 0
      };
    }
  } else {
    // 翻后GTO策略
    if (stackToPotRatio > 4) {
      // 深筹码策略
      return {
        action: 'check',
        amount: 0
      };
    } else if (stackToPotRatio > 1) {
      // 中等筹码策略
      return {
        action: 'call',
        amount: 0
      };
    } else {
      // 浅筹码策略
      return {
        action: 'call',
        amount: 0
      };
    }
  }
}

// 🔥 新增：牌局结束后的行为分析和笔记生成
export function analyzeHandAndGenerateNotes(
  gameState: GameState,
  communityCards: Card[],
  winners: any[]
): void {
  console.log(`\n📊 开始牌局分析和笔记生成...`);
  
  // 保存手牌历史
  const handHistory = {
    id: `hand_${Date.now()}`,
    gameSessionId: 'current_session',
    actions: gameState.actionHistory.map(action => ({
      playerId: action.playerName,
      action: action.action as any,
      amount: action.amount || 0,
      phase: action.phase as any,
      position: 'unknown', // 简化处理
      timestamp: new Date(action.timestamp),
      stackSize: 0, // 简化处理
      potSize: gameState.pot
    })),
    winnerId: winners[0]?.winners[0]?.id || '',
    potSize: gameState.pot,
    playerHands: {},
    communityCards: formatHand(communityCards),
    createdAt: new Date()
  };
  
  HandHistoryManager.saveHandHistory(handHistory);
  
  // 为每个人类玩家生成AI行为笔记
  const humanPlayers = gameState.players.filter(p => !p.isAI);
  const aiPlayers = gameState.players.filter(p => p.isAI);
  
  humanPlayers.forEach(humanPlayer => {
    // 更新对手档案
    const humanActions = gameState.actionHistory
      .filter(action => action.playerName === humanPlayer.name)
      .map(action => ({
        playerId: humanPlayer.id,
        action: action.action as any,
        amount: action.amount || 0,
        phase: action.phase as any,
        position: getPositionName(humanPlayer, gameState),
        timestamp: new Date(action.timestamp),
        stackSize: humanPlayer.chips,
        potSize: gameState.pot
      }));
    
    if (humanActions.length > 0) {
      PlayerNotesManager.updateOpponentProfile(humanPlayer.id, humanPlayer.name, humanActions);
      
      // 为每个显著行为生成笔记
      humanActions.forEach(action => {
        const context: GameContext = {
          position: action.position,
          communityCards: formatHand(communityCards),
          yourHand: '',
          potSize: action.potSize,
          yourStack: action.stackSize,
          opponentStack: 0,
          phase: action.phase,
          blindLevels: { small: gameState.smallBlindAmount, big: gameState.bigBlindAmount },
          tableSize: gameState.players.length
        };
        
        const note = PlayerNotesManager.generateBehaviorNote(
          humanPlayer.id,
          humanPlayer.name,
          action,
          context,
          { won: winners[0]?.winners.some(w => w.id === humanPlayer.id) || false, showdown: true }
        );
        
        if (note) {
          PlayerNotesManager.savePlayerNote(note);
          console.log(`📝 生成行为笔记: ${note.noteText}`);
        }
      });
    }
  });
  
  // 清理过期笔记
  PlayerNotesManager.cleanupOldNotes(30);
  
  console.log(`✅ 牌局分析完成，笔记已更新`);
}