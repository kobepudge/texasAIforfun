import { GameState, Player, Card } from '../types/poker';

// 🚀 AI上下文缓存系统 - 加速AI决策
export class AIContextCache {
  private static instance: AIContextCache;
  private gameContextCache: Map<string, CachedGameContext> = new Map();
  private playerProfileCache: Map<string, PlayerProfile> = new Map();
  private handAnalysisCache: Map<string, HandAnalysis> = new Map();

  // 缓存过期时间（毫秒）
  private readonly GAME_CONTEXT_TTL = 30000; // 30秒
  private readonly PLAYER_PROFILE_TTL = 300000; // 5分钟
  private readonly HAND_ANALYSIS_TTL = 60000; // 1分钟

  private constructor() {}

  public static getInstance(): AIContextCache {
    if (!AIContextCache.instance) {
      AIContextCache.instance = new AIContextCache();
    }
    return AIContextCache.instance;
  }

  // 🎯 获取或创建游戏上下文缓存
  public getGameContext(gameState: GameState, playerId: string): CachedGameContext | null {
    const cacheKey = this.generateGameContextKey(gameState, playerId);
    const cached = this.gameContextCache.get(cacheKey);
    
    if (cached && !this.isExpired(cached.timestamp, this.GAME_CONTEXT_TTL)) {
      console.log(`🎯 命中游戏上下文缓存: ${cacheKey}`);
      return cached;
    }
    
    console.log(`❌ 游戏上下文缓存未命中: ${cacheKey}`);
    return null;
  }

  // 🎯 缓存游戏上下文
  public cacheGameContext(gameState: GameState, playerId: string, context: any): void {
    const cacheKey = this.generateGameContextKey(gameState, playerId);
    const cachedContext: CachedGameContext = {
      context,
      timestamp: Date.now(),
      gamePhase: gameState.phase,
      potSize: gameState.pot,
      playerId
    };
    
    this.gameContextCache.set(cacheKey, cachedContext);
    console.log(`💾 缓存游戏上下文: ${cacheKey}`);
  }

  // 🧠 获取玩家行为档案
  public getPlayerProfile(playerId: string): PlayerProfile | null {
    const cached = this.playerProfileCache.get(playerId);
    
    if (cached && !this.isExpired(cached.timestamp, this.PLAYER_PROFILE_TTL)) {
      console.log(`🧠 命中玩家档案缓存: ${playerId}`);
      return cached;
    }
    
    return null;
  }

  // 🧠 更新玩家行为档案
  public updatePlayerProfile(playerId: string, action: string, amount: number, gamePhase: string): void {
    let profile = this.playerProfileCache.get(playerId);
    
    if (!profile || this.isExpired(profile.timestamp, this.PLAYER_PROFILE_TTL)) {
      profile = {
        playerId,
        timestamp: Date.now(),
        actionHistory: [],
        tendencies: {
          aggression: 0.5,
          tightness: 0.5,
          bluffFrequency: 0.1
        },
        recentActions: []
      };
    }

    // 更新行为历史
    profile.actionHistory.push({ action, amount, gamePhase, timestamp: Date.now() });
    profile.recentActions.push({ action, amount, gamePhase });
    
    // 保持最近20个行动
    if (profile.recentActions.length > 20) {
      profile.recentActions = profile.recentActions.slice(-20);
    }

    // 更新倾向性分析
    this.updateTendencies(profile);
    
    profile.timestamp = Date.now();
    this.playerProfileCache.set(playerId, profile);
    
    console.log(`🧠 更新玩家档案: ${playerId}, 行动: ${action}`);
  }

  // 🃏 获取手牌分析缓存
  public getHandAnalysis(holeCards: Card[], communityCards: Card[]): HandAnalysis | null {
    const cacheKey = this.generateHandKey(holeCards, communityCards);
    const cached = this.handAnalysisCache.get(cacheKey);
    
    if (cached && !this.isExpired(cached.timestamp, this.HAND_ANALYSIS_TTL)) {
      console.log(`🃏 命中手牌分析缓存: ${cacheKey}`);
      return cached;
    }
    
    return null;
  }

  // 🃏 缓存手牌分析
  public cacheHandAnalysis(holeCards: Card[], communityCards: Card[], analysis: any): void {
    const cacheKey = this.generateHandKey(holeCards, communityCards);
    const handAnalysis: HandAnalysis = {
      analysis,
      timestamp: Date.now(),
      holeCards: [...holeCards],
      communityCards: [...communityCards]
    };
    
    this.handAnalysisCache.set(cacheKey, handAnalysis);
    console.log(`💾 缓存手牌分析: ${cacheKey}`);
  }

  // 🔧 生成缓存键
  private generateGameContextKey(gameState: GameState, playerId: string): string {
    return `game_${gameState.phase}_${gameState.pot}_${gameState.currentBet}_${playerId}`;
  }

  private generateHandKey(holeCards: Card[], communityCards: Card[]): string {
    const holeKey = holeCards.map(c => `${c.rank}${c.suit}`).sort().join('');
    const communityKey = communityCards.map(c => `${c.rank}${c.suit}`).sort().join('');
    return `hand_${holeKey}_${communityKey}`;
  }

  // 🕐 检查是否过期
  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  // 📊 更新玩家倾向性
  private updateTendencies(profile: PlayerProfile): void {
    const recent = profile.recentActions.slice(-10);
    if (recent.length === 0) return;

    // 计算激进度
    const aggressiveActions = recent.filter(a => a.action === 'raise' || a.action === 'all-in').length;
    profile.tendencies.aggression = aggressiveActions / recent.length;

    // 计算紧密度
    const foldActions = recent.filter(a => a.action === 'fold').length;
    profile.tendencies.tightness = foldActions / recent.length;

    // 估算虚张声势频率（简化版）
    const bluffActions = recent.filter(a => a.action === 'raise' && a.amount > 0).length;
    profile.tendencies.bluffFrequency = Math.min(bluffActions / recent.length, 0.3);
  }

  // 🧹 清理过期缓存
  public cleanupExpiredCache(): void {
    const now = Date.now();
    
    // 清理游戏上下文缓存
    for (const [key, value] of this.gameContextCache.entries()) {
      if (this.isExpired(value.timestamp, this.GAME_CONTEXT_TTL)) {
        this.gameContextCache.delete(key);
      }
    }

    // 清理玩家档案缓存
    for (const [key, value] of this.playerProfileCache.entries()) {
      if (this.isExpired(value.timestamp, this.PLAYER_PROFILE_TTL)) {
        this.playerProfileCache.delete(key);
      }
    }

    // 清理手牌分析缓存
    for (const [key, value] of this.handAnalysisCache.entries()) {
      if (this.isExpired(value.timestamp, this.HAND_ANALYSIS_TTL)) {
        this.handAnalysisCache.delete(key);
      }
    }

    console.log(`🧹 缓存清理完成`);
  }

  // 📊 获取缓存统计
  public getCacheStats(): CacheStats {
    return {
      gameContextCacheSize: this.gameContextCache.size,
      playerProfileCacheSize: this.playerProfileCache.size,
      handAnalysisCacheSize: this.handAnalysisCache.size,
      totalCacheSize: this.gameContextCache.size + this.playerProfileCache.size + this.handAnalysisCache.size
    };
  }
}

// 类型定义
interface CachedGameContext {
  context: any;
  timestamp: number;
  gamePhase: string;
  potSize: number;
  playerId: string;
}

interface PlayerProfile {
  playerId: string;
  timestamp: number;
  actionHistory: Array<{
    action: string;
    amount: number;
    gamePhase: string;
    timestamp: number;
  }>;
  tendencies: {
    aggression: number;
    tightness: number;
    bluffFrequency: number;
  };
  recentActions: Array<{
    action: string;
    amount: number;
    gamePhase: string;
  }>;
}

interface HandAnalysis {
  analysis: any;
  timestamp: number;
  holeCards: Card[];
  communityCards: Card[];
}

interface CacheStats {
  gameContextCacheSize: number;
  playerProfileCacheSize: number;
  handAnalysisCacheSize: number;
  totalCacheSize: number;
}
