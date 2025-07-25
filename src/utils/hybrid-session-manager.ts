import { GameContext, GTODecision, PlayerNote, AISystemConfig } from '../types/gto-poker';
import { PlayerNotesManager } from './player-notes';

// 🔥 V1.5混合会话架构 - 修正版：使用chat/completions但实现会话管理
export class HybridSessionManager {
  private config: AISystemConfig;
  private currentSessionId: string = '';
  private totalTokens: number = 0;
  private handHistory: string[] = [];
  private systemPrompt: string = '';
  private conversationHistory: Array<{role: string, content: string}> = [];
  
  // Token管理常量
  private readonly TOKEN_THRESHOLD = 37500; // 50K的75%
  private readonly MAX_CONTEXT_WINDOW = 50000;
  
  constructor(config: AISystemConfig) {
    this.config = config;
    console.log(`🎯 初始化混合会话管理器 V1.5 - Token阈值: ${this.TOKEN_THRESHOLD}`);
    console.log(`📡 API端点: ${config.baseUrl}/chat/completions`);
  }

  // 🔥 核心决策函数 - 使用chat/completions但实现混合会话逻辑
  async makeAIDecision(
    newTurnInfo: string,
    context: GameContext,
    aiPlayerName: string,
    opponentId?: string
  ): Promise<GTODecision> {
    
    console.log(`\n🎯 ${aiPlayerName} [混合会话V1.5] 开始决策分析`);
    console.log(`📊 当前Token计数: ${this.totalTokens}/${this.TOKEN_THRESHOLD}`);
    
    // 将新信息加入历史记录
    this.handHistory.push(newTurnInfo);
    
    let response: any;
    let isResetMode = false;
    
    // 🔥 核心逻辑：检查是否需要进行上下文总结
    if (this.totalTokens >= this.TOKEN_THRESHOLD) {
      console.log(`\n🔄 [总结模式] Token数达到阈值，开始会话重置...`);
      isResetMode = true;
      
      // 1. 提炼历史
      const compactHistory = this.summarizeHistory();
      
      // 2. 构建完整系统提示
      const systemPrompt = this.buildSystemPrompt(
        aiPlayerName, 
        context.position, 
        opponentId
      );
      
      // 3. 构建重置后的完整对话
      const resetMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: `已加载牌局历史：${compactHistory}` },
        { role: 'user', content: this.buildUserPrompt(newTurnInfo, context, aiPlayerName) }
      ];
      
      // 4. 重置会话状态
      response = await this.sendChatCompletionsRequest(resetMessages);
      
      // 5. 重置对话历史
      this.conversationHistory = resetMessages;
      this.currentSessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
      
    } else {
      console.log(`\n➡️ [有状态模式] 继续现有会话...`);
      
      // 默认使用有状态模式
      if (this.conversationHistory.length === 0) {
        // 新会话开始
        console.log(`🆕 新牌局开始，初始化对话历史`);
        const systemPrompt = this.buildSystemPrompt(
          aiPlayerName,
          context.position,
          opponentId
        );
        
        const userPrompt = this.buildUserPrompt(newTurnInfo, context, aiPlayerName);
        
        this.conversationHistory = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];
        
        this.currentSessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
      } else {
        // 继续现有会话，添加新的用户消息
        console.log(`🔄 继续会话，添加增量信息`);
        const incrementalPrompt = this.buildIncrementalUserPrompt(newTurnInfo, context, aiPlayerName);
        this.conversationHistory.push({ role: 'user', content: incrementalPrompt });
      }
      
      response = await this.sendChatCompletionsRequest(this.conversationHistory);
    }

    // 更新会话状态
    if (response.choices?.[0]?.message) {
      this.conversationHistory.push({
        role: 'assistant',
        content: response.choices[0].message.content
      });
    }
    
    if (isResetMode) {
      // 总结模式：重置Token计数器
      this.totalTokens = response.usage?.total_tokens || 0;
      console.log(`🔄 会话已重置，Token计数器更新为: ${this.totalTokens}`);
    } else {
      // 有状态模式：累加Token
      this.totalTokens += (response.usage?.total_tokens || 0);
      console.log(`📈 Token计数器累加至: ${this.totalTokens}`);
    }

    // 解析AI决策
    return this.parseAIResponse(response, aiPlayerName);
  }

  // 🔥 修正：使用chat/completions API发送请求
  private async sendChatCompletionsRequest(messages: Array<{role: string, content: string}>): Promise<any> {
    
    const requestBody = {
      model: this.config.model,
      messages: messages,
      response_format: { type: 'json_object' },
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2000
    };

    console.log(`📤 发送Chat Completions请求:`);
    console.log(`   端点: ${this.config.baseUrl}/chat/completions`);
    console.log(`   模型: ${this.config.model}`);
    console.log(`   会话ID: ${this.currentSessionId}`);
    console.log(`   消息数量: ${messages.length}`);
    console.log(`   当前Token估算: ${this.totalTokens}`);
    
    try {
      const startTime = Date.now();
      
      // 🔥 使用正确的chat/completions端点
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          // 可以添加自定义会话标识头部
          'X-Session-ID': this.currentSessionId
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat Completions API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Chat Completions API请求成功 (${responseTime}ms)`);
      console.log(`📊 Token使用情况:`, data.usage);
      console.log(`🎯 会话ID: ${this.currentSessionId}`);
      
      return data;
      
    } catch (error) {
      console.error(`❌ Chat Completions API请求失败:`, error);
      throw error;
    }
  }

  // 🔥 构建系统提示 - 包含会话识别
  private buildSystemPrompt(
    aiPlayerName: string, 
    position: string, 
    opponentId?: string
  ): string {
    const opponentNotes = opponentId ? PlayerNotesManager.getHighConfidenceNotes(opponentId, 0.7) : [];
    
    const basePrompt = `你是世界顶级的德州扑克AI，名为"Goliath"，精通游戏理论最优（GTO）策略。

**🎯 会话信息:**
- **会话ID:** ${this.currentSessionId}
- **你的名字:** ${aiPlayerName}
- **你的当前位置:** ${position}
- **架构版本:** V1.5混合会话
- **你的角色:** GTO德州扑克专家AI

你的核心目标是最大化长期期望价值（EV）。你必须以强大的GTO框架为基础进行游戏，但同时需要根据观察到的对手特定倾向，做出智能的、有据可依的偏离调整。

**游戏环境:**
- **游戏类型:** 9人桌 (9-handed) 无限注德州扑克
- **盲注级别:** 50 / 100

**⚠️ 重要响应格式要求:**
你的回答必须严格遵循以下JSON格式，不得有任何额外内容：

{"action": "fold", "amount": 0, "reasoning": "你的决策理由"}

有效的action值：
- "fold" (弃牌)
- "check" (过牌) 
- "call" (跟注)
- "raise" (加注/下注)
- "all-in" (全押)

对于"raise"和"all-in"，amount表示加注到的总金额。
对于"call"、"check"、"fold"，amount设为0。

**GTO计算要求:**
- 始终考虑底池赔率、预期价值和范围优势
- 在翻前严格遵循GTO开牌范围和位置策略
- 翻后基于牌面结构、位置和对手范围进行精确计算
- 平衡价值下注和虚张声势的频率
- 根据有效筹码深度调整策略

**对手剥削策略:**
- 仅在有充分数据支持时偏离GTO
- 对紧密对手增加虚张声势频率
- 对松凶对手减少虚张声势，增加价值下注
- 根据对手的下注尺度偏好调整自己的尺度`;

    // 动态加载对手笔记
    let notesSection = '\n\n### 对手的长期行为笔记 (长期记忆)\n';
    
    if (opponentNotes.length === 0) {
      notesSection += '暂无关于对手的具体笔记。严格遵循基准GTO策略进行游戏。';
    } else {
      // 按类别和可信度组织笔记
      const categorizedNotes = this.categorizeNotes(opponentNotes);
      
      Object.entries(categorizedNotes).forEach(([category, notes]) => {
        if (notes.length > 0) {
          notesSection += `\n**${this.getCategoryName(category)}:**\n`;
          notes.forEach(note => {
            notesSection += `- ${note.noteText} (可信度: ${note.confidence.toFixed(2)})\n`;
          });
        }
      });
    }

    this.systemPrompt = basePrompt + notesSection;
    return this.systemPrompt;
  }

  // 🔥 构建用户提示 - 新牌局开始
  private buildUserPrompt(
    newTurnInfo: string,
    context: GameContext,
    aiPlayerName: string
  ): string {
    return `**当前手牌上下文:**
这是当前手牌的历史行动记录（记住：你的名字是 ${aiPlayerName}）:
${newTurnInfo}

**当前决策点:**
- **你是:** ${aiPlayerName}
- **你的位置:** ${context.position}
- **公共牌:** [${context.communityCards}]
- **你的手牌:** [${context.yourHand}]
- **底池大小:** ${context.potSize}
- **你的剩余筹码:** ${context.yourStack}
- **对手剩余筹码:** ${context.opponentStack}
- **当前阶段:** ${context.phase}
- **盲注级别:** ${context.blindLevels.small}/${context.blindLevels.big}

**⚠️ 重要提醒:**
- 你的名字是 **${aiPlayerName}**
- 在历史记录中，**${aiPlayerName}** 的行动就是你自己的行动
- 其他玩家的名字和行动都是你的对手

**GTO分析要求:**
1. **范围分析:** 基于位置和行动历史，分析你的范围和对手的可能范围
2. **牌面分析:** 评估当前牌面的湿润程度、你的范围优势和坚果优势
3. **底池赔率:** 计算当前底池赔率和所需胜率
4. **EV计算:** 估算各个行动选项的期望价值
5. **平衡策略:** 确保你的策略在长期内无法被剥削

**决策请求:**
轮到你 (${aiPlayerName}) 行动。请基于你的GTO核心计算，并结合System Prompt中提供的对手笔记，对当前局面进行全面分析。

⚠️ 你的回答必须只包含一个有效的JSON对象，格式如下：
{"action": "你的行动", "amount": 金额数字, "reasoning": "你的决策理由"}

记住：优先遵循GTO原则，仅在有明确证据表明对手有可剥削倾向时才偏离基准策略。`;
  }

  // 🔥 构建增量用户提示 - 继续会话
  private buildIncrementalUserPrompt(
    newTurnInfo: string,
    context: GameContext,
    aiPlayerName: string
  ): string {
    return `**最新局面更新 (会话ID: ${this.currentSessionId}):**
${newTurnInfo}

**更新后的决策点:**
- **你是:** ${aiPlayerName}
- **你的位置:** ${context.position}
- **公共牌:** [${context.communityCards}]
- **你的手牌:** [${context.yourHand}]
- **底池大小:** ${context.potSize}
- **你的剩余筹码:** ${context.yourStack}
- **当前阶段:** ${context.phase}

轮到你 (${aiPlayerName}) 行动。基于之前的对话上下文和这个最新更新，请做出你的GTO决策。

⚠️ 返回格式：{"action": "你的行动", "amount": 金额数字, "reasoning": "你的决策理由"}`;
  }

  // 🔥 总结历史记录 - 提炼为紧凑格式
  private summarizeHistory(): string {
    if (this.handHistory.length === 0) {
      return '新牌局开始，暂无历史记录。';
    }

    console.log(`📝 开始总结历史记录，共${this.handHistory.length}条记录`);
    
    // 简化版总结逻辑 - 保留最关键的信息
    const recentHistory = this.handHistory.slice(-10); // 保留最近10条记录
    const keyActions = recentHistory.filter(action => 
      action.includes('加注') || 
      action.includes('全押') || 
      action.includes('弃牌') ||
      action.includes('跟注')
    );

    // 构建紧凑历史
    let summary = '**牌局历史摘要:**\n';
    
    if (keyActions.length > 0) {
      summary += keyActions.slice(-5).map((action, index) => {
        return `${index + 1}. ${action}`;
      }).join('\n');
    } else {
      summary += '主要为过牌和小额跟注，无显著激进行为。';
    }

    summary += '\n\n**重要模式:**\n';
    const raiseCount = this.handHistory.filter(h => h.includes('加注')).length;
    const foldCount = this.handHistory.filter(h => h.includes('弃牌')).length;
    
    if (raiseCount > foldCount) {
      summary += '- 对手表现较为激进\n';
    } else if (foldCount > raiseCount * 2) {
      summary += '- 对手表现较为保守\n';
    } else {
      summary += '- 对手行为相对平衡\n';
    }

    console.log(`✅ 历史总结完成，压缩至${summary.length}字符`);
    return summary;
  }

  // 🔥 解析AI响应
  private parseAIResponse(response: any, aiPlayerName: string): GTODecision {
    try {
      const aiContent = response.choices?.[0]?.message?.content || '';
      console.log(`📝 ${aiPlayerName} 原始响应:`, aiContent);
      
      // 使用现有的JSON提取逻辑
      const decision = this.extractJSONFromText(aiContent);
      
      if (!decision) {
        throw new Error('无法从AI回复中提取有效的决策JSON');
      }
      
      // 验证决策格式
      if (!this.validateDecision(decision)) {
        throw new Error(`AI返回的决策格式不正确: ${JSON.stringify(decision)}`);
      }
      
      console.log(`✅ ${aiPlayerName} 决策解析成功:`, decision);
      return decision as GTODecision;
      
    } catch (error) {
      console.error(`❌ ${aiPlayerName} 响应解析失败:`, error);
      
      // 返回GTO备用决策
      return this.getGTOBackupDecision();
    }
  }

  // 🔥 JSON提取逻辑 - 复用现有代码
  private extractJSONFromText(text: string): any | null {
    console.log(`🔍 开始提取JSON，原始文本长度: ${text.length}`);
    
    // 清理文本
    const cleanText = text.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();

    // 方法1: 提取markdown代码块中的JSON
    const markdownPatterns = [
      /```json\s*(\{[\s\S]*?\})\s*```/gi,
      /```\s*(\{[\s\S]*?\})\s*```/gi
    ];

    for (const pattern of markdownPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          try {
            const parsed = JSON.parse(match[1].trim());
            if (this.isValidDecision(parsed)) {
              return this.normalizeDecision(parsed);
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    // 方法2: 提取标准JSON对象
    const jsonPatterns = [
      /\{[\s\S]*?"action"[\s\S]*?\}/gi,
      /\{[\s\S]*?\}/gi
    ];

    for (const pattern of jsonPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match[0].trim());
          if (this.isValidDecision(parsed)) {
            return this.normalizeDecision(parsed);
          }
        } catch (e) {
          continue;
        }
      }
    }

    // 方法3: 智能关键词提取
    return this.extractFromKeywords(text);
  }

  // 🔥 关键词提取 - 复用现有逻辑
  private extractFromKeywords(text: string): any | null {
    const lowerText = text.toLowerCase();
    
    let action = '';
    let amount = 0;
    let reasoning = '基于文本分析的GTO决策';

    if (lowerText.includes('fold') || lowerText.includes('弃牌')) {
      action = 'fold';
      reasoning = '基于GTO分析选择弃牌';
    } else if (lowerText.includes('all-in') || lowerText.includes('全押')) {
      action = 'all-in';
      reasoning = '基于GTO分析选择全押';
    } else if (lowerText.includes('raise') || lowerText.includes('加注') || lowerText.includes('bet') || lowerText.includes('下注')) {
      action = 'raise';
      reasoning = '基于GTO分析选择加注';
      
      // 尝试提取金额
      const amountMatch = text.match(/(\d+)/);
      if (amountMatch) {
        amount = parseInt(amountMatch[1]);
      }
    } else if (lowerText.includes('call') || lowerText.includes('跟注')) {
      action = 'call';
      reasoning = '基于GTO分析选择跟注';
    } else if (lowerText.includes('check') || lowerText.includes('过牌')) {
      action = 'check';
      reasoning = '基于GTO分析选择过牌';
    }

    if (action) {
      return { action, amount, reasoning };
    }

    return null;
  }

  // 验证决策有效性
  private isValidDecision(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.action === 'string' &&
      ['fold', 'check', 'call', 'bet', 'raise', 'all-in'].includes(obj.action)
    );
  }

  // 标准化决策格式
  private normalizeDecision(decision: any): any {
    if (decision.action === 'bet') {
      decision.action = 'raise';
    }

    decision.amount = parseInt(decision.amount) || 0;

    if (!decision.reasoning || typeof decision.reasoning !== 'string') {
      decision.reasoning = `GTO决策: ${decision.action}${decision.amount > 0 ? ` ${decision.amount}` : ''}`;
    }

    return decision;
  }

  // 验证AI决策格式
  private validateDecision(decision: any): boolean {
    return (
      decision &&
      typeof decision.action === 'string' &&
      ['fold', 'check', 'call', 'bet', 'raise', 'all-in'].includes(decision.action) &&
      typeof decision.amount === 'number' &&
      typeof decision.reasoning === 'string' &&
      decision.reasoning.length > 0
    );
  }

  // GTO备用决策
  private getGTOBackupDecision(): GTODecision {
    return {
      action: 'fold',
      amount: 0,
      reasoning: 'V1.5混合会话系统备用决策：保守弃牌'
    };
  }

  // 分类笔记
  private categorizeNotes(notes: PlayerNote[]): { [category: string]: PlayerNote[] } {
    const categorized: { [category: string]: PlayerNote[] } = {};
    
    notes.forEach(note => {
      if (!categorized[note.category]) {
        categorized[note.category] = [];
      }
      categorized[note.category].push(note);
    });
    
    return categorized;
  }

  // 获取类别名称
  private getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      'preflop': '翻前行为',
      'postflop': '翻后行为',
      'bluffing': '虚张声势',
      'value_betting': '价值下注',
      'folding': '弃牌倾向',
      'sizing': '下注尺度',
      'position': '位置打法'
    };
    return names[category] || category;
  }

  // 🔥 重置会话 - 手动重置
  public resetSession(): void {
    console.log(`🔄 手动重置混合会话V1.5`);
    this.currentSessionId = '';
    this.totalTokens = 0;
    this.handHistory = [];
    this.systemPrompt = '';
    this.conversationHistory = [];
  }

  // 🔥 获取会话状态
  public getSessionStatus(): {
    sessionId: string;
    totalTokens: number;
    tokenThreshold: number;
    maxTokens: number;
    isNearLimit: boolean;
    historyLength: number;
    conversationLength: number;
  } {
    return {
      sessionId: this.currentSessionId,
      totalTokens: this.totalTokens,
      tokenThreshold: this.TOKEN_THRESHOLD,
      maxTokens: this.MAX_CONTEXT_WINDOW,
      isNearLimit: this.totalTokens >= this.TOKEN_THRESHOLD * 0.9,
      historyLength: this.handHistory.length,
      conversationLength: this.conversationHistory.length
    };
  }
}