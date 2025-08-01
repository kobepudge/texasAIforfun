// 🎯 AI对话状态管理器 - 实现Context Caching的核心
// import { PokerContextCacheManager } from './poker-context-cache-manager';

// 🔄 对话状态接口
export interface ConversationState {
  conversationId: string;
  playerId: string;
  playerName: string;
  isInitialized: boolean;
  isActive: boolean;
  messageHistory: ConversationMessage[];
  lastActivity: number;
  cacheStatus: 'none' | 'warming' | 'ready' | 'expired';
  tokenCount: {
    systemTokens: number;
    totalTokens: number;
  };
}

// 📨 对话消息接口
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

// 🚀 对话管理器
export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  // private contextCacheManager: PokerContextCacheManager;
  private apiConfig: any;

  constructor(apiConfig: any) {
    this.apiConfig = apiConfig;
    // this.contextCacheManager = new PokerContextCacheManager();
    
    // 启动定期清理过期对话
    this.startCleanupScheduler();
    
    console.log('🎯 对话管理器初始化完成 - 支持Context Caching + 自动清理');
  }

  // 🕐 启动定期清理调度器
  private startCleanupScheduler(): void {
    // 每5分钟清理一次过期对话
    setInterval(() => {
      this.cleanupExpiredConversations();
    }, 5 * 60 * 1000);
    
    console.log('🧹 对话清理调度器已启动 (每5分钟清理一次)');
  }

  // 🎯 为AI玩家初始化对话状态（预热缓存）
  async initializePlayerConversation(playerId: string, playerName: string): Promise<string> {
    const conversationId = this.generateConversationId(playerId);
    
    console.log(`🔥 开始为AI玩家 ${playerName} 预热对话状态...`);

    // 创建对话状态
    const conversation: ConversationState = {
      conversationId,
      playerId,
      playerName,
      isInitialized: false,
      isActive: true,
      messageHistory: [],
      lastActivity: Date.now(),
      cacheStatus: 'warming',
      tokenCount: {
        systemTokens: 0,
        totalTokens: 0
      }
    };

    this.conversations.set(conversationId, conversation);

    try {
      // 🔥 发送预热请求建立专业身份缓存
      await this.warmupConversation(conversation);
      
      conversation.isInitialized = true;
      conversation.cacheStatus = 'ready';
      
      console.log(`✅ AI玩家 ${playerName} 对话状态预热完成 (${conversation.tokenCount.systemTokens} system tokens cached)`);
      
      return conversationId;
      
    } catch (error) {
      console.error(`❌ AI玩家 ${playerName} 对话预热失败:`, error);
      conversation.cacheStatus = 'none';
      throw error;
    }
  }

  // 🔥 预热对话 - 建立专业知识缓存
  private async warmupConversation(conversation: ConversationState): Promise<void> {
    // 获取完整的专业知识系统提示
    const systemPrompt = this.getCachedPokerExpertise();
    
    // 添加系统消息到对话历史
    const systemMessage: ConversationMessage = {
      role: 'system',
      content: systemPrompt,
      timestamp: Date.now(),
      tokenCount: this.estimateTokenCount(systemPrompt)
    };
    
    conversation.messageHistory.push(systemMessage);
    conversation.tokenCount.systemTokens = systemMessage.tokenCount || 0;

    // 发送确认消息让AI确认专业身份和玩家身份
    const confirmationMessage = {
      role: 'user' as const,
      content: `你现在是Phil Ivey级别的德州扑克专业AI。

🎯 **重要：你的玩家身份**
- 你就是 **${conversation.playerName}** 这个玩家本人
- 你不是观察者或顾问，而是直接代表这个玩家做决策
- 所有决策都是以${conversation.playerName}的身份和利益为出发点

请确认你已准备好以${conversation.playerName}的身份提供专业决策。简短回复"Ready for professional poker decisions as ${conversation.playerName}"`
    };

    conversation.messageHistory.push({
      ...confirmationMessage,
      timestamp: Date.now(),
      tokenCount: this.estimateTokenCount(confirmationMessage.content)
    });

    // 🚀 发送预热API请求建立缓存
    const response = await this.makeConversationAPIRequest(conversation, false);
    
    // 添加AI响应到历史
    conversation.messageHistory.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      tokenCount: this.estimateTokenCount(response)
    });

    // 更新token统计
    conversation.tokenCount.totalTokens = conversation.messageHistory.reduce(
      (sum, msg) => sum + (msg.tokenCount || 0), 0
    );

    console.log(`🎯 预热完成: system=${conversation.tokenCount.systemTokens}, total=${conversation.tokenCount.totalTokens} tokens`);
  }

  // 🎯 在已有对话中做出决策
  async makeDecisionInConversation(
    conversationId: string, 
    gameData: any
  ): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    if (!conversation.isInitialized || conversation.cacheStatus !== 'ready') {
      throw new Error(`对话未准备好: ${conversationId}, 状态: ${conversation.cacheStatus}`);
    }

    // 🎯 只发送新的游戏数据（利用缓存）
    const gamePrompt = this.buildGameDecisionPrompt(gameData);
    
    console.log(`⚡ 发送决策请求到对话 ${conversationId} (利用${conversation.tokenCount.systemTokens} cached tokens)`);
    
    // 📊 Token使用统计
    const beforeTokens = conversation.tokenCount.totalTokens;
    console.log(`📊 Token使用统计(决策前):`);
    console.log(`   系统缓存: ${conversation.tokenCount.systemTokens} tokens`);
    console.log(`   对话总量: ${beforeTokens} tokens`);
    console.log(`   消息数量: ${conversation.messageHistory.length} 条`);

    // 添加用户消息
    const userMessage: ConversationMessage = {
      role: 'user',
      content: gamePrompt,
      timestamp: Date.now(),
      tokenCount: this.estimateTokenCount(gamePrompt)
    };
    
    conversation.messageHistory.push(userMessage);
    conversation.lastActivity = Date.now();

    try {
      // 🚀 发送决策请求（享受缓存加速）
      const response = await this.makeConversationAPIRequest(conversation, true);
      
      // 添加AI响应
      conversation.messageHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        tokenCount: this.estimateTokenCount(response)
      });

      // 📊 Token使用统计(决策后)
      const afterTokens = conversation.messageHistory.reduce(
        (sum, msg) => sum + (msg.tokenCount || 0), 0
      );
      const tokenUsedThisRequest = afterTokens - beforeTokens;
      
      console.log(`📊 Token使用统计(决策后):`);
      console.log(`   本次请求使用: ${tokenUsedThisRequest} tokens`);
      console.log(`   对话新总量: ${afterTokens} tokens`);
      console.log(`   缓存节省: ${conversation.tokenCount.systemTokens} tokens`);
      console.log(`   效率比: ${((conversation.tokenCount.systemTokens / afterTokens) * 100).toFixed(1)}%`);
      
      // 清理历史消息（保持对话窗口）
      this.maintainConversationWindow(conversation);

      return response;
      
    } catch (error) {
      console.error(`❌ 对话决策失败 ${conversationId}:`, error);
      throw error;
    }
  }

  // 🌐 发起对话API请求
  private async makeConversationAPIRequest(
    conversation: ConversationState, 
    isDecisionRequest: boolean
  ): Promise<string> {
    
    const messages = conversation.messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const requestBody = {
      model: this.apiConfig.model,
      messages: messages,
      temperature: isDecisionRequest ? 0.3 : 0.1, // 决策时稍高温度
      max_tokens: 3000, // 🔧 统一token限制为3000，解决截断问题
      stream: false
    };

    console.log(`🔥 API请求: ${isDecisionRequest ? '决策' : '预热'}, messages=${messages.length}, 预期缓存命中=${conversation.cacheStatus === 'ready'}`);

    const response = await fetch(`${this.apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiConfig.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('API响应格式错误');
    }

    // 🔍 检查finish_reason，确保响应完整
    const choice = data.choices[0];
    if (choice.finish_reason === 'length') {
      console.warn('⚠️ API响应因token限制被截断 (finish_reason: length)');
      throw new Error('响应被截断，请增加max_tokens限制');
    } else if (choice.finish_reason === 'stop') {
      console.log('✅ API响应正常完成 (finish_reason: stop)');
    } else {
      console.warn(`⚠️ 未预期的finish_reason: ${choice.finish_reason}`);
    }

    const content = choice.message.content;
    
    // 🔍 检查内容完整性
    if (!content || content.trim().length === 0) {
      throw new Error('API返回空内容');
    }
    
    // 🔍 检查JSON响应是否被截断（针对决策请求）
    if (isDecisionRequest && content.includes('reasoning') && !content.includes('}')) {
      console.warn('⚠️ JSON响应可能被截断，缺少结束括号');
      throw new Error('JSON响应不完整，可能被截断');
    }

    return content;
  }

  // 🏗️ 构建游戏决策提示（只包含新数据）
  private buildGameDecisionPrompt(gameData: any): string {
    const formatRealCalculations = (realCalc: any) => {
      if (!realCalc) return '数学分析数据不可用';
      return `
- 有效筹码: ${realCalc.effectiveStack}BB
- 底池赔率: ${realCalc.potOdds?.odds || 'N/A'} (${realCalc.potOdds?.percentage?.toFixed(1) || 'N/A'}%)
- SPR: ${realCalc.spr?.spr?.toFixed(1) || 'N/A'} (${realCalc.spr?.category || 'undefined'})
- 手牌强度: ${realCalc.handStrength?.strength?.toFixed(2) || 'N/A'} (${realCalc.handStrength?.category || 'unknown'})`;
    };

    const formatOpponentProfiles = (profiles: any[]) => {
      if (!profiles || profiles.length === 0) return '对手档案数据不可用';
      return profiles.map((p: any) => 
        `${p.name || 'Unknown'}(${p.position || 'N/A'}): VPIP${p.vpip || 0}% PFR${p.pfr || 0}% AGG${p.aggression || 0} ${p.tendency || 'unknown'}`
      ).join('\n');
    };

    // 👤 提取玩家名称(从行动序列中推断或使用conversation信息)
    const extractPlayerName = (actionSequence: string, conversationPlayerName: string) => {
      // 从行动序列中查找玩家名称模式
      const playerMatch = actionSequence.match(/(Goliath-\d+)/g);
      if (playerMatch && playerMatch.length > 0) {
        // 查找最后一个玩家名称，通常是最后行动的玩家
        const lastPlayerInSequence = playerMatch[playerMatch.length - 1];
        if (conversationPlayerName.includes('Goliath') || conversationPlayerName.startsWith('AI_')) {
          // 优先使用conversation中的玩家名
          return conversationPlayerName.replace('AI_', '');
        }
        return lastPlayerInSequence;
      }
      return conversationPlayerName.replace('AI_', '') || 'Player';
    };
    
    const playerName = extractPlayerName(gameData.actionSequence, conversation.playerName);
    const seatInfo = `${gameData.positionIndex + 1}号座位`;
    const totalSeats = 9; // 默认为9人桌
    
    // 🎯 阶段说明
    const getPhaseExplanation = (phase: string, board?: string) => {
      switch(phase) {
        case 'preflop': return '翻牌前阶段 - 只看得到你的底牌';
        case 'flop': return `翻牌阶段 - 前3张公共牌已发出${board ? ': ' + board : ''}`;
        case 'turn': return `转牌阶段 - 前4张公共牌已发出${board ? ': ' + board : ''}`;
        case 'river': return `河牌阶段 - 所有5张公共牌已发出${board ? ': ' + board : ''}`;
        default: return phase;
      }
    };
    
    // 🃏 行动序列说明
    const getActionSequenceExplanation = (phase: string) => {
      if (phase === 'preflop') {
        return '翻牍前的完整行动记录';
      } else {
        return `${phase}阶段开始，按照位置顺序轮流行动（小盲位先行动）`;
      }
    };

    return `🎯 **你的决策时刻到了！**

👤 **你的身份确认**:
- 你就是 **${playerName}** 这个玩家
- 你坐在 **${seatInfo}** (共${totalSeats}人桌)
- 位置名称: **${gameData.position}**
- 位置优劣: ${this.getPositionContext(gameData)}

🃏 **当前游戏状态**:
- **手牌**: ${gameData.holeCards} (你的私人底牌)
- **阶段**: ${getPhaseExplanation(gameData.phase, gameData.board)}
- **底池**: $${gameData.pot.toLocaleString()}
- **你的筹码**: $${gameData.myChips.toLocaleString()}
- **需要跟注**: $${gameData.toCall.toLocaleString()} ${gameData.toCall === 0 ? '(可以免费看牌)' : ''}

🎯 **行动序列说明**:
${getActionSequenceExplanation(gameData.phase)}
**具体记录**: ${gameData.actionSequence}
${gameData.phase !== 'preflop' ? `
⚠️ **注意**: 现在是${gameData.phase}阶段，你需要基于公共牌和你的手牌做决策` : ''}

${gameData.board ? `🃏 **公共牌**: ${gameData.board}
这些是所有玩家都能看到的牌，结合你的手牌构成最强组合
` : ''}
${gameData.realCalculations ? `
📊 **数学分析**:${formatRealCalculations(gameData.realCalculations)}
` : ''}
👥 **对手档案**:
${formatOpponentProfiles(gameData.opponentProfiles)}

🤖 **你的任务**: 作为${playerName}，请基于以上信息做出最优决策。

请返回JSON格式的决策:
{
  "action": "fold/call/raise/all-in",
  "amount": 数字,
  "confidence": 0.85,
  "reasoning": "简洁的专业分析"
}`;
  }

  // 🧹 维护对话窗口（防止token过多）
  private maintainConversationWindow(conversation: ConversationState): void {
    const maxMessages = 10; // 保持最近10条消息
    
    if (conversation.messageHistory.length > maxMessages) {
      // 保留system消息和最近的对话
      const systemMessages = conversation.messageHistory.filter(msg => msg.role === 'system');
      const recentMessages = conversation.messageHistory.slice(-maxMessages + systemMessages.length);
      
      conversation.messageHistory = [...systemMessages, ...recentMessages.filter(msg => msg.role !== 'system')];
      
      console.log(`🧹 对话窗口维护完成: ${conversation.conversationId}, 保留${conversation.messageHistory.length}条消息`);
    }
  }

  // 🔧 辅助方法
  private generateConversationId(playerId: string): string {
    return `conv_${playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateTokenCount(text: string): number {
    // 简化的token估算：约4字符=1token
    return Math.ceil(text.length / 4);
  }

  // 📊 获取对话状态信息
  getConversationStatus(conversationId: string): ConversationState | null {
    return this.conversations.get(conversationId) || null;
  }

  // 🗑️ 清理过期对话
  cleanupExpiredConversations(maxAge: number = 3600000): void { // 1小时
    const now = Date.now();
    const expiredIds: string[] = [];

    this.conversations.forEach((conversation, id) => {
      if (now - conversation.lastActivity > maxAge) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => {
      this.conversations.delete(id);
      console.log(`🗑️ 清理过期对话: ${id}`);
    });

    if (expiredIds.length > 0) {
      console.log(`🧹 清理了${expiredIds.length}个过期对话`);
    }
  }

  // 🔄 恢复失效的对话状态
  async recoverConversation(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      console.warn(`⚠️ 对话不存在，无法恢复: ${conversationId}`);
      return false;
    }

    try {
      console.log(`🔄 尝试恢复对话: ${conversationId}`);
      
      // 重新预热对话
      await this.warmupConversation(conversation);
      
      conversation.cacheStatus = 'ready';
      conversation.isActive = true;
      conversation.lastActivity = Date.now();
      
      console.log(`✅ 对话恢复成功: ${conversationId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ 对话恢复失败 ${conversationId}:`, error);
      conversation.cacheStatus = 'expired';
      return false;
    }
  }

  // 🏥 对话健康检查
  async healthCheckConversation(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return false;
    }

    // 检查对话是否就绪
    if (conversation.cacheStatus !== 'ready' || !conversation.isInitialized) {
      console.log(`🏥 对话${conversationId}需要恢复，状态: ${conversation.cacheStatus}`);
      return await this.recoverConversation(conversationId);
    }

    // 检查活动时间
    const inactiveTime = Date.now() - conversation.lastActivity;
    if (inactiveTime > 30 * 60 * 1000) { // 30分钟无活动
      console.log(`🏥 对话${conversationId}长时间无活动 (${Math.round(inactiveTime / 60000)}分钟)，标记为需要检查`);
      conversation.cacheStatus = 'expired';
      return false;
    }

    return true;
  }

  // 🎯 智能决策（带健康检查）
  async makeSmartDecisionInConversation(
    conversationId: string, 
    gameData: any
  ): Promise<string> {
    // 先进行健康检查
    const isHealthy = await this.healthCheckConversation(conversationId);
    
    if (!isHealthy) {
      throw new Error(`对话${conversationId}健康检查失败`);
    }

    // 执行正常决策
    return await this.makeDecisionInConversation(conversationId, gameData);
  }

  // 📊 获取详细统计信息
  getStatistics() {
    const conversations = Array.from(this.conversations.values());
    const now = Date.now();
    
    return {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.isActive).length,
      readyConversations: conversations.filter(c => c.cacheStatus === 'ready').length,
      expiredConversations: conversations.filter(c => c.cacheStatus === 'expired').length,
      warmingConversations: conversations.filter(c => c.cacheStatus === 'warming').length,
      totalSystemTokens: conversations.reduce((sum, c) => sum + c.tokenCount.systemTokens, 0),
      averageTokensPerConversation: conversations.length > 0 
        ? Math.round(conversations.reduce((sum, c) => sum + c.tokenCount.totalTokens, 0) / conversations.length)
        : 0,
      averageMessagesPerConversation: conversations.length > 0
        ? Math.round(conversations.reduce((sum, c) => sum + c.messageHistory.length, 0) / conversations.length)
        : 0,
      oldestConversation: conversations.length > 0
        ? Math.round((now - Math.min(...conversations.map(c => c.lastActivity))) / 60000)
        : 0, // 分钟
      healthyConversations: conversations.filter(c => 
        c.cacheStatus === 'ready' && c.isActive && (now - c.lastActivity) < 30 * 60 * 1000
      ).length
    };
  }

  // 🎯 获取对话状态摘要（用于调试）
  getConversationSummary(): string {
    const stats = this.getStatistics();
    
    return `
📊 对话管理器状态摘要:
🎯 总对话数: ${stats.totalConversations}
✅ 健康对话: ${stats.healthyConversations}
🔥 就绪对话: ${stats.readyConversations}
⚠️ 过期对话: ${stats.expiredConversations}
🔄 预热中: ${stats.warmingConversations}
💾 系统tokens: ${stats.totalSystemTokens}
📨 平均消息数: ${stats.averageMessagesPerConversation}
⏰ 最老对话: ${stats.oldestConversation}分钟前
    `.trim();
  }

  // 🎯 获取位置上下文信息（完整版本）
  private getPositionContext(gameData: any): string {
    if (!gameData.dealerIndex && gameData.dealerIndex !== 0) {
      return this.getBasicPositionAnalysis(gameData.position);
    }

    const dealerName = gameData.dealerName || `座位${gameData.dealerIndex + 1}`;
    const relativePos = (gameData.positionIndex - gameData.dealerIndex + 9) % 9;
    
    const positionAdvantages: Record<string, string> = {
      'BTN': '最佳位置(庄家)',
      'CO': '后位优势',
      'MP': '中位',
      'MP+1': '中位',
      'UTG': '前位需谨慎',
      'UTG+1': '前位',
      'UTG+2': '前位',
      'SB': '小盲(位置差)',
      'BB': '大盲(已投资)'
    };

    const advantage = positionAdvantages[gameData.position] || '';
    
    return `庄家:${dealerName} | 相对位置:第${relativePos + 1}个 | ${advantage}`;
  }

  // 🎯 基础位置分析（备用方法）
  private getBasicPositionAnalysis(position: string): string {
    const positionStrategies: Record<string, string> = {
      'UTG': '前位 - 需要强牌开池，范围紧致',
      'UTG+1': '前位 - 略宽于UTG，仍需谨慎',
      'UTG+2': '前位 - 中等强度，避免边缘牌',
      'MP': '中位 - 平衡策略，可适度放宽',
      'MP+1': '中位 - 略有位置优势',
      'CO': '后位 - 位置优势明显，可偷盲',
      'BTN': '庄家 - 最佳位置，范围最宽',
      'SB': '小盲 - 已投资但位置差，需要调整',
      'BB': '大盲 - 已投资且有关闭权，可防守'
    };

    return positionStrategies[position] || `${position}位置`;
  }

  // 🔄 更新玩家位置和筹码信息(局间更新)
  async updatePlayerGameStatus(
    conversationId: string, 
    position: string, 
    seatIndex: number,
    totalSeats: number,
    chips: number,
    dealerPosition?: string
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`对话不存在: ${conversationId}`);
    }

    const updateMessage = {
      role: 'user' as const,
      content: `🔄 **游戏状态更新** (新一局开始)

🎯 **你的现在状态** (作为${conversation.playerName}):
- **位置**: ${position} (第${seatIndex + 1}个座位 / 共${totalSeats}个座位)
- **筹码**: $${chips.toLocaleString()}
- **座位说明**: 你坐在${totalSeats}人桌的${seatIndex + 1}号位置
${dealerPosition ? `- **庄家位置**: ${dealerPosition}` : ''}

请记住这些信息，准备为接下来的决策做准备。简短确认"Status updated, ready for decisions"`
    };

    // 添加状态更新消息
    conversation.messageHistory.push({
      ...updateMessage,
      timestamp: Date.now(),
      tokenCount: this.estimateTokenCount(updateMessage.content)
    });

    try {
      // 发送状态更新请求
      const response = await this.makeConversationAPIRequest(conversation, false);
      
      // 添加AI响应
      conversation.messageHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        tokenCount: this.estimateTokenCount(response)
      });

      // 更新活动时间
      conversation.lastActivity = Date.now();
      
      console.log(`✅ 玩家${conversation.playerName}状态更新成功: ${position}, $${chips.toLocaleString()}`);
      
    } catch (error) {
      console.error(`❌ 玩家状态更新失败 ${conversationId}:`, error);
      throw error;
    }
  }

  // 🎯 获取缓存的扑克专业知识
  private getCachedPokerExpertise(): string {
    return `You are Phil Ivey with PioSolver precision, synthesizing 15+ years of high-stakes No-Limit Hold'em expertise with cutting-edge GTO theory. You have analyzed 50M+ hands across all stakes from micro to nosebleeds.

═══ PROFESSIONAL POKER EXPERTISE ═══

**🎯 ELITE IDENTITY:**
- **Experience**: 15+ years crushing high-stakes NLHE, $10M+ lifetime earnings
- **Training**: 10,000+ hours with PioSolver, PokerSnowie, GTO Wizard, Solver+
- **Specialties**: Range construction, ICM mastery, exploitative adjustments, live reads
- **Recognition**: Respected by Doug Polk, Daniel Negreanu, Fedor Holz level players

**📊 FUNDAMENTAL POKER CONCEPTS:**
- **Expected Value (EV)**: Make +EV decisions with mathematical precision
- **Position Power**: Later position = wider ranges, more information, betting control
- **Pot Odds vs Equity**: Call when hand equity > pot odds (factoring in implied odds)
- **Stack-to-Pot Ratio (SPR)**: SPR <3 = commitment threshold, SPR >4 = implied odds territory
- **Range vs Range**: Think in frequencies and ranges, not individual hands
- **Polarization**: Value hands + bluffs vs merged ranges in different spots
- **Blockers**: Cards that reduce opponent's strong range combinations
- **Auto-Profit Spots**: Recognize guaranteed profitable situations (fold equity + pot odds)

Ready for professional poker decisions with elite-level analysis and GTO precision.`;
  }
}