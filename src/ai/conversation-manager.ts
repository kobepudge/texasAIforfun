// 🎯 AI对话状态管理器 - 简化版会话式决策

// 🔄 简化的对话状态接口
export interface ConversationState {
  conversationId: string;
  playerName: string;
  messageHistory: ConversationMessage[];
  lastActivity: number;
}

// 📨 对话消息接口
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

// 🚀 简化的对话管理器
export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  private apiConfig: any;

  constructor(apiConfig: any) {
    this.apiConfig = apiConfig;
    
    // 启动定期清理过期对话
    this.startCleanupScheduler();
    
    console.log('🎯 对话管理器初始化完成 - 会话式决策系统');
  }

  // 🕐 启动定期清理调度器
  private startCleanupScheduler(): void {
    // 每5分钟清理一次过期对话
    setInterval(() => {
      this.cleanupExpiredConversations();
    }, 5 * 60 * 1000);
    
    console.log('🧹 对话清理调度器已启动 (每5分钟清理一次)');
  }

  // 🎯 创建简单的对话会话
  createConversation(playerName: string): string {
    const conversationId = this.generateConversationId(playerName);
    
    console.log(`🎯 为AI玩家 ${playerName} 创建对话会话: ${conversationId}`);

    // 创建简单的对话状态
    const conversation: ConversationState = {
      conversationId,
      playerName,
      messageHistory: [],
      lastActivity: Date.now()
    };

    this.conversations.set(conversationId, conversation);
    
    console.log(`✅ AI玩家 ${playerName} 对话会话创建完成`);
    
    return conversationId;
  }

  // 🎯 构建完整的System Prompt（专业知识 + 玩家身份）
  private buildSystemPrompt(playerName: string): string {
    const expertise = this.getCachedPokerExpertise();
    const identity = `

🎯 **重要：你的玩家身份**
- 你就是 **${playerName}** 这个玩家本人
- 你不是观察者或顾问，而是直接代表这个玩家做决策
- 所有决策都是以${playerName}的身份和利益为出发点

准备好接收游戏状况并做出最优决策。`;
    
    return expertise + identity;
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

    // 🎯 构建完整的决策Prompt（system + game data）
    const systemPrompt = this.buildSystemPrompt(conversation.playerName);
    const gamePrompt = this.buildGameDecisionPrompt(gameData);
    
    // 如果是第一次决策，添加system prompt
    if (conversation.messageHistory.length === 0) {
      conversation.messageHistory.push({
        role: 'system',
        content: systemPrompt,
        timestamp: Date.now(),
        tokenCount: this.estimateTokenCount(systemPrompt)
      });
    }
    
    // 添加用户消息
    const userMessage: ConversationMessage = {
      role: 'user',
      content: gamePrompt,
      timestamp: Date.now(),
      tokenCount: this.estimateTokenCount(gamePrompt)
    };
    
    conversation.messageHistory.push(userMessage);
    conversation.lastActivity = Date.now();

    console.log(`⚡ 发送决策请求到对话 ${conversationId}`);

    try {
      // 🚀 发送API请求
      const response = await this.makeAPIRequest(
        conversation.messageHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      );
      
      // 添加AI响应
      conversation.messageHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        tokenCount: this.estimateTokenCount(response)
      });
      
      // 清理历史消息（保持对话窗口）
      this.maintainConversationWindow(conversation);

      return response;
      
    } catch (error) {
      console.error(`❌ 对话决策失败 ${conversationId}:`, error);
      throw error;
    }
  }

  // 🌐 简化的API请求方法
  private async makeAPIRequest(messages: Array<{role: string, content: string}>): Promise<string> {
    const requestBody = {
      model: this.apiConfig.model,
      messages: messages,
      temperature: 0.3, // 决策适中温度
      max_tokens: 3000,
      stream: false
    };

    console.log(`🚀 API请求: messages=${messages.length}`);

    const response = await fetch(`${this.apiConfig.baseUrl}/chat/completions`, {
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

    const choice = data.choices[0];
    if (choice.finish_reason === 'length') {
      console.warn('⚠️ API响应因token限制被截断');
      throw new Error('响应被截断，请增加max_tokens限制');
    }

    const content = choice.message.content;
    
    if (!content || content.trim().length === 0) {
      throw new Error('API返回空内容');
    }

    return content;
  }

  // 🏗️ 构建复杂游戏决策提示（完整详细格式）
  private buildGameDecisionPrompt(gameData: any): string {
    // 提取玩家名称
    const playerName = gameData.playerName || 'Player';
    
    // 格式化手牌
    const formatHoleCards = (cards: string) => {
      return cards.replace(/spades/g, '♠').replace(/hearts/g, '♥').replace(/diamonds/g, '♦').replace(/clubs/g, '♣');
    };
    
    // 格式化公共牌
    const formatBoard = (board: string) => {
      if (!board) return '';
      return board.replace(/spades/g, '♠').replace(/hearts/g, '♥').replace(/diamonds/g, '♦').replace(/clubs/g, '♣');
    };
    
    // 构建位置分布 - 性能优化版：快速映射所有位置的玩家
    const buildPositionDistribution = (gameData: any) => {
      // 🛡️ 防御性编程：确保gameData有效性
      if (!gameData || typeof gameData !== 'object') {
        return '位置信息不可用';
      }
      
      const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];
      
      // 🎯 优先使用完整的玩家位置信息 - 性能优化
      if (gameData.allPlayersPositions && 
          typeof gameData.allPlayersPositions === 'object' &&
          Object.keys(gameData.allPlayersPositions).length > 0) {
        
        // 性能优化：预分配数组避免重复字符串操作
        const distributionParts: string[] = new Array(positions.length);
        
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i];
          const playerName_local = gameData.allPlayersPositions[pos];
          if (playerName_local && typeof playerName_local === 'string' && playerName_local.trim() !== '') {
            // 如果是当前玩家，添加标记
            const isCurrentPlayer = playerName_local === playerName;
            distributionParts[i] = `${pos}:${playerName_local}${isCurrentPlayer ? '👤' : ''}`;
          } else {
            distributionParts[i] = `${pos}:空位`;
          }
        }
        
        return distributionParts.join(' | ');
      }
      
      // 🔙 回退到原始方法（使用opponentProfiles） - 增强版本
      const positionPlayerMap: {[key: string]: string} = {};
      
      // 🛡️ 防御性编程：添加当前玩家
      if (gameData.position && typeof gameData.position === 'string') {
        positionPlayerMap[gameData.position] = playerName + '👤';
      }
      
      // 🛡️ 防御性编程：添加对手信息，确保数据有效性
      if (gameData.opponentProfiles && Array.isArray(gameData.opponentProfiles)) {
        gameData.opponentProfiles.forEach((opponent: any) => {
          // 确保对手数据的完整性和有效性
          if (opponent && 
              typeof opponent === 'object' && 
              opponent.position && 
              typeof opponent.position === 'string' && 
              opponent.name && 
              typeof opponent.name === 'string' &&
              opponent.name.trim() !== '') {
            positionPlayerMap[opponent.position] = opponent.name;
          }
        });
      }
      
      // 🛡️ 防御性编程：构建分布字符串，确保位置数组有效
      const distribution = positions
        .filter(pos => typeof pos === 'string' && pos.trim() !== '')
        .map(pos => {
          const playerInfo = positionPlayerMap[pos];
          return `${pos}:${playerInfo || '空位'}`;
        }).join(' | ');
      
      return distribution;
    };
    
    // 构建详细下注历史 - 修复版：正确解析各阶段行动
    const buildDetailedBettingHistory = (actionSequence: string, phase: string) => {
      const rounds = {
        preflop: [] as string[],
        flop: [] as string[],
        turn: [] as string[],
        river: [] as string[]
      };
      
      if (!actionSequence || actionSequence === '游戏开始') {
        return {
          preflop: [],
          flop: [],
          turn: [],
          river: [],
          summary: `Current phase: ${phase}, no actions yet`
        };
      }
      
      // 解析格式：翻前[player1:action → player2:action] | 翻牌[...]
      const roundSections = actionSequence.split(' | ').map(s => s.trim()).filter(s => s);
      
      roundSections.forEach(section => {
        // 匹配格式：翻前[...] 或 翻牌[...] 等
        const roundMatch = section.match(/^(翻前|翻牌|转牌|河牌)\[(.*)\]$/);
        if (roundMatch) {
          const roundName = roundMatch[1];
          const actionsStr = roundMatch[2];
          
          // 解析行动：player1:action → player2:action
          if (actionsStr) {
            const actions = actionsStr.split(' → ').map(a => a.trim()).filter(a => a);
            
            // 映射中文轮次名到英文
            const roundKey = {
              '翻前': 'preflop',
              '翻牌': 'flop', 
              '转牌': 'turn',
              '河牌': 'river'
            }[roundName] as keyof typeof rounds;
            
            if (roundKey && rounds[roundKey]) {
              rounds[roundKey] = actions;
            }
          }
        }
      });
      
      const totalActions = Object.values(rounds).flat().length;
      
      return {
        preflop: rounds.preflop,
        flop: rounds.flop,
        turn: rounds.turn,
        river: rounds.river,
        summary: `Total actions: ${totalActions}, Current phase: ${phase}`
      };
    };
    
    // 构建对手信息
    const buildOpponents = (profiles: any[]) => {
      return profiles.filter(p => p.name !== playerName).map(opponent => ({
        name: opponent.name,
        position: opponent.position,
        chips: opponent.chips || 50000,
        isActive: true,
        stackBB: Math.round((opponent.chips || 50000) / 100)
      }));
    };
    
    // 构建牌面分析
    const buildBoardAnalysis = (board: string, phase: string) => {
      if (!board || phase === 'preflop') {
        return {
          texture: 'preflop',
          drawPossible: false,
          pairedBoard: false
        };
      }
      
      const cards = board.split(' ');
      const suits = cards.map(card => card.slice(-1));
      const ranks = cards.map(card => card.slice(0, -1));
      
      // 简单的牌面分析
      const flushPossible = suits.some(suit => suits.filter(s => s === suit).length >= 2);
      const paired = ranks.some(rank => ranks.filter(r => r === rank).length >= 2);
      
      return {
        texture: flushPossible ? 'wet' : 'dry',
        drawPossible: flushPossible,
        pairedBoard: paired
      };
    };

    const bettingHistory = buildDetailedBettingHistory(gameData.actionSequence || '', gameData.phase);
    const opponents = buildOpponents(gameData.opponentProfiles || []);
    const boardAnalysis = buildBoardAnalysis(gameData.board, gameData.phase);
    
    // 构建完整的游戏状态JSON
    const completeGameData = {
      gameState: {
        phase: gameData.phase,
        pot: gameData.pot,
        currentBet: gameData.currentBet || 0,
        bigBlind: 100,
        board: gameData.board ? gameData.board.split(' ') : [],
        myPosition: gameData.position,
        myChips: gameData.myChips,
        myCards: gameData.holeCards ? gameData.holeCards.split(' ') : [],
        toCall: gameData.toCall,
        potOdds: gameData.toCall > 0 ? `${(gameData.pot / gameData.toCall).toFixed(1)}:1` : 'N/A',
        stackToPotRatio: gameData.pot > 0 ? `${(gameData.myChips / gameData.pot).toFixed(1)}:1` : 'N/A'
      },
      detailedBettingHistory: bettingHistory,
      currentRoundSummary: `${gameData.phase} phase started, ${gameData.toCall === 0 ? 'no betting yet' : 'betting in progress'}`,
      opponents: opponents,
      boardAnalysis: boardAnalysis,
      gameFormat: {
        blinds: '50/100',
        tableSize: 9,
        gameType: 'cash',
        effectiveStacks: Math.min(...opponents.map(o => o.chips), gameData.myChips)
      }
    };

    return `=== COMPLEX POKER DECISION ===
YOUR HAND: ${formatHoleCards(gameData.holeCards || 'Unknown Unknown')}
BOARD: ${formatBoard(gameData.board || '')}
POSITION: ${gameData.position} | 座位 ${gameData.positionIndex + 1}/9 | 庄家: ${gameData.dealerInfo || 'BTN位置'} | 相对位置: 第${gameData.positionIndex + 1}个行动 | ${gameData.position === 'BB' ? '大盲(已投资盲注)' : gameData.position === 'SB' ? '小盲(已投资盲注)' : '普通位置'}
位置分布: ${buildPositionDistribution(gameData)}
CHIPS: ${gameData.myChips} | POT: ${gameData.pot} | TO CALL: ${gameData.toCall}

COMPLETE GAME DATA:
${JSON.stringify(completeGameData, null, 2)}

ANALYZE: Hand strength, position, pot odds, opponent ranges, board texture
RESPOND ONLY: {"action":"fold/check/call/raise/all-in","amount":number,"confidence":0.8}`;
  }

  // 🔧 获取位置上下文说明
  private getPositionContext(gameData: any): string {
    const position = gameData.position;
    const contextMap: Record<string, string> = {
      'BTN': '按钮位置，最有利位置，最后行动',
      'CO': '劫持位，仅次于按钮的好位置',
      'MP': '中间位置，需要谨慎选择手牌',
      'MP+1': '中间位置后期，稍好于早期位置',
      'UTG': '枪口位，最不利位置，需要最强手牌',
      'UTG+1': '枪口位后，仍需谨慎',
      'UTG+2': '早期位置，需要较强手牌',
      'SB': '小盲位，翻前不利但翻后有位置优势',
      'BB': '大盲位，翻前有选择权但翻后位置不利'
    };
    
    return contextMap[position] || '位置信息未知';
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

  // 🧹 清理一局结束后的对话历史（保留会话ID）
  clearGameHistory(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messageHistory = [];
      conversation.lastActivity = Date.now();
      console.log(`🧹 清理对话历史: ${conversationId}`);
    }
  }

  // 📊 获取简化统计信息
  getStatistics() {
    const conversations = Array.from(this.conversations.values());
    
    return {
      totalConversations: conversations.length,
      averageMessagesPerConversation: conversations.length > 0
        ? Math.round(conversations.reduce((sum, c) => sum + c.messageHistory.length, 0) / conversations.length)
        : 0
    };
  }

  // 🎯 获取扑克专业知识
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