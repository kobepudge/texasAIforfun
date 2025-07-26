import { PokerEventType, globalEventBus } from '../core/event-bus.ts';
import { NewGameState } from '../core/game-engine.ts';
import { Card } from '../types/poker';

// 🤖 AI玩家配置
export interface AIPlayerConfig {
  id: string;
  name: string;
  personality: AIPersonality;
  apiConfig: AIAPIConfig;
  decisionTimeoutMs: number;
}

export interface AIAPIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AIPersonality {
  aggression: number;      // 激进度 0-1
  tightness: number;       // 紧密度 0-1
  bluffFrequency: number;  // 诈唬频率 0-1
  adaptability: number;    // 适应性 0-1
  riskTolerance: number;   // 风险承受度 0-1
}

// 🎯 决策结果
export interface AIDecision {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount: number;
  confidence: number;
  reasoning: string;
  decisionTime: number;
  metadata: {
    handStrength: number;
    positionFactor: string;
    opponentAdjustment: string;
    playType: string;
  };
}

// 🧠 对手档案
export interface OpponentProfile {
  playerId: string;
  playerName: string;
  vpip: number;           // 入池率
  pfr: number;            // 翻牌前加注率
  aggression: number;     // 激进度指数
  tightness: number;      // 紧密度
  bluffFrequency: number; // 诈唬频率
  positionAwareness: number; // 位置意识
  recentActions: RecentAction[];
  lastUpdate: number;
  tendency: 'LAG' | 'TAG' | 'LP' | 'TP'; // Loose Aggressive, Tight Aggressive, Loose Passive, Tight Passive
}

export interface RecentAction {
  action: string;
  amount: number;
  position: string;
  phase: string;
  outcome: string;
  timestamp: number;
}

// 🤖 AI玩家类
export class AIPlayer {
  private config: AIPlayerConfig;
  private gameState: NewGameState | null = null;
  private holeCards: Card[] = [];
  private opponentProfiles: Map<string, OpponentProfile> = new Map();
  private decisionHistory: AIDecision[] = [];
  private isActive: boolean = false;
  private currentDecisionPromise: Promise<AIDecision> | null = null;

  constructor(config: AIPlayerConfig) {
    this.config = config;
    this.setupEventListeners();
    
    console.log(`🤖 AI玩家创建: ${config.name}`);
    console.log(`🎭 性格特征:`, config.personality);
  }

  // 🎧 设置事件监听
  private setupEventListeners(): void {
    // 监听游戏开始
    globalEventBus.subscribe(PokerEventType.GAME_STARTED, (event) => {
      this.onGameStarted(event.data);
    });

    // 监听发牌
    globalEventBus.subscribe(PokerEventType.CARDS_DEALT, (event) => {
      if (event.playerId === this.config.id) {
        this.onCardsDealt(event.data.cards);
      }
    });

    // 监听轮到自己
    globalEventBus.subscribe(PokerEventType.PLAYER_TURN_START, (event) => {
      if (event.playerId === this.config.id) {
        this.onMyTurn(event.data);
      }
    });

    // 监听其他玩家行动
    globalEventBus.subscribe(PokerEventType.PLAYER_ACTION, (event) => {
      if (event.playerId !== this.config.id) {
        this.onOpponentAction(event.data);
      }
    });
  }

  // 🚀 游戏开始
  private onGameStarted(data: any): void {
    this.isActive = true;
    this.gameState = data.gameState;
    this.initializeOpponentProfiles();
    
    console.log(`🚀 ${this.config.name} 加入游戏`);
  }

  // 🃏 收到手牌
  private onCardsDealt(cards: Card[]): void {
    this.holeCards = cards;
    
    console.log(`🃏 ${this.config.name} 收到手牌: ${this.formatCards(cards)}`);
    
    // 立即开始分析
    this.analyzeHoleCards();
  }

  // 🎯 轮到自己行动
  private async onMyTurn(data: any): Promise<void> {
    if (!this.isActive || !this.gameState) return;

    console.log(`🎯 轮到 ${this.config.name} 行动`);
    
    // 发送AI决策开始事件
    globalEventBus.emit(PokerEventType.AI_DECISION_START, {
      playerId: this.config.id,
      playerName: this.config.name,
      gameState: this.gameState
    }, this.config.id);

    try {
      // 开始决策
      const decision = await this.makeDecision();
      
      // 发送AI决策完成事件
      globalEventBus.emit(PokerEventType.AI_DECISION_COMPLETE, {
        playerId: this.config.id,
        playerName: this.config.name,
        decision
      }, this.config.id);

      // 执行决策
      this.executeDecision(decision);
      
    } catch (error) {
      console.error(`❌ ${this.config.name} 决策失败:`, error);
      
      // 发送超时事件
      globalEventBus.emit(PokerEventType.AI_DECISION_TIMEOUT, {
        playerId: this.config.id,
        playerName: this.config.name,
        error: error.message
      }, this.config.id);

      // 执行默认决策（弃牌）
      this.executeDecision({
        action: 'fold',
        amount: 0,
        confidence: 0,
        reasoning: '决策超时，自动弃牌',
        decisionTime: this.config.decisionTimeoutMs,
        metadata: {
          handStrength: 0,
          positionFactor: 'unknown',
          opponentAdjustment: 'none',
          playType: 'fold'
        }
      });
    }
  }

  // 👀 观察对手行动
  private onOpponentAction(actionData: any): void {
    this.updateOpponentProfile(actionData);
  }

  // 🧠 分析手牌
  private analyzeHoleCards(): void {
    if (this.holeCards.length !== 2) return;

    const handStrength = this.calculateHandStrength(this.holeCards);
    const playability = this.calculatePlayability(this.holeCards);
    
    console.log(`🧠 ${this.config.name} 手牌分析:`);
    console.log(`   强度: ${handStrength.toFixed(2)}`);
    console.log(`   可玩性: ${playability.toFixed(2)}`);
  }

  // 🎲 做出决策
  private async makeDecision(): Promise<AIDecision> {
    const startTime = Date.now();
    
    // 设置超时
    const timeoutPromise = new Promise<AIDecision>((_, reject) => {
      setTimeout(() => {
        reject(new Error('决策超时'));
      }, this.config.decisionTimeoutMs);
    });

    // 实际决策逻辑
    const decisionPromise = this.performDecisionAnalysis();
    
    // 竞速：决策 vs 超时
    this.currentDecisionPromise = Promise.race([decisionPromise, timeoutPromise]);
    
    const decision = await this.currentDecisionPromise;
    decision.decisionTime = Date.now() - startTime;
    
    // 记录决策历史
    this.decisionHistory.push(decision);
    
    return decision;
  }

  // 🔍 执行决策分析
  private async performDecisionAnalysis(): Promise<AIDecision> {
    // 这里是简化版本，后续会实现完整的AI决策逻辑
    const handStrength = this.calculateHandStrength(this.holeCards);
    const position = this.getMyPosition();
    const potOdds = this.calculatePotOdds();
    
    console.log(`🔍 ${this.config.name} 决策分析:`);
    console.log(`   手牌强度: ${handStrength.toFixed(2)}`);
    console.log(`   位置: ${position}`);
    console.log(`   底池赔率: ${potOdds.toFixed(2)}`);

    // 简单决策逻辑（后续会被AI替换）
    let action: AIDecision['action'] = 'fold';
    let amount = 0;
    let confidence = 0.5;
    let reasoning = '基础决策逻辑';

    if (handStrength > 0.8) {
      action = 'raise';
      amount = this.gameState!.bigBlind * 3;
      confidence = 0.9;
      reasoning = '强牌加注';
    } else if (handStrength > 0.6) {
      action = 'call';
      confidence = 0.7;
      reasoning = '中等牌力跟注';
    } else if (handStrength > 0.4 && potOdds > 2.0) {
      action = 'call';
      confidence = 0.6;
      reasoning = '底池赔率合适';
    } else {
      action = 'fold';
      confidence = 0.8;
      reasoning = '牌力不足弃牌';
    }

    return {
      action,
      amount,
      confidence,
      reasoning,
      decisionTime: 0, // 会在外层设置
      metadata: {
        handStrength,
        positionFactor: position,
        opponentAdjustment: 'standard',
        playType: action === 'raise' ? 'value' : action === 'call' ? 'call' : 'fold'
      }
    };
  }

  // ⚡ 执行决策
  private executeDecision(decision: AIDecision): void {
    console.log(`⚡ ${this.config.name} 执行决策: ${decision.action} ${decision.amount || ''}`);
    console.log(`   推理: ${decision.reasoning}`);
    console.log(`   信心: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`   耗时: ${decision.decisionTime}ms`);

    // 发送玩家行动事件
    globalEventBus.emit(PokerEventType.PLAYER_ACTION, {
      playerId: this.config.id,
      playerName: this.config.name,
      action: decision.action,
      amount: decision.amount,
      reasoning: decision.reasoning,
      confidence: decision.confidence
    }, this.config.id);
  }

  // 🏗️ 初始化对手档案
  private initializeOpponentProfiles(): void {
    if (!this.gameState) return;

    this.gameState.players.forEach(player => {
      if (player.id !== this.config.id) {
        this.opponentProfiles.set(player.id, {
          playerId: player.id,
          playerName: player.name,
          vpip: 25, // 默认值
          pfr: 18,
          aggression: 1.5,
          tightness: 0.5,
          bluffFrequency: 0.2,
          positionAwareness: 0.5,
          recentActions: [],
          lastUpdate: Date.now(),
          tendency: 'TAG'
        });
      }
    });

    console.log(`🏗️ ${this.config.name} 初始化了 ${this.opponentProfiles.size} 个对手档案`);
  }

  // 📊 更新对手档案
  private updateOpponentProfile(actionData: any): void {
    const profile = this.opponentProfiles.get(actionData.playerId);
    if (!profile) return;

    // 添加最近行动
    profile.recentActions.push({
      action: actionData.action,
      amount: actionData.amount,
      position: actionData.position || 'unknown',
      phase: this.gameState?.phase || 'unknown',
      outcome: 'pending',
      timestamp: Date.now()
    });

    // 限制历史记录长度
    if (profile.recentActions.length > 20) {
      profile.recentActions.shift();
    }

    profile.lastUpdate = Date.now();

    console.log(`📊 ${this.config.name} 更新对手档案: ${profile.playerName}`);
  }

  // 🧮 计算手牌强度
  private calculateHandStrength(cards: Card[]): number {
    if (cards.length !== 2) return 0;

    // 简化的手牌强度计算（基于Chen公式）
    const [card1, card2] = cards;
    const rank1 = this.getCardRankValue(card1.rank);
    const rank2 = this.getCardRankValue(card2.rank);
    
    let strength = Math.max(rank1, rank2);
    
    // 对子加成
    if (rank1 === rank2) {
      strength += rank1;
    }
    
    // 同花加成
    if (card1.suit === card2.suit) {
      strength += 2;
    }
    
    // 连牌加成
    const gap = Math.abs(rank1 - rank2);
    if (gap <= 4) {
      strength += (5 - gap);
    }
    
    // 标准化到0-1
    return Math.min(strength / 20, 1);
  }

  // 🎯 计算可玩性
  private calculatePlayability(cards: Card[]): number {
    // 简化实现
    return this.calculateHandStrength(cards) * (0.8 + this.config.personality.aggression * 0.4);
  }

  // 📍 获取自己的位置
  private getMyPosition(): string {
    if (!this.gameState) return 'unknown';
    
    const myIndex = this.gameState.players.findIndex(p => p.id === this.config.id);
    const dealerIndex = this.gameState.dealerIndex;
    const totalPlayers = this.gameState.players.length;
    
    const positionIndex = (myIndex - dealerIndex + totalPlayers) % totalPlayers;
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];
    
    return positions[positionIndex] || `POS${positionIndex}`;
  }

  // 💰 计算底池赔率
  private calculatePotOdds(): number {
    if (!this.gameState) return 0;
    
    const toCall = this.gameState.currentBet; // 简化
    const potSize = this.gameState.pot;
    
    return potSize / (toCall || 1);
  }

  // 🃏 格式化牌面
  private formatCards(cards: Card[]): string {
    return cards.map(card => `${card.rank}${card.suit}`).join(' ');
  }

  // 🔢 获取牌面数值
  private getCardRankValue(rank: string): number {
    const values: { [key: string]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
  }

  // 🎯 公共接口
  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getOpponentProfiles(): Map<string, OpponentProfile> {
    return new Map(this.opponentProfiles);
  }

  getDecisionHistory(): AIDecision[] {
    return [...this.decisionHistory];
  }

  isCurrentlyActive(): boolean {
    return this.isActive;
  }
}
