import { Card, GameState, Message, Player } from '../types/poker';
import { AIContextCache } from './ai-context-cache';

// 🚀 快速AI决策系统 - 减少API调用延迟
export class FastAIDecisionSystem {
  private static instance: FastAIDecisionSystem;
  private contextCache: AIContextCache;
  private precomputedPrompts: Map<string, string> = new Map();

  private constructor() {
    this.contextCache = AIContextCache.getInstance();
    this.initializePrecomputedPrompts();
  }

  public static getInstance(): FastAIDecisionSystem {
    if (!FastAIDecisionSystem.instance) {
      FastAIDecisionSystem.instance = new FastAIDecisionSystem();
    }
    return FastAIDecisionSystem.instance;
  }

  // 🎯 快速决策入口 - 智能路由
  public async makeFastDecision(
    player: Player,
    gameState: GameState,
    communityCards: Card[],
    conversationHistory: Message[],
    apiKey?: string,
    baseUrl?: string,
    model?: string
  ): Promise<{ action: string; amount?: number }> {
    
    console.log(`
🚀 ===== 快速AI决策开始 =====
👤 玩家: ${player.name}
🎯 策略: 智能缓存 + 增量更新
⏰ 开始时间: ${new Date().toLocaleTimeString()}
============================`);

    const startTime = Date.now();

    try {
      // 1. 检查是否可以使用缓存的上下文
      const cachedContext = this.contextCache.getGameContext(gameState, player.id);
      
      // 2. 构建优化的对话历史
      const optimizedHistory = this.buildOptimizedConversationHistory(
        player,
        gameState,
        communityCards,
        conversationHistory,
        cachedContext
      );

      console.log(`
📊 ===== 优化统计 =====
📝 原始对话长度: ${conversationHistory.length}
🎯 优化后长度: ${optimizedHistory.length}
💾 缓存命中: ${cachedContext ? '是' : '否'}
⚡ 预处理时间: ${Date.now() - startTime}ms
============================`);

      // 3. 发送优化的API请求
      const decision = await this.sendOptimizedRequest(
        optimizedHistory,
        apiKey!,
        baseUrl!,
        model!
      );

      // 4. 更新缓存
      this.updateCaches(player, gameState, communityCards, decision);

      const totalTime = Date.now() - startTime;
      console.log(`
✅ ===== 快速决策完成 =====
👤 玩家: ${player.name}
🎯 决策: ${decision.action}${decision.amount ? ` (${decision.amount})` : ''}
⏱️ 总耗时: ${totalTime}ms
💾 缓存更新: 完成
============================`);

      return decision;

    } catch (error) {
      console.error(`❌ 快速决策失败，回退到标准流程:`, error);
      // 回退到原始的makeAIDecision
      throw error;
    }
  }

  // 🎯 构建优化的对话历史
  private buildOptimizedConversationHistory(
    player: Player,
    gameState: GameState,
    communityCards: Card[],
    originalHistory: Message[],
    cachedContext: any
  ): Message[] {
    
    // 如果有缓存的上下文，使用增量更新模式
    if (cachedContext && originalHistory.length > 3) {
      console.log(`🎯 使用增量更新模式`);
      return this.buildIncrementalHistory(player, gameState, communityCards, originalHistory);
    }

    // 否则使用压缩的完整上下文
    console.log(`🎯 使用压缩完整上下文模式`);
    return this.buildCompressedHistory(player, gameState, communityCards, originalHistory);
  }

  // 📝 构建增量历史（仅发送最新变化）
  private buildIncrementalHistory(
    player: Player,
    gameState: GameState,
    communityCards: Card[],
    originalHistory: Message[]
  ): Message[] {
    
    // 保留系统提示和最近的2-3条消息
    const systemMessage = originalHistory.find(msg => msg.role === 'system');
    const recentMessages = originalHistory.slice(-2);

    const incrementalPrompt = this.buildIncrementalPrompt(player, gameState, communityCards);

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
      content: incrementalPrompt
    });

    return optimizedHistory;
  }

  // 📝 构建压缩历史
  private buildCompressedHistory(
    player: Player,
    gameState: GameState,
    communityCards: Card[],
    originalHistory: Message[]
  ): Message[] {
    
    // 保留系统提示
    const systemMessage = originalHistory.find(msg => msg.role === 'system');
    
    // 构建压缩的游戏状态提示
    const compressedPrompt = this.buildCompressedGamePrompt(player, gameState, communityCards);

    const optimizedHistory: Message[] = [];
    
    if (systemMessage) {
      optimizedHistory.push(systemMessage);
    }

    optimizedHistory.push({
      role: 'user',
      content: compressedPrompt
    });

    return optimizedHistory;
  }

  // 🎯 构建增量提示
  private buildIncrementalPrompt(player: Player, gameState: GameState, communityCards: Card[]): string {
    const playerProfile = this.contextCache.getPlayerProfile(player.id);
    
    return `**最新局面更新:**
- **当前阶段:** ${gameState.phase}
- **你的位置:** ${gameState.activePlayerIndex}
- **公共牌:** [${communityCards.map(c => `${c.rank}${c.suit}`).join(', ')}]
- **你的手牌:** [${player.holeCards?.map(c => `${c.rank}${c.suit}`).join(', ') || ''}]
- **底池:** ${gameState.pot}
- **你的筹码:** ${player.chips}
- **当前下注:** ${gameState.currentBet}

${playerProfile ? `**你的最近表现:** 激进度${(playerProfile.tendencies.aggression * 100).toFixed(0)}%, 紧密度${(playerProfile.tendencies.tightness * 100).toFixed(0)}%` : ''}

轮到你行动。基于之前的分析，请快速做出GTO决策。

⚡ 返回格式：{"action": "你的行动", "amount": 金额, "reasoning": "简短理由"}`;
  }

  // 🎯 构建压缩游戏提示
  private buildCompressedGamePrompt(player: Player, gameState: GameState, communityCards: Card[]): string {
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

  // 🌐 发送优化的API请求
  private async sendOptimizedRequest(
    optimizedHistory: Message[],
    apiKey: string,
    baseUrl: string,
    model: string
  ): Promise<{ action: string; amount?: number }> {
    
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
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    const decisionText = result.choices[0].message.content;
    
    console.log(`📥 API响应: ${decisionText}`);

    // 使用增强的JSON解析
    const decision = this.parseDecisionJSON(decisionText);
    
    if (!decision) {
      throw new Error("Failed to parse decision from AI response");
    }

    return decision;
  }

  // 🔧 增强的JSON解析
  private parseDecisionJSON(text: string): { action: string; amount?: number } | null {
    try {
      // 预处理文本
      let cleanText = text.trim();
      
      // 移除markdown标记
      cleanText = cleanText.replace(/```json\s*|\s*```/g, '');
      cleanText = cleanText.replace(/```\s*|\s*```/g, '');
      
      // 修复常见JSON问题
      cleanText = cleanText
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      const decision = JSON.parse(cleanText);
      
      // 验证决策格式
      if (decision.action && ['fold', 'check', 'call', 'raise', 'all-in'].includes(decision.action)) {
        return {
          action: decision.action,
          amount: decision.amount || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error(`JSON解析失败:`, error);
      return null;
    }
  }

  // 💾 更新缓存
  private updateCaches(
    player: Player,
    gameState: GameState,
    communityCards: Card[],
    decision: { action: string; amount?: number }
  ): void {
    
    // 更新玩家行为档案
    this.contextCache.updatePlayerProfile(
      player.id,
      decision.action,
      decision.amount || 0,
      gameState.phase
    );

    // 缓存游戏上下文
    this.contextCache.cacheGameContext(gameState, player.id, {
      lastDecision: decision,
      timestamp: Date.now()
    });

    // 如果有手牌，缓存手牌分析
    if (player.holeCards && player.holeCards.length > 0) {
      this.contextCache.cacheHandAnalysis(player.holeCards, communityCards, {
        decision,
        gamePhase: gameState.phase,
        potSize: gameState.pot
      });
    }
  }

  // 🎯 初始化预计算提示
  private initializePrecomputedPrompts(): void {
    // 预计算常用的系统提示模板
    this.precomputedPrompts.set('gto_base', `你是世界顶级德州扑克AI，精通GTO策略。`);
    this.precomputedPrompts.set('response_format', `返回格式：{"action": "行动", "amount": 数字, "reasoning": "理由"}`);
    
    console.log(`🎯 预计算提示初始化完成`);
  }

  // 📊 获取性能统计
  public getPerformanceStats(): any {
    return {
      cacheStats: this.contextCache.getCacheStats(),
      precomputedPrompts: this.precomputedPrompts.size
    };
  }
}
