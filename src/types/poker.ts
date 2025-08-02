export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBet: number; // 本轮总下注
  isActive: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  position: number;
  isAI: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  hasActed: boolean; // 是否已经行动过
  aiPersonality?: string; // AI性格类型
  behaviorHistory: PlayerBehavior[]; // 历史行为记录
  personalityAnalysis?: PersonalityAnalysis; // 动态性格分析
}

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended';

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  phase: GamePhase;
  activePlayerIndex: number;
  dealerIndex: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  lastRaiserIndex: number;
  bettingRoundStartIndex: number;
  actionHistory: ActionHistoryItem[]; // 添加行动历史
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[];
}

export type PlayerAction = 'fold' | 'call' | 'raise' | 'check' | 'all-in';

export interface HandRanking {
  rank: number;
  name: string;
  cards: Card[];
  kickers: Card[];
}

export interface CustomModel {
  id: string;
  name: string;
  group?: string;
}

export interface AIConfig {
  openaiApiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  customModels: CustomModel[];
  enablePreflopGTO: boolean; // 🎯 新增：是否启用翻前GTO策略（默认true）
}

export interface ActionHistoryItem {
  playerName: string;
  action: string;
  amount?: number;
  phase: GamePhase;
  timestamp: number;
}

export interface AIPersonality {
  key: string;
  name: string;
  description: string;
  instruction: string;
}

// 行为模式记录
export interface PlayerBehavior {
  phase: GamePhase;
  handStrength: number; // 0-9, 基于最终手牌强度
  action: string;
  amount?: number;
  potSize: number;
  position: string;
  betFacingRatio: number; // 面临下注与底池的比例
  timestamp: number;
}

// 性格倾向分析结果
export interface PersonalityAnalysis {
  observed: string; // 观察到的主要性格倾向
  confidence: number; // 0-1, 分析可信度
  traits: {
    aggression: number; // -1到1, 负数表示保守，正数表示激进
    tightness: number; // -1到1, 负数表示松散，正数表示紧密
    bluffFrequency: number; // 0-1, 虚张声势频率
    predictability: number; // 0-1, 可预测性
    adaptability: number; // 0-1, 适应性
  };
  recentTrends: string; // 最近的行为趋势描述
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}