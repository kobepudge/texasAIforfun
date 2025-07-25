// GTO扑克AI系统的核心数据模型
export interface PlayerNote {
  id: string;
  playerId: string;
  observerId: string;
  handId?: string;
  noteText: string;
  confidence: number; // 0.0 to 1.0
  category: 'preflop' | 'postflop' | 'bluffing' | 'value_betting' | 'folding' | 'sizing' | 'position';
  createdAt: Date;
  gameContext?: {
    phase: string;
    position: string;
    stackSize: number;
    potSize: number;
  };
}

export interface HandHistory {
  id: string;
  gameSessionId: string;
  actions: HandAction[];
  winnerId: string;
  potSize: number;
  playerHands: { [playerId: string]: string[] };
  communityCards: string[];
  createdAt: Date;
}

export interface HandAction {
  playerId: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  position: string;
  timestamp: Date;
  stackSize: number;
  potSize: number;
}

export interface GTODecision {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount: number;
  reasoning: string;
  confidence?: number;
  gtoDeviation?: {
    reason: string;
    expectedValue: number;
  };
}

export interface GameContext {
  position: string;
  communityCards: string;
  yourHand: string;
  potSize: number;
  yourStack: number;
  opponentStack: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river';
  blindLevels: { small: number; big: number };
  tableSize: number;
}

export interface OpponentProfile {
  playerId: string;
  playerName: string;
  notes: PlayerNote[];
  recentBehavior: {
    aggression: number;
    tightness: number;
    bluffFrequency: number;
    valueThreshold: number;
  };
  handsPlayed: number;
  lastUpdated: Date;
}

export interface AISystemConfig {
  model: string;
  apiKey: string;
  baseUrl: string;
  aiPersonality: 'goliath' | 'adaptive_gto';
  responseFormat: 'json_object';
  maxTokens: number;
  temperature: number;
}

// 🔥 V1.5混合会话架构新增类型 (修正版)
export interface SessionStatus {
  sessionId: string;
  totalTokens: number;
  tokenThreshold: number;
  maxTokens: number;
  isNearLimit: boolean;
  historyLength: number;
  conversationLength: number; // 新增：对话历史长度
}

export interface SystemStatus {
  version: string;
  architecture: string;
  session: SessionStatus;
  config: {
    model: string;
    aiPersonality: string;
    maxTokens: number;
    temperature: number;
  };
}

// 🔥 修正：使用标准Chat Completions API结构
export interface ChatCompletionsRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  response_format?: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface HybridSessionConfig {
  tokenThreshold: number;
  maxContextWindow: number;
  summaryStrategy: 'recent' | 'keyActions' | 'full';
  historyRetentionCount: number;
}