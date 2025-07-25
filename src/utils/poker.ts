import {
  Card,
  Rank,
  Suit,
  Player,
  HandRanking,
  GameState,
  ActionHistoryItem,
  PlayerBehavior,
  PersonalityAnalysis,
  Message,
} from "../types/poker.ts";
import { GTODecision, GameContext } from "../types/gto-poker.ts";
import { GTOAISystem, GTOAnalyzer } from "./gto-ai-system.ts";
import { PlayerNotesManager, HandHistoryManager } from "./player-notes.ts";
import { getPersonalityByKey } from "./ai-personalities.ts";

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
  
  if (!allPlayersActed) {
    console.log(`[阶段检查] 还有玩家未行动，不应转换阶段`);
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
  console.log(`🔍 传统提取开始，文本长度: ${text.length}`);
  console.log(`📝 文本前200字符:`, text.substring(0, 200));

  // 清理文本
  const cleanText = text.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();

  // 方法1: 提取markdown代码块中的JSON
  const markdownPatterns = [
    /```json\s*(\{[\s\S]*?\})\s*```/gi,
    /```\s*(\{[\s\S]*?\})\s*```/gi,
    /`\`\`json\s*(\{[\s\S]*?\})\s*`\`\`/gi,
    /`\`\`\s*(\{[\s\S]*?\})\s*`\`\`/gi
  ];

  for (const pattern of markdownPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1]) {
        try {
          const jsonStr = match[1].trim();
          console.log(`📋 传统提取到markdown JSON:`, jsonStr);
          const decision = JSON.parse(jsonStr);
          console.log(`✅ 传统Markdown JSON解析成功:`, decision);
          
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

  // 方法2: 提取标准JSON对象
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
        const jsonStr = match[0].trim();
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

// 🔥 V1.5混合会话：Goliath GTO AI决策函数 - 传入AI身份信息
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
🎯 ${player.name} [Goliath V1.5 混合会话] 开始决策分析`);
  
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
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: conversationHistory,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    const decisionText = result.choices[0].message.content;
    const decision = extractDecisionFromText(decisionText, gameState, player);

    if (!decision) {
        throw new Error("Failed to extract decision from AI response");
    }

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