import { Card, GamePhase, Player } from '../types/poker';

// 🎯 游戏事件定义
export interface GameEvent {
  type: GameEventType;
  playerId?: string;
  data: any;
  timestamp: number;
}

export enum GameEventType {
  GAME_START = 'game_start',
  CARDS_DEALT = 'cards_dealt',
  PLAYER_ACTION = 'player_action',
  PHASE_CHANGE = 'phase_change',
  GAME_END = 'game_end',
  PLAYER_ELIMINATED = 'player_eliminated',
  BLINDS_POSTED = 'blinds_posted'
}

// 🎮 新的游戏状态结构
export interface NewGameState {
  // 基础信息
  gameId: string;
  phase: GamePhase;
  round: number;
  
  // 玩家信息
  players: Player[];
  activePlayerIndex: number;
  dealerIndex: number;
  
  // 牌面信息
  communityCards: Card[];
  pot: number;
  currentBet: number;
  
  // 盲注设置
  smallBlind: number;
  bigBlind: number;
  
  // 行动历史
  actionHistory: ActionRecord[];
  currentRoundActions: ActionRecord[];
  
  // 时间信息
  roundStartTime: number;
  actionStartTime: number;
  
  // 游戏状态
  isGameActive: boolean;
  winners?: Player[];
}

export interface ActionRecord {
  playerId: string;
  playerName: string;
  action: string;
  amount: number;
  timestamp: number;
  phase: GamePhase;
  position: string;
}

// 🏗️ 事件总线
export class EventBus {
  private handlers: Map<GameEventType, ((event: GameEvent) => void)[]> = new Map();
  private eventHistory: GameEvent[] = [];

  subscribe(eventType: GameEventType, handler: (event: GameEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  emit(event: GameEvent): void {
    this.eventHistory.push(event);
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`事件处理错误 ${event.type}:`, error);
      }
    });
  }

  getEventHistory(): GameEvent[] {
    return [...this.eventHistory];
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}

// 🎮 核心游戏引擎
export class PokerGameEngine {
  private gameState: NewGameState;
  private eventBus: EventBus;
  private gameConfig: GameConfig;

  constructor(config: GameConfig) {
    this.gameConfig = config;
    this.eventBus = new EventBus();
    this.gameState = this.initializeGameState();
    
    console.log('🎮 PokerGameEngine 初始化完成');
    console.log('📊 游戏配置:', config);
  }

  private initializeGameState(): NewGameState {
    return {
      gameId: `game_${Date.now()}`,
      phase: 'waiting' as GamePhase,
      round: 0,
      players: [],
      activePlayerIndex: -1,
      dealerIndex: 0,
      communityCards: [],
      pot: 0,
      currentBet: 0,
      smallBlind: this.gameConfig.smallBlind,
      bigBlind: this.gameConfig.bigBlind,
      actionHistory: [],
      currentRoundActions: [],
      roundStartTime: 0,
      actionStartTime: 0,
      isGameActive: false
    };
  }

  // 🎯 公共接口
  getGameState(): NewGameState {
    return { ...this.gameState };
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  // 🚀 开始新游戏
  startNewGame(players: Player[]): void {
    console.log('🚀 开始新游戏');
    
    this.gameState.players = [...players];
    this.gameState.isGameActive = true;
    this.gameState.round = 1;
    this.gameState.roundStartTime = Date.now();
    
    this.eventBus.emit({
      type: GameEventType.GAME_START,
      data: { players: this.gameState.players },
      timestamp: Date.now()
    });

    this.startNewRound();
  }

  // 🃏 开始新一轮
  private startNewRound(): void {
    console.log(`🃏 开始第 ${this.gameState.round} 轮`);
    
    // 重置轮次状态
    this.gameState.phase = 'preflop';
    this.gameState.pot = 0;
    this.gameState.currentBet = 0;
    this.gameState.communityCards = [];
    this.gameState.currentRoundActions = [];
    this.gameState.roundStartTime = Date.now();
    
    // 发牌
    this.dealCards();
    
    // 下盲注
    this.postBlinds();
    
    // 开始翻牌前行动
    this.startPreflop();
  }

  // 🃏 发牌
  private dealCards(): void {
    // 这里简化处理，实际发牌逻辑在具体实现中
    console.log('🃏 发牌给所有玩家');
    
    this.eventBus.emit({
      type: GameEventType.CARDS_DEALT,
      data: { phase: 'preflop' },
      timestamp: Date.now()
    });
  }

  // 💰 下盲注
  private postBlinds(): void {
    const sbIndex = (this.gameState.dealerIndex + 1) % this.gameState.players.length;
    const bbIndex = (this.gameState.dealerIndex + 2) % this.gameState.players.length;
    
    console.log(`💰 小盲注: ${this.gameState.players[sbIndex].name} (${this.gameState.smallBlind})`);
    console.log(`💰 大盲注: ${this.gameState.players[bbIndex].name} (${this.gameState.bigBlind})`);
    
    this.gameState.pot = this.gameState.smallBlind + this.gameState.bigBlind;
    this.gameState.currentBet = this.gameState.bigBlind;
    
    this.eventBus.emit({
      type: GameEventType.BLINDS_POSTED,
      data: { 
        smallBlind: this.gameState.smallBlind,
        bigBlind: this.gameState.bigBlind,
        sbPlayer: this.gameState.players[sbIndex].name,
        bbPlayer: this.gameState.players[bbIndex].name
      },
      timestamp: Date.now()
    });
  }

  // 🎯 开始翻牌前
  private startPreflop(): void {
    // UTG开始行动（大盲注后一位）
    this.gameState.activePlayerIndex = (this.gameState.dealerIndex + 3) % this.gameState.players.length;
    this.gameState.actionStartTime = Date.now();
    
    console.log(`🎯 翻牌前开始，轮到 ${this.gameState.players[this.gameState.activePlayerIndex].name} 行动`);
  }

  // 🎲 处理玩家行动
  processPlayerAction(playerId: string, action: string, amount: number = 0): boolean {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      console.error('❌ 玩家不存在:', playerId);
      return false;
    }

    if (this.gameState.players[this.gameState.activePlayerIndex].id !== playerId) {
      console.error('❌ 不是该玩家的回合:', playerId);
      return false;
    }

    console.log(`🎲 ${player.name} 执行行动: ${action} ${amount || ''}`);

    // 记录行动
    const actionRecord: ActionRecord = {
      playerId,
      playerName: player.name,
      action,
      amount,
      timestamp: Date.now(),
      phase: this.gameState.phase,
      position: this.getPlayerPosition(playerId)
    };

    this.gameState.actionHistory.push(actionRecord);
    this.gameState.currentRoundActions.push(actionRecord);

    // 发送事件
    this.eventBus.emit({
      type: GameEventType.PLAYER_ACTION,
      playerId,
      data: actionRecord,
      timestamp: Date.now()
    });

    // 移动到下一个玩家
    this.moveToNextPlayer();

    return true;
  }

  // ➡️ 移动到下一个玩家
  private moveToNextPlayer(): void {
    this.gameState.activePlayerIndex = (this.gameState.activePlayerIndex + 1) % this.gameState.players.length;
    this.gameState.actionStartTime = Date.now();
    
    console.log(`➡️ 轮到 ${this.gameState.players[this.gameState.activePlayerIndex].name} 行动`);
  }

  // 📍 获取玩家位置
  private getPlayerPosition(playerId: string): string {
    const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = this.gameState.dealerIndex;
    const totalPlayers = this.gameState.players.length;

    // 计算相对于庄家的位置
    const positionIndex = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;

    // 9人桌标准位置顺序：庄家开始顺时针
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];

    console.log(`🔍 GameEngine位置计算: 玩家${playerId} playerIndex=${playerIndex}, dealerIndex=${dealerIndex}, positionIndex=${positionIndex}, 位置=${positions[positionIndex]}`);

    return positions[positionIndex] || `POS${positionIndex}`;
  }
}

// 🔧 游戏配置
export interface GameConfig {
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  decisionTimeoutMs: number;
}

// 🎯 默认配置
export const DEFAULT_GAME_CONFIG: GameConfig = {
  smallBlind: 50,
  bigBlind: 100,
  maxPlayers: 9,
  decisionTimeoutMs: 30000 // 30秒超时
};
