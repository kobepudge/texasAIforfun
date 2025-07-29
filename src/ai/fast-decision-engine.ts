import { NewGameState } from '../core/game-engine';
import { Card } from '../types/poker';
import { AdaptivePromptManager } from './adaptive-prompt-manager.ts';
import { AIAPIPool } from './ai-api-pool.ts';
import { AIDecision, OpponentProfile } from './ai-player.ts';
import { SituationComplexityAnalyzer } from './situation-complexity-analyzer.ts';
import { PokerContextCacheManager, CachedPromptRequest } from './poker-context-cache-manager.ts';
import { RealPokerMathEngine } from './real-poker-math.ts';
import { ConversationManager } from './conversation-manager.ts';

// 🎯 游戏数据结构
export interface GameData {
  // 基础信息
  position: string;
  positionIndex: number;
  holeCards: string;
  myChips: number;
  pot: number;
  currentBet: number;
  toCall: number;

  // 牌面信息
  board?: string;
  boardTexture?: string;
  drawHeavy?: boolean;

  // 对手信息
  activePlayers: number;
  totalPlayers: number;
  actionSequence: string;
  opponentProfiles: OpponentProfileSummary[];
  opponentRanges?: string;

  // 赔率信息
  potOdds: string;

  // 行动历史
  currentRoundActions?: string;
  recentOpponentBehavior?: string;

  // 时间信息
  timeLimit: number;
  phase: string;
}

export interface OpponentProfileSummary {
  name: string;
  position: string;
  vpip: number;
  pfr: number;
  aggression: number;
  tendency: string;
}

// 🚀 决策层级
export enum DecisionLayer {
  FAST_FILTER = 1,    // 快速过滤 (50ms)
  STRATEGY_ANALYSIS = 2, // 策略分析 (1-3s)
  FINE_TUNING = 3     // 精细调整 (200ms)
}

// 📊 决策缓存
export interface CachedDecision {
  situationKey: string;
  decision: AIDecision;
  timestamp: number;
  hitCount: number;
  confidence: number;
}

// ⚡ 快速决策引擎 - 升级版：Context Caching + 对话状态管理
export class FastDecisionEngine {
  private decisionCache: Map<string, CachedDecision> = new Map();
  private apiPool: AIAPIPool;
  private promptManager: PromptManager;
  private performanceTracker: PerformanceTracker;
  private complexityAnalyzer: SituationComplexityAnalyzer;
  private adaptivePromptManager: AdaptivePromptManager;
  
  // 🔥 新增：Context Caching + 真实计算 + 对话管理
  private contextCacheManager: PokerContextCacheManager;
  private pokerMath: RealPokerMathEngine;
  private conversationManager: ConversationManager;
  
  // 🎯 玩家对话状态映射
  private playerConversations: Map<string, string> = new Map(); // playerId -> conversationId

  constructor(apiConfig: any) {
    const poolConfig = {
      apiKey: apiConfig.apiKey,
      baseUrl: apiConfig.baseUrl,
      model: apiConfig.model,
      temperature: 0.1,
      maxTokens: 150,
      timeout: 0 // 移除超时限制
    };

    this.apiPool = new AIAPIPool(poolConfig, 3); // 3个并行连接
    this.promptManager = new PromptManager();
    this.performanceTracker = new PerformanceTracker();
    this.complexityAnalyzer = new SituationComplexityAnalyzer();
    this.adaptivePromptManager = new AdaptivePromptManager();
    
    // 🔥 新增：Context Caching + 真实计算 + 对话管理引擎
    this.contextCacheManager = new PokerContextCacheManager();
    this.pokerMath = new RealPokerMathEngine();
    this.conversationManager = new ConversationManager(poolConfig);

    console.log('⚡ 快速决策引擎V3.0初始化完成 (Context Caching + 对话状态管理)');
  }

  // 🔥 AI玩家预热 - 建立Context Caching对话状态
  async warmupAIPlayer(playerId: string, playerName: string): Promise<void> {
    try {
      console.log(`🔥 开始预热AI玩家: ${playerName} (${playerId})`);
      
      const conversationId = await this.conversationManager.initializePlayerConversation(playerId, playerName);
      this.playerConversations.set(playerId, conversationId);
      
      console.log(`✅ AI玩家${playerName}预热完成，对话ID: ${conversationId}`);
      
    } catch (error) {
      console.error(`❌ AI玩家${playerName}预热失败:`, error);
      throw error;
    }
  }

  // 🎯 并发预热多个AI玩家
  async warmupMultipleAIPlayers(players: Array<{id: string, name: string}>): Promise<void> {
    console.log(`🚀 开始并发预热${players.length}个AI玩家...`);
    
    const warmupPromises = players.map(player => 
      this.warmupAIPlayer(player.id, player.name)
    );
    
    try {
      await Promise.all(warmupPromises);
      console.log(`✅ 所有${players.length}个AI玩家预热完成`);
      
      // 输出统计信息
      const stats = this.conversationManager.getStatistics();
      console.log(`📊 对话状态统计:`, stats);
      
    } catch (error) {
      console.error('❌ 批量AI预热失败:', error);
      throw error;
    }
  }

  // 🚀 新的Ultra-Fast决策入口 - Context Caching优化
  async makeUltraFastDecision(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    opponentProfiles: Map<string, OpponentProfile>,
    timeLimit: number = 0
  ): Promise<AIDecision> {
    const startTime = Date.now();

    try {
      console.log('🚀 启动Ultra-Fast智能决策引擎');

      // 🚀 翻前优先使用GTO查表 (0-5ms极速决策)
      if (gameState.phase === 'preflop') {
        console.log('⚡ 翻前阶段，优先使用GTO查表决策');

        try {
          const gtoDecision = await this.getGTOPreflopDecision(gameState, playerId, holeCards);
          if (gtoDecision) {
            const totalTime = Date.now() - startTime;
            console.log(`⚡ GTO翻前决策完成: ${gtoDecision.action} (${totalTime}ms)`);
            return gtoDecision;
          }
        } catch (gtoError) {
          console.warn('⚠️ GTO决策失败，回退到Context Caching:', gtoError);
        }
      }

      // 🔥 翻后或GTO失败：使用对话状态的Context Caching
      console.log('🧠 使用对话状态Context Caching专业决策系统');
      
      // Step 1: 获取玩家的对话ID
      const conversationId = this.playerConversations.get(playerId);
      if (!conversationId) {
        console.warn(`⚠️ 玩家${playerId}没有预热对话，回退到传统方式`);
        return await this.makeDecision(gameState, playerId, holeCards, opponentProfiles, timeLimit);
      }
      
      // Step 2: 构建游戏数据并进行真实计算
      const gameData = this.buildEnhancedGameData(gameState, playerId, holeCards, opponentProfiles);
      
      console.log(`🎯 使用预热对话 ${conversationId} 进行决策 (享受Context Caching加速)`);

      // Step 3: 在对话中进行决策（利用缓存）
      const aiResponse = await this.conversationManager.makeDecisionInConversation(conversationId, gameData);
      
      // Step 4: 解析AI响应
      const decision = this.parseConversationResponse(aiResponse);
      
      // 记录性能
      const totalTime = Date.now() - startTime;
      this.performanceTracker.recordDecision(playerId, totalTime, decision.confidence);
      
      console.log(`⚡ 对话Context Caching决策完成: ${decision.action} (${totalTime}ms)`);
      
      return decision;

    } catch (error) {
      console.error('❌ Ultra-Fast决策失败，回退到传统方式:', error);
      return await this.makeDecision(gameState, playerId, holeCards, opponentProfiles, timeLimit);
    }
  }

  // 🎯 原有决策入口（保持兼容性）
  async makeDecision(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    opponentProfiles: Map<string, OpponentProfile>,
    timeLimit: number = 0 // 移除时间限制
  ): Promise<AIDecision> {
    const startTime = Date.now();

    try {
      // 🚀 翻前优先使用GTO查表 (0ms决策)
      if (gameState.phase === 'preflop') {
        console.log('⚡ 翻前阶段，使用GTO查表决策');

        try {
          const gtoDecision = await this.getGTOPreflopDecision(gameState, playerId, holeCards);
          if (gtoDecision) {
            const totalTime = Date.now() - startTime;
            console.log(`⚡ GTO翻前决策完成: ${gtoDecision.action} (${totalTime}ms)`);
            return gtoDecision;
          }
        } catch (gtoError) {
          console.warn('⚠️ GTO决策失败，回退到AI决策:', gtoError);
        }
      }

      // 🔥 GTO失败后使用AI决策系统 (备用方案)
      console.log('🧠 使用AI决策系统 (GTO查表失败后的备用方案)');

      // 构建游戏数据
      const gameData = this.buildGameData(gameState, playerId, holeCards, opponentProfiles, timeLimit);

      // 三层决策架构
      const decision = await this.executeLayeredDecision(gameData, gameState, playerId, holeCards);

      // 记录性能
      const totalTime = Date.now() - startTime;
      this.performanceTracker.recordDecision(playerId, totalTime, decision.confidence);

      console.log(`⚡ 决策完成: ${decision.action} (${totalTime}ms)`);

      return decision;

    } catch (error) {
      console.error('❌ 决策引擎错误:', error);

      // 返回安全的默认决策
      return this.getEmergencyDecision(gameState, holeCards);
    }
  }

  // 🏗️ 构建游戏数据
  private buildGameData(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    opponentProfiles: Map<string, OpponentProfile>,
    timeLimit: number
  ): GameData {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('玩家不存在');

    const position = this.getPlayerPosition(gameState, playerId);
    const positionIndex = gameState.players.findIndex(p => p.id === playerId);

    // 构建对手档案摘要
    const opponentSummaries: OpponentProfileSummary[] = [];
    gameState.players.forEach(p => {
      if (p.id !== playerId) {
        const profile = opponentProfiles.get(p.id);
        if (profile) {
          opponentSummaries.push({
            name: p.name,
            position: this.getPlayerPosition(gameState, p.id),
            vpip: profile.vpip,
            pfr: profile.pfr,
            aggression: profile.aggression,
            tendency: profile.tendency
          });
        }
      }
    });

    // 构建行动序列
    const actionSequence = this.buildActionSequence(gameState);

    // 计算底池赔率
    const toCall = Math.max(0, gameState.currentBet - (player.currentBet || 0));
    const potOdds = toCall > 0 ? `${(gameState.pot / toCall).toFixed(1)}:1` : 'N/A';

    return {
      position,
      positionIndex,
      holeCards: this.formatCards(holeCards),
      myChips: player.chips,
      pot: gameState.pot,
      currentBet: gameState.currentBet,
      toCall,
      activePlayers: gameState.players.filter(p => p.isActive).length,
      totalPlayers: gameState.players.length,
      actionSequence,
      opponentProfiles: opponentSummaries,
      potOdds,
      timeLimit,
      phase: gameState.phase,

      // 翻牌后信息
      ...(gameState.phase !== 'preflop' && {
        board: this.formatCards(gameState.communityCards),
        boardTexture: this.analyzeBoardTexture(gameState.communityCards),
        drawHeavy: this.isDrawHeavyBoard(gameState.communityCards),
        currentRoundActions: this.buildCurrentRoundActions(gameState),
        recentOpponentBehavior: this.buildOpponentBehaviorSummary(opponentProfiles)
      })
    };
  }

  // 🎯 执行分层决策
  private async executeLayeredDecision(
    gameData: GameData,
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[]
  ): Promise<AIDecision> {
    console.log('🚀 强制使用AI API决策 - 跳过缓存和明显决策');

    // 直接进行策略分析 (强制使用API)
    const strategicDecision = await this.performStrategicAnalysis(gameData, gameState, playerId, holeCards);

    // Layer 3: 精细调整
    const finalDecision = this.applyFineTuning(strategicDecision, gameData);

    return finalDecision;
  }

  // ⚡ 尝试快速决策
  private async tryQuickDecision(gameData: GameData): Promise<AIDecision | null> {
    const startTime = Date.now();

    // 检查缓存
    const cachedDecision = this.checkDecisionCache(gameData);
    if (cachedDecision) {
      console.log('🎯 缓存命中');
      return cachedDecision.decision;
    }

    // 明显的决策情况
    const obviousDecision = this.checkObviousDecisions(gameData);
    if (obviousDecision) {
      console.log('🎯 明显决策');
      return obviousDecision;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 50) {
      console.log(`⚠️ 快速决策超时: ${elapsed}ms`);
    }

    return null;
  }

  // 🧠 执行策略分析
  private async performStrategicAnalysis(
    gameData: GameData,
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[]
  ): Promise<AIDecision> {
    const startTime = Date.now();

    try {
      // 🎯 分析局势复杂度
      const complexityAssessment = this.complexityAnalyzer.analyzeSituation(
        gameState,
        playerId,
        holeCards
      );

      console.log(`🎯 局势复杂度: ${complexityAssessment.category} (${complexityAssessment.totalScore}/100)`);
      console.log(`📊 推荐: 超时${complexityAssessment.recommendedTimeout}ms, 温度${complexityAssessment.recommendedTemperature}, Prompt${complexityAssessment.promptType}`);

      // 🚀 移除超时限制，使用推荐温度
      const dynamicTimeLimit = 0; // 完全移除超时限制

      // 📝 生成自适应Prompt
      const adaptivePrompt = this.adaptivePromptManager.generatePrompt(
        gameState,
        playerId,
        holeCards,
        complexityAssessment.promptType,
        dynamicTimeLimit,
        complexityAssessment.recommendedTemperature
      );

      console.log(`🧠 发起智能AI决策请求 (无时限, 温度: ${complexityAssessment.recommendedTemperature})`);

      // 🚀 使用动态配置的API请求
      const decision = await this.apiPool.makeDecisionRequestWithConfig(
        adaptivePrompt,
        dynamicTimeLimit,
        complexityAssessment.recommendedTemperature
      );
      console.log('⚡ 智能AI决策请求成功');

      // 设置决策时间和复杂度信息
      decision.decisionTime = Date.now() - startTime;
      decision.metadata = {
        ...decision.metadata,
        complexityScore: complexityAssessment.totalScore,
        complexityCategory: complexityAssessment.category,
        promptType: complexityAssessment.promptType
      };

      // 缓存决策
      this.cacheDecision(gameData, decision);

      const elapsed = Date.now() - startTime;
      console.log(`🧠 智能策略分析完成: ${elapsed}ms, 决策: ${decision.action}, 复杂度: ${complexityAssessment.category}`);

      return decision;

    } catch (error) {
      console.error('❌ 策略分析失败:', error);

      // 回退到基础决策
      const fallbackDecision = this.getBasicDecision(gameData);
      fallbackDecision.decisionTime = Date.now() - startTime;
      fallbackDecision.reasoning += ' (AI失败回退)';

      return fallbackDecision;
    }
  }

  // 🎨 应用精细调整
  private applyFineTuning(decision: AIDecision, gameData: GameData): AIDecision {
    const startTime = Date.now();

    // 随机化处理（避免被读牌）
    if (decision.action === 'raise' && Math.random() < 0.1) {
      // 10%概率调整下注尺寸
      decision.amount = Math.floor(decision.amount * (0.8 + Math.random() * 0.4));
    }

    // 位置调整
    if (gameData.position === 'BTN' && decision.action === 'call') {
      // 按钮位置更激进
      if (Math.random() < 0.2) {
        decision.action = 'raise';
        decision.amount = gameData.currentBet * 2.5;
        decision.reasoning += ' (按钮位置加注)';
      }
    }

    // 筹码深度调整
    const stackBB = gameData.myChips / 100; // 转换为大盲倍数
    if (stackBB < 20 && decision.action === 'call') {
      // 短筹码更激进
      decision.action = 'raise';
      decision.amount = gameData.myChips; // 全押
      decision.reasoning += ' (短筹码全押)';
    }

    const elapsed = Date.now() - startTime;
    console.log(`🎨 精细调整完成: ${elapsed}ms`);

    return decision;
  }

  // 🎯 检查明显决策
  private checkObviousDecisions(gameData: GameData): AIDecision | null {
    // 超强牌
    if (this.isNutsHand(gameData.holeCards, gameData.board)) {
      return {
        action: 'raise',
        amount: gameData.pot * 0.8,
        confidence: 0.95,
        reasoning: '超强牌价值下注',
        decisionTime: 50,
        metadata: {
          handStrength: 0.95,
          positionFactor: gameData.position,
          opponentAdjustment: 'value',
          playType: 'value'
        }
      };
    }

    // 垃圾牌面对大注
    if (this.isTrashHand(gameData.holeCards) && gameData.toCall > gameData.pot * 0.5) {
      return {
        action: 'fold',
        amount: 0,
        confidence: 0.9,
        reasoning: '垃圾牌面对大注',
        decisionTime: 50,
        metadata: {
          handStrength: 0.1,
          positionFactor: gameData.position,
          opponentAdjustment: 'fold',
          playType: 'fold'
        }
      };
    }

    // 免费看牌
    if (gameData.toCall === 0) {
      return {
        action: 'check',
        amount: 0,
        confidence: 0.8,
        reasoning: '免费看牌',
        decisionTime: 50,
        metadata: {
          handStrength: 0.5,
          positionFactor: gameData.position,
          opponentAdjustment: 'standard',
          playType: 'check'
        }
      };
    }

    return null;
  }

  // 💾 检查决策缓存
  private checkDecisionCache(gameData: GameData): CachedDecision | null {
    const situationKey = this.generateSituationKey(gameData);
    const cached = this.decisionCache.get(situationKey);

    if (cached && Date.now() - cached.timestamp < 300000) { // 5分钟有效期
      cached.hitCount++;
      return cached;
    }

    return null;
  }

  // 💾 缓存决策
  private cacheDecision(gameData: GameData, decision: AIDecision): void {
    const situationKey = this.generateSituationKey(gameData);

    this.decisionCache.set(situationKey, {
      situationKey,
      decision: { ...decision },
      timestamp: Date.now(),
      hitCount: 0,
      confidence: decision.confidence
    });

    // 限制缓存大小
    if (this.decisionCache.size > 1000) {
      const oldestKey = Array.from(this.decisionCache.keys())[0];
      this.decisionCache.delete(oldestKey);
    }
  }

  // 🔑 生成情况键
  private generateSituationKey(gameData: GameData): string {
    const handStrength = this.calculateHandStrength(gameData.holeCards);
    const positionGroup = this.getPositionGroup(gameData.position);
    const actionType = this.getActionType(gameData.actionSequence);
    const potOddsGroup = this.getPotOddsGroup(gameData.potOdds);

    return `${handStrength}_${positionGroup}_${actionType}_${potOddsGroup}_${gameData.phase}`;
  }

  // 🚀 GTO翻前决策 - 直接HTTP调用
  private async getGTOPreflopDecision(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[]
  ): Promise<AIDecision | null> {
    try {
      // 找到当前玩家
      const currentPlayer = gameState.players.find(p => p.id === playerId);
      if (!currentPlayer) {
        console.warn('⚠️ 找不到当前玩家，跳过GTO决策');
        return null;
      }

      // 格式化手牌
      const hand = this.formatHoleCards(holeCards);
      if (hand === 'XX') {
        console.warn('⚠️ 无效手牌，跳过GTO决策');
        return null;
      }

      // 格式化位置
      const position = this.formatPosition(
        currentPlayer.position,
        gameState.players.length,
        gameState.dealerIndex
      );

      // 计算筹码深度
      const stackBB = Math.round(currentPlayer.chips / (gameState.bigBlind || 100));

      // 🔥 修复：使用真实的行动分析替代硬编码
      const facingAction = await this.analyzeFacingAction(gameState, playerId);

      // 计算后面的玩家数量
      const playersBehind = this.calculatePlayersBehind(gameState, playerId);

      // 直接调用GTO API
      const url = `http://localhost:3001/api/preflop-decision?hand=${hand}&position=${position}&facing_action=${facingAction}&players_behind=${playersBehind}&stack_bb=${stackBB}`;
      
      console.log(`🔍 GTO查询: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GTO API错误: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`GTO决策失败: ${data.error}`);
      }

      const gtoDecision = data.decision;

      // 转换为AI决策格式
      const aiDecision: AIDecision = {
        action: gtoDecision.action === 'all_in' ? 'all-in' : gtoDecision.action,
        amount: this.calculateGTOAmount(gtoDecision, gameState),
        confidence: gtoDecision.frequency,
        reasoning: `GTO翻前策略: ${gtoDecision.reasoning}`,
        decisionTime: 0,
        metadata: {
          handStrength: this.getHandStrengthFromTier(gtoDecision.hand_tier),
          positionFactor: position,
          opponentAdjustment: 'gto',
          playType: 'gto_preflop',
          gtoData: gtoDecision
        }
      };

      return aiDecision;

    } catch (error) {
      console.error('❌ GTO翻前决策失败:', error);
      return null;
    }
  }

  // 计算GTO决策的具体金额
  private calculateGTOAmount(gtoDecision: any, gameState: NewGameState): number {
    const bigBlind = gameState.bigBlind || 100;

    switch (gtoDecision.action) {
      case 'fold':
        return 0;
      case 'call':
        return gameState.currentBet;
      case 'limp':
        return bigBlind;
      case 'raise':
        return Math.round(gtoDecision.amount * bigBlind);
      case 'all_in':
        // 返回一个很大的数字表示全下
        return 999999;
      default:
        return 0;
    }
  }

  // 从手牌等级获取强度值
  private getHandStrengthFromTier(tier: string): number {
    const tierMap: Record<string, number> = {
      'PREMIUM': 0.95,
      'STRONG': 0.8,
      'MEDIUM': 0.6,
      'WEAK': 0.4,
      'SPECULATIVE': 0.3,
      'TRASH': 0.1,
      'UNKNOWN': 0.5
    };

    return tierMap[tier] || 0.5;
  }

  // 🔧 格式化手牌为GTO格式 (从GTO服务复制)
  private formatHoleCards(holeCards: Array<{rank: string, suit: string}>): string {
    if (!holeCards || holeCards.length !== 2) {
      return 'XX';
    }

    const [card1, card2] = holeCards;
    const rank1 = card1.rank === '10' ? 'T' : card1.rank;
    const rank2 = card2.rank === '10' ? 'T' : card2.rank;
    
    // 确定是否同花
    const suited = card1.suit === card2.suit;
    
    // 按强度排序 (A > K > Q > J > T > 9 > ... > 2)
    const rankOrder = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const rank1Index = rankOrder.indexOf(rank1);
    const rank2Index = rankOrder.indexOf(rank2);
    
    let hand: string;
    
    if (rank1 === rank2) {
      // 对子
      hand = `${rank1}${rank2}`;
    } else if (rank1Index < rank2Index) {
      // rank1更强
      hand = `${rank1}${rank2}${suited ? 's' : 'o'}`;
    } else {
      // rank2更强
      hand = `${rank2}${rank1}${suited ? 's' : 'o'}`;
    }
    
    return hand;
  }

  // 🔧 格式化位置为GTO格式 (从GTO服务复制)
  private formatPosition(playerIndex: number, totalPlayers: number, dealerIndex: number): string {
    // 计算相对于庄家的位置
    const relativePosition = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;

    // 9人桌标准位置顺序：庄家开始顺时针
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];

    // 根据玩家数量调整位置映射
    if (totalPlayers <= 6) {
      const shortPositions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
      return shortPositions[relativePosition] || 'UTG';
    }

    console.log(`🔍 GTO位置格式化: playerIndex=${playerIndex}, dealerIndex=${dealerIndex}, relativePosition=${relativePosition}, 位置=${positions[relativePosition]}`);

    return positions[relativePosition] || 'UTG';
  }

  // 🔍 分析面对的行动 (从GTO服务移植)
  private async analyzeFacingAction(gameState: NewGameState, playerId: string): Promise<string> {
    console.log('🔍 分析行动历史:', {
      actionHistory: gameState.actionHistory,
      phase: gameState.phase,
      currentBet: gameState.currentBet,
      bigBlind: gameState.bigBlind || 100,
      playerId
    });

    // 翻前特殊处理
    if (gameState.phase === 'preflop') {
      return this.analyzePreflopAction(gameState, playerId);
    }

    // 翻后处理
    if (!gameState.actionHistory || gameState.actionHistory.length === 0) {
      return 'none';
    }

    // 查找当前轮次的行动
    const currentRoundActions = gameState.actionHistory.filter(
      (action: any) => action.phase === gameState.phase
    );

    if (currentRoundActions.length === 0) {
      return 'none';
    }

    // 分析最后的有效行动（排除弃牌）
    const validActions = currentRoundActions.filter(
      (action: any) => action.action !== 'fold'
    );

    if (validActions.length === 0) {
      return 'none';
    }

    const lastAction = validActions[validActions.length - 1];

    if (lastAction.action === 'raise') {
      const raiseSize = lastAction.amount / (gameState.bigBlind || 100);
      if (raiseSize <= 2.5) return 'raise_2bb';
      if (raiseSize <= 3.5) return 'raise_3bb';
      if (raiseSize <= 4.5) return 'raise_4bb';
      return '3bet';
    }

    if (lastAction.action === 'call') {
      return 'limp';
    }

    return 'none';
  }

  // 🔍 翻前行动分析 (从GTO服务移植并修复)
  private analyzePreflopAction(gameState: NewGameState, playerId: string): string {
    const bigBlind = gameState.bigBlind || 100;
    const currentBet = gameState.currentBet || 0;

    console.log('🔍 翻前行动分析:', {
      currentBet,
      bigBlind,
      ratio: currentBet / bigBlind,
      actionHistory: gameState.actionHistory,
      playerId
    });

    // 获取翻前行动序列
    const preflopActions = gameState.actionHistory?.filter(
      (action: any) => action.phase === 'preflop'
    ) || [];

    // 过滤出有效行动（排除弃牌和盲注）
    const validActions = preflopActions.filter(
      (action: any) => action.action !== 'fold' && action.action !== 'small_blind' && action.action !== 'big_blind'
    );

    console.log('🔍 有效翻前行动:', validActions);

    // 🎯 关键修复：如果当前下注大于大盲，说明有人加注
    if (currentBet > bigBlind) {
      console.log('🎯 检测到加注，当前下注大于大盲:', currentBet, '>', bigBlind);
      
      // 分析加注序列
      const raiseActions = validActions.filter(action => action.action === 'raise');
      const raiseRatio = currentBet / bigBlind;

      // 判断加注类型
      if (raiseActions.length >= 2) {
        if (raiseActions.length >= 3) {
          return '4bet';
        }
        return '3bet';
      }

      // 首次加注，根据大小分类
      if (raiseRatio <= 2.5) {
        return 'raise_2bb';
      } else if (raiseRatio <= 3.5) {
        return 'raise_3bb';
      } else if (raiseRatio <= 4.5) {
        return 'raise_4bb';
      } else {
        return 'raise_4bb'; // 大于4BB的首次加注
      }
    }

    // 如果当前下注等于大盲，检查是否有跛入
    if (currentBet === bigBlind) {
      const callActions = validActions.filter(action => action.action === 'call');
      if (callActions.length > 0) {
        // 🎯 关键修复：检查当前玩家是否为BB
        const currentPlayer = gameState.players?.find((p: any) => p.id === playerId);
        if (currentPlayer) {
          const position = this.formatPosition(
            currentPlayer.position,
            gameState.players.length,
            gameState.dealerIndex
          );

          // 如果当前玩家是BB，且只有跛入没有加注，则facing_action为none
          if (position === 'BB') {
            console.log('🎯 BB位置面对跛入，可以免费看翻牌，facing_action=none');
            return 'none';
          }
        }

        return 'limp';
      }
      return 'none'; // 只有盲注，无人行动
    }

    // 如果当前下注小于大盲（异常情况），返回none
    return 'none';
  }

  // 🔍 计算后面还没行动的玩家数量 (从GTO服务移植)
  private calculatePlayersBehind(gameState: NewGameState, playerId: string): number {
    if (!gameState.players || !gameState.actionHistory) {
      return 0;
    }

    // 找到当前玩家的位置
    const currentPlayerIndex = gameState.players.findIndex((p: any) => p.id === playerId);
    if (currentPlayerIndex === -1) {
      return 0;
    }

    // 获取翻前已经行动的玩家ID
    const preflopActions = gameState.actionHistory.filter(
      (action: any) => action.phase === 'preflop'
    );
    const actedPlayerIds = new Set(preflopActions.map((action: any) => action.playerId));

    // 计算当前玩家后面还没行动的活跃玩家数量
    let playersBehind = 0;
    const totalPlayers = gameState.players.length;

    for (let i = 1; i < totalPlayers; i++) {
      const nextPlayerIndex = (currentPlayerIndex + i) % totalPlayers;
      const nextPlayer = gameState.players[nextPlayerIndex];

      // 如果玩家还活跃且还没行动，计入
      if (nextPlayer.isActive && !actedPlayerIds.has(nextPlayer.id)) {
        playersBehind++;
      }
    }

    console.log(`🔍 计算后面玩家: 当前玩家${playerId}, 后面还有${playersBehind}个玩家未行动`);

    return playersBehind;
  }

  // 🔍 解析对话响应为AI决策
  private parseConversationResponse(responseText: string): AIDecision {
    try {
      // 尝试提取JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中未找到JSON格式');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // 验证必需字段
      if (!parsed.action) {
        throw new Error('缺少action字段');
      }

      // 标准化action格式
      let action = parsed.action.toLowerCase();
      if (action === 'all-in' || action === 'allin') {
        action = 'all-in';
      }

      const decision: AIDecision = {
        action: action as any,
        amount: parsed.amount || 0,
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || '专业分析',
        decisionTime: 0, // 稍后设置
        metadata: {
          handStrength: parsed.hand_strength || 0.5,
          positionFactor: parsed.position_factor || 'unknown',
          opponentAdjustment: parsed.opponent_adjustment || 'standard',
          playType: parsed.play_type || 'balanced',
          conversationBased: true // 标记为对话决策
        }
      };

      return decision;

    } catch (error) {
      console.error('❌ 解析对话响应失败:', error, '原始响应:', responseText);

      // 返回安全的默认决策
      return {
        action: 'fold',
        amount: 0,
        confidence: 0.5,
        reasoning: '解析失败，安全弃牌',
        decisionTime: 0,
        metadata: {
          handStrength: 0,
          positionFactor: 'unknown',
          opponentAdjustment: 'conservative',
          playType: 'emergency_fold',
          conversationBased: false
        }
      };
    }
  }

  // 🚨 紧急决策
  private getEmergencyDecision(gameState: NewGameState, holeCards: Card[]): AIDecision {
    return {
      action: 'fold',
      amount: 0,
      confidence: 0.5,
      reasoning: '系统错误，安全弃牌',
      decisionTime: 0,
      metadata: {
        handStrength: 0,
        positionFactor: 'unknown',
        opponentAdjustment: 'emergency',
        playType: 'emergency_fold'
      }
    };
  }

  // 🎯 基础决策
  private getBasicDecision(gameData: GameData): AIDecision {
    const handStrength = this.calculateHandStrength(gameData.holeCards);

    if (handStrength > 0.7) {
      return {
        action: 'raise',
        amount: Math.round(Math.max(gameData.currentBet * 2, 100)),
        confidence: 0.7,
        reasoning: '强牌基础策略',
        decisionTime: 1000,
        metadata: {
          handStrength,
          positionFactor: gameData.position,
          opponentAdjustment: 'basic',
          playType: 'value'
        }
      };
    } else if (handStrength > 0.4 && gameData.toCall < gameData.pot * 0.3) {
      return {
        action: 'call',
        amount: gameData.toCall,
        confidence: 0.6,
        reasoning: '中等牌力跟注',
        decisionTime: 1000,
        metadata: {
          handStrength,
          positionFactor: gameData.position,
          opponentAdjustment: 'basic',
          playType: 'call'
        }
      };
    } else {
      return {
        action: 'fold',
        amount: 0,
        confidence: 0.8,
        reasoning: '牌力不足弃牌',
        decisionTime: 1000,
        metadata: {
          handStrength,
          positionFactor: gameData.position,
          opponentAdjustment: 'basic',
          playType: 'fold'
        }
      };
    }
  }

  // 🔧 辅助方法
  private getPlayerPosition(gameState: NewGameState, playerId: string): string {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = gameState.dealerIndex;
    const totalPlayers = gameState.players.length;

    // 计算相对于庄家的位置
    const positionIndex = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;

    // 9人桌标准位置顺序：庄家开始顺时针
    // 位置0: BTN, 位置1: SB, 位置2: BB, 位置3: UTG, 位置4: UTG+1, 位置5: UTG+2, 位置6: MP, 位置7: MP+1, 位置8: CO
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];

    console.log(`🔍 位置计算: 玩家${playerId} playerIndex=${playerIndex}, dealerIndex=${dealerIndex}, positionIndex=${positionIndex}, 位置=${positions[positionIndex]}`);

    return positions[positionIndex] || `POS${positionIndex}`;
  }

  private formatCards(cards: Card[]): string {
    return cards.map(card => `${card.rank}${card.suit}`).join(' ');
  }

  private buildActionSequence(gameState: NewGameState): string {
    if (!gameState.currentRoundActions || gameState.currentRoundActions.length === 0) {
      return '游戏开始';
    }

    return gameState.currentRoundActions
      .map(action => `${action.playerName}:${action.action}${action.amount ? `(${action.amount})` : ''}`)
      .join(' → ');
  }

  private buildCurrentRoundActions(gameState: NewGameState): string {
    if (!gameState.currentRoundActions || gameState.currentRoundActions.length === 0) {
      return '本轮暂无行动';
    }

    return gameState.currentRoundActions
      .filter(action => action.phase === gameState.phase)
      .map(action => `${action.playerName} ${action.action} ${action.amount || ''}`)
      .join(', ');
  }

  private buildOpponentBehaviorSummary(opponentProfiles: Map<string, OpponentProfile>): string {
    const summaries: string[] = [];
    opponentProfiles.forEach(profile => {
      const recentActions = profile.recentActions.slice(-3);
      if (recentActions.length > 0) {
        summaries.push(`${profile.playerName}: ${recentActions.map(a => a.action).join(',')}`);
      }
    });
    return summaries.join('; ');
  }

  private analyzeBoardTexture(communityCards: Card[]): string {
    if (communityCards.length === 0) return 'preflop';

    // 简化的牌面纹理分析
    const suits = communityCards.map(c => c.suit);
    const ranks = communityCards.map(c => c.rank);

    const isFlushDraw = suits.some(suit => suits.filter(s => s === suit).length >= 2);
    const isStraightDraw = this.hasStraightDraw(ranks);

    if (isFlushDraw && isStraightDraw) return 'wet';
    if (isFlushDraw || isStraightDraw) return 'semi-wet';
    return 'dry';
  }

  private isDrawHeavyBoard(communityCards: Card[]): boolean {
    return this.analyzeBoardTexture(communityCards) === 'wet';
  }

  private hasStraightDraw(ranks: string[]): boolean {
    // 简化实现
    const values = ranks.map(r => this.getCardRankValue(r)).sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i + 1] - values[i] === 1) return true;
    }
    return false;
  }

  private calculateHandStrength(holeCardsStr: string): number {
    // 简化的手牌强度计算
    const cards = holeCardsStr.split(' ');
    if (cards.length !== 2) return 0.5;

    const [card1, card2] = cards;
    const rank1 = this.getCardRankValue(card1[0]);
    const rank2 = this.getCardRankValue(card2[0]);
    const suited = card1[1] === card2[1];

    let strength = Math.max(rank1, rank2) / 14;

    if (rank1 === rank2) strength += 0.3; // 对子加成
    if (suited) strength += 0.1; // 同花加成

    return Math.min(strength, 1);
  }

  private getCardRankValue(rank: string): number {
    const values: { [key: string]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
  }

  private isNutsHand(holeCards: string, board?: string): boolean {
    // 简化实现 - 检查是否是超强牌
    const handStrength = this.calculateHandStrength(holeCards);
    return handStrength > 0.9;
  }

  private isTrashHand(holeCards: string): boolean {
    const handStrength = this.calculateHandStrength(holeCards);
    return handStrength < 0.2;
  }

  private getPositionGroup(position: string): string {
    if (['UTG', 'UTG+1', 'UTG+2'].includes(position)) return 'early';
    if (['MP', 'MP+1'].includes(position)) return 'middle';
    return 'late';
  }

  private getActionType(actionSequence: string): string {
    if (actionSequence.includes('raise') || actionSequence.includes('bet')) return 'aggressive';
    if (actionSequence.includes('call')) return 'passive';
    return 'unopened';
  }

  private getPotOddsGroup(potOdds: string): string {
    const odds = parseFloat(potOdds.split(':')[0]);
    if (odds > 3) return 'good';
    if (odds > 2) return 'fair';
    return 'poor';
  }

  // 🔥 构建增强游戏数据（使用真实计算）
  private buildEnhancedGameData(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    opponentProfiles: Map<string, OpponentProfile>
  ): any {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('玩家未找到');

    const holeCardsStr = this.formatCards(holeCards);
    const position = this.getPlayerPosition(gameState, playerId);
    const communityCardsStr = gameState.communityCards.length > 0 
      ? this.formatCards(gameState.communityCards) 
      : undefined;

    // 🧮 使用真实数学计算引擎
    const effectiveStack = this.pokerMath.calculateEffectiveStack(gameState, playerId);
    const potOddsResult = this.pokerMath.calculatePotOdds(gameState.pot, this.getAmountToCall(gameState, playerId));
    const sprResult = this.pokerMath.calculateSPR(effectiveStack, gameState.pot);
    const handStrengthResult = this.pokerMath.calculateHandStrength(holeCards, gameState.communityCards);

    // 构建对手档案
    const profiles = Array.from(opponentProfiles.values())
      .filter(profile => profile.playerId !== playerId)
      .map(profile => ({
        name: profile.playerName,
        position: this.getPlayerPosition(gameState, profile.playerId),
        vpip: profile.vpip || 25,
        pfr: profile.pfr || 18,
        aggression: profile.aggression || 2.0,
        tendency: this.classifyPlayerTendency(profile),
        chips: gameState.players.find(p => p.id === profile.playerId)?.chips || 0
      }));

    return {
      holeCards: holeCardsStr,
      position: position,
      positionIndex: player.position,
      myChips: player.chips,
      pot: gameState.pot,
      toCall: this.getAmountToCall(gameState, playerId),
      board: communityCardsStr,
      phase: gameState.phase,
      actionSequence: this.buildActionSequence(gameState),
      opponentProfiles: profiles,
      
      // 🔥 真实数学计算结果
      realCalculations: {
        effectiveStack: effectiveStack,
        potOdds: potOddsResult,
        spr: sprResult,
        handStrength: handStrengthResult
      }
    };
  }

  // 🚀 使用Context Caching发起API请求
  private async makeContextCachedAPIRequest(cachedPrompt: CachedPromptRequest): Promise<AIDecision> {
    try {
      // 组合完整的prompt：固定专业知识 + 动态游戏数据
      const fullPrompt = cachedPrompt.cachedContext + '\n\n' + cachedPrompt.dynamicContent;
      
      console.log(`🎯 Context Caching请求: 缓存部分${cachedPrompt.metadata.cacheableTokens}tokens, 动态部分${cachedPrompt.metadata.dynamicTokens}tokens`);
      
      // 使用更高温度以获得更自然的专业分析（专业知识已固定在缓存中）
      const decision = await this.apiPool.makeDecisionRequestWithConfig(fullPrompt, 0, 0.3);
      
      // 设置决策时间
      decision.decisionTime = Date.now();
      
      return decision;
      
    } catch (error) {
      console.error('❌ Context Caching API请求失败:', error);
      throw error;
    }
  }

  // 🔧 分类玩家倾向
  private classifyPlayerTendency(profile: OpponentProfile): string {
    const vpip = profile.vpip || 25;
    const pfr = profile.pfr || 18;
    const aggression = profile.aggression || 2.0;

    if (vpip > 28 && pfr > 22 && aggression > 2.5) return 'LAG';
    if (vpip < 20 && pfr < 15 && aggression < 1.5) return 'TP';
    if (vpip > 35 && aggression < 1.5) return 'LP';
    return 'TAG';
  }

  // 🔧 获取跟注金额
  private getAmountToCall(gameState: NewGameState, playerId: string): number {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 0;

    return Math.max(0, gameState.currentBet - (player.currentBet || 0));
  }
}

// 🎯 Prompt管理器
class PromptManager {
  generateDecisionPrompt(gameData: GameData): string {
    if (gameData.phase === 'preflop') {
      return this.generatePreflopPrompt(gameData);
    } else {
      return this.generatePostflopPrompt(gameData);
    }
  }

  private generatePreflopPrompt(gameData: GameData): string {
    return `你是PokerGPT-Pro，世界顶级德州扑克AI。当前9人桌，盲注50/100。

**当前局面** (翻牌前):
位置: ${gameData.position} (${gameData.positionIndex}/9)
手牌: ${gameData.holeCards}
筹码: ${gameData.myChips} (${(gameData.myChips/100).toFixed(1)}BB)
底池: ${gameData.pot}
当前下注: ${gameData.currentBet}
需要跟注: ${gameData.toCall}

**行动序列**: ${gameData.actionSequence}
**活跃玩家**: ${gameData.activePlayers}/${gameData.totalPlayers}

**对手档案**:
${gameData.opponentProfiles.map(p =>
  `${p.name}(${p.position}): VPIP${p.vpip}% PFR${p.pfr}% 激进度${p.aggression}/10 ${p.tendency}`
).join('\n')}

**快速分析要求**:
1. 手牌强度评级(1-10)
2. 位置优势评估
3. 对手行为读取
4. 底池赔率计算
5. GTO基础策略+对手调整

**时间限制**: ${gameData.timeLimit}ms内决策

返回格式:
{
  "action": "fold/call/raise",
  "amount": 数字,
  "confidence": 0.8,
  "reasoning": "简洁推理(20字内)",
  "hand_strength": 7,
  "position_factor": "early/middle/late",
  "opponent_adjustment": "tighter/standard/looser"
}`;
  }

  private generatePostflopPrompt(gameData: GameData): string {
    return `PokerGPT-Pro翻牌后分析 - 9人桌盲注50/100

**牌面信息**:
手牌: ${gameData.holeCards}
公共牌: ${gameData.board}
牌面纹理: ${gameData.boardTexture} (${gameData.drawHeavy ? '听牌多' : '听牌少'})

**当前状况**:
位置: ${gameData.position} (${gameData.positionIndex}/9)
底池: ${gameData.pot} (${(gameData.pot/100).toFixed(1)}BB)
筹码: ${gameData.myChips} (${(gameData.myChips/100).toFixed(1)}BB)
当前下注: ${gameData.currentBet}
需要跟注: ${gameData.toCall}
底池赔率: ${gameData.potOdds}

**本轮行动**: ${gameData.currentRoundActions}
**对手行为模式**: ${gameData.recentOpponentBehavior}

**快速评估**:
1. 牌力等级(nuts/strong/medium/weak/air)
2. 听牌可能性
3. 对手可能范围
4. 价值下注vs诈唬平衡
5. 对手倾向调整

**时间限制**: ${gameData.timeLimit}ms内决策

返回:
{
  "action": "fold/check/call/bet/raise",
  "amount": 数字,
  "confidence": 0.85,
  "reasoning": "简洁推理",
  "hand_category": "strong",
  "opponent_likely_range": "medium-strong",
  "play_type": "value/bluff/protection"
}`;
  }
}

// 📊 性能追踪器
class PerformanceTracker {
  private playerMetrics: Map<string, PlayerMetrics> = new Map();

  recordDecision(playerId: string, time: number, confidence: number): void {
    let metrics = this.playerMetrics.get(playerId);
    if (!metrics) {
      metrics = {
        totalDecisions: 0,
        totalTime: 0,
        averageTime: 0,
        averageConfidence: 0,
        fastDecisions: 0, // <1秒
        slowDecisions: 0  // >10秒
      };
      this.playerMetrics.set(playerId, metrics);
    }

    metrics.totalDecisions++;
    metrics.totalTime += time;
    metrics.averageTime = metrics.totalTime / metrics.totalDecisions;
    metrics.averageConfidence =
      (metrics.averageConfidence * (metrics.totalDecisions - 1) + confidence) / metrics.totalDecisions;

    if (time < 1000) metrics.fastDecisions++;
    if (time > 10000) metrics.slowDecisions++;

    console.log(`📊 性能记录: ${playerId} - ${time}ms, 信心度: ${confidence.toFixed(2)}`);
  }

  getPlayerMetrics(playerId: string): PlayerMetrics | undefined {
    return this.playerMetrics.get(playerId);
  }

  getAllMetrics(): Map<string, PlayerMetrics> {
    return new Map(this.playerMetrics);
  }
}

interface PlayerMetrics {
  totalDecisions: number;
  totalTime: number;
  averageTime: number;
  averageConfidence: number;
  fastDecisions: number;
  slowDecisions: number;
}
