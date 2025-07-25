import { GameState } from '../types/poker';
import { getRandomPersonality } from '../utils/ai-personalities';

// 🎯 9人桌初始配置常量
export const INITIAL_PLAYERS = [
  { id: '1', name: '玩家', chips: 50000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 0, isAI: false, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, behaviorHistory: [] },
  { id: '2', name: 'Goliath-1', chips: 45000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 1, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '3', name: 'Goliath-2', chips: 60000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 2, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '4', name: 'Goliath-3', chips: 40000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 3, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '5', name: 'Goliath-4', chips: 55000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 4, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '6', name: 'Goliath-5', chips: 35000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 5, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '7', name: 'Goliath-6', chips: 48000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 6, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '8', name: 'Goliath-7', chips: 52000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 7, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] },
  { id: '9', name: 'Goliath-8', chips: 43000, holeCards: [], currentBet: 0, totalBet: 0, isActive: true, isFolded: false, isAllIn: false, position: 8, isAI: true, isDealer: false, isSmallBlind: false, isBigBlind: false, hasActed: false, aiPersonality: getRandomPersonality(), behaviorHistory: [] }
];

export const INITIAL_GAME_STATE: GameState = {
  players: INITIAL_PLAYERS,
  communityCards: [],
  pot: 0,
  sidePots: [],
  currentBet: 0,
  phase: 'preflop',
  activePlayerIndex: 0,
  dealerIndex: 0,
  smallBlindAmount: 50,
  bigBlindAmount: 100,
  lastRaiserIndex: -1,
  bettingRoundStartIndex: 0,
  actionHistory: []
};

// AI决策延迟配置
export const AI_DELAY_CONFIG = {
  BASE_DELAY: 800,
  RANDOM_DELAY_MAX: 400,
  PREFLOP_EXTRA: 0,
  POSTFLOP_EXTRA: 300,
  COMPLEXITY_MULTIPLIER: 100
};

// 筹码买入选项
export const CHIP_BUY_IN_OPTIONS = [
  { label: '买入20K', amount: 20000 },
  { label: '买入50K', amount: 50000 },
  { label: '买入100K', amount: 100000 }
];

// 默认AI配置
export const DEFAULT_AI_CONFIG = {
  openaiApiKey: '',
  baseUrl: 'https://api.tu-zi.com/v1',
  model: 'claude-sonnet-4-20250514',
  enabled: false,
  customModels: []
};