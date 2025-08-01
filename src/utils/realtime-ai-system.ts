import { Card, GameState } from '../types/poker';

// 🧠 实时AI状态管理器 - 像真人一样持续思考
export class RealtimeAISystem {
  private static instances: Map<string, RealtimeAISystem> = new Map();
  private playerId: string;
  private playerName: string;
  
  // AI的实时状态
  private currentThoughts: AIThoughts = {
    position: null,
    holeCards: null,
    handStrength: 0,
    opponents: [],
    potOdds: 0,
    expectedValue: 0,
    strategy: 'unknown',
    confidence: 0,
    lastUpdate: 0
  };
  
  // 持续的分析流
  private analysisStream: AnalysisUpdate[] = [];
  private isActive: boolean = false;
  
  // API配置
  private apiConfig: {
    apiKey: string;
    baseUrl: string;
    model: string;
  } | null = null;

  private constructor(playerId: string, playerName: string) {
    this.playerId = playerId;
    this.playerName = playerName;
  }

  // 获取或创建AI实例
  public static getInstance(playerId: string, playerName: string): RealtimeAISystem {
    if (!RealtimeAISystem.instances.has(playerId)) {
      RealtimeAISystem.instances.set(playerId, new RealtimeAISystem(playerId, playerName));
    }
    return RealtimeAISystem.instances.get(playerId)!;
  }

  // 🎯 配置API
  public configureAPI(apiKey: string, baseUrl: string, model: string): void {
    this.apiConfig = { apiKey, baseUrl, model };
    console.log(`🔧 ${this.playerName} API配置完成`);
  }

  // 🪑 玩家坐下 - 开始实时分析
  public async onPlayerSitDown(gameState: GameState, position: number): Promise<void> {
    this.isActive = true;
    this.currentThoughts.position = position;
    this.currentThoughts.lastUpdate = Date.now();

    console.log(`
🪑 ${this.playerName} 坐下了！
📍 位置: ${position} (${this.getPositionName(position, gameState.players.length)})
👥 对手数量: ${gameState.players.length - 1}
🎯 开始实时分析...`);

    // 立即分析位置优势和对手情况
    await this.analyzePosition(gameState, position);
    await this.analyzeOpponents(gameState);
  }

  // 🃏 发牌后立即分析
  public async onCardsDealt(holeCards: Card[], gameState: GameState): Promise<void> {
    if (!this.isActive || !this.apiConfig) return;

    this.currentThoughts.holeCards = holeCards;
    this.currentThoughts.lastUpdate = Date.now();
    
    console.log(`
🃏 ${this.playerName} 收到手牌: [${holeCards.map(c => `${c.rank}${c.suit}`).join(', ')}]
🧠 立即开始分析...`);

    // 立即分析手牌强度
    await this.analyzeHoleCards(holeCards, gameState);
  }

  // ⚡ 实时更新 - 每个行动都触发
  public async onActionUpdate(action: string, amount: number, playerId: string, gameState: GameState): Promise<void> {
    if (!this.isActive || !this.apiConfig || playerId === this.playerId) return;

    console.log(`
⚡ ${this.playerName} 观察到行动: ${action} ${amount}
🧠 实时更新分析...`);

    // 实时更新分析
    await this.updateAnalysis(action, amount, playerId, gameState);
  }

  // 🎯 轮到自己 - 秒出决策
  public async makeInstantDecision(gameState: GameState, communityCards: Card[]): Promise<{ action: string; amount?: number }> {
    if (!this.isActive || !this.apiConfig) {
      throw new Error('AI未激活或未配置');
    }

    const startTime = Date.now();
    
    console.log(`
🎯 轮到 ${this.playerName} 行动！
⚡ 基于实时分析做出决策...
🧠 当前思考状态: ${JSON.stringify(this.currentThoughts, null, 2)}`);

    // 基于已有的分析快速决策
    const decision = await this.generateInstantDecision(gameState, communityCards);
    
    const responseTime = Date.now() - startTime;
    console.log(`
✅ ${this.playerName} 决策完成！
🎯 行动: ${decision.action}${decision.amount ? ` (${decision.amount})` : ''}
⏱️ 响应时间: ${responseTime}ms
🚀 实时系统优势明显！`);

    return decision;
  }

  // 🔍 分析位置优势
  private async analyzePosition(gameState: GameState, position: number): Promise<void> {
    const prompt = this.buildPositionAnalysisPrompt(gameState, position);
    
    try {
      const analysis = await this.sendStreamingRequest(prompt, 'position');
      this.updateThoughts('position', analysis);
    } catch (error) {
      console.warn(`⚠️ 位置分析失败:`, error);
    }
  }

  // 🃏 分析手牌强度
  private async analyzeHoleCards(holeCards: Card[], gameState: GameState): Promise<void> {
    const prompt = this.buildHoleCardsAnalysisPrompt(holeCards, gameState);
    
    try {
      const analysis = await this.sendStreamingRequest(prompt, 'holecards');
      this.updateThoughts('handStrength', analysis);
    } catch (error) {
      console.warn(`⚠️ 手牌分析失败:`, error);
    }
  }

  // ⚡ 更新分析
  private async updateAnalysis(action: string, amount: number, playerId: string, gameState: GameState): Promise<void> {
    const prompt = this.buildActionUpdatePrompt(action, amount, playerId, gameState);
    
    try {
      const analysis = await this.sendStreamingRequest(prompt, 'update');
      this.updateThoughts('strategy', analysis);
    } catch (error) {
      console.warn(`⚠️ 实时更新失败:`, error);
    }
  }

  // 🎯 生成即时决策
  private async generateInstantDecision(gameState: GameState, communityCards: Card[]): Promise<{ action: string; amount?: number }> {
    const prompt = this.buildInstantDecisionPrompt(gameState, communityCards);
    
    const response = await this.sendStreamingRequest(prompt, 'decision');
    return this.parseDecisionResponse(response);
  }

  // 🌐 发送流式请求
  private async sendStreamingRequest(prompt: string, type: string): Promise<any> {
    if (!this.apiConfig) throw new Error('API未配置');

    const payload = {
      model: this.apiConfig.model,
      messages: [
        {
          role: 'system',
          content: `你是${this.playerName}，世界顶级德州扑克AI。你正在进行实时分析。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // 极低温度确保一致性
      max_tokens: 3000 // 🔧 统一token限制为3000，解决截断问题
    };

    console.log(`🌐 ${this.playerName} 发送${type}分析请求...`);

    const response = await fetch(`${this.apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiConfig.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();
    
    // 🔍 检查finish_reason，确保响应完整
    const choice = result.choices[0];
    if (choice.finish_reason === 'length') {
      console.warn(`⚠️ ${this.playerName} ${type}分析因token限制被截断 (finish_reason: length)`);
      throw new Error('响应被截断，请增加max_tokens限制');
    }
    
    const content = choice.message.content;
    
    // 🔍 检查内容完整性
    if (!content || content.trim().length === 0) {
      throw new Error('API返回空内容');
    }
    
    console.log(`📥 ${this.playerName} 收到${type}分析: ${content}`);
    
    return JSON.parse(content);
  }

  // 🧠 更新思考状态
  private updateThoughts(aspect: string, analysis: any): void {
    this.analysisStream.push({
      timestamp: Date.now(),
      aspect,
      analysis,
      confidence: analysis.confidence || 0.5
    });

    // 更新当前思考
    switch (aspect) {
      case 'position':
        this.currentThoughts.strategy = analysis.strategy;
        break;
      case 'handStrength':
        this.currentThoughts.handStrength = analysis.strength;
        break;
      case 'strategy':
        this.currentThoughts.expectedValue = analysis.expectedValue;
        break;
    }

    this.currentThoughts.confidence = analysis.confidence || this.currentThoughts.confidence;
    this.currentThoughts.lastUpdate = Date.now();

    console.log(`🧠 ${this.playerName} 更新思考: ${aspect}`);
  }

  // 📝 构建提示词
  private buildPositionAnalysisPrompt(gameState: GameState, position: number): string {
    return `**位置分析请求**
你的位置: ${position}
总玩家数: ${gameState.players.length}
盲注: ${gameState.smallBlind}/${gameState.bigBlind}

分析你的位置优势和基本策略。

返回格式: {"strategy": "tight/loose/aggressive", "advantage": "early/middle/late", "confidence": 0.8}`;
  }

  private buildHoleCardsAnalysisPrompt(holeCards: Card[], gameState: GameState): string {
    return `**手牌分析请求**
你的手牌: [${holeCards.map(c => `${c.rank}${c.suit}`).join(', ')}]
位置: ${this.currentThoughts.position}
阶段: ${gameState.phase}

分析手牌强度和建议策略。

返回格式: {"strength": 0.75, "category": "premium/strong/medium/weak", "strategy": "aggressive/cautious", "confidence": 0.9}`;
  }

  private buildActionUpdatePrompt(action: string, amount: number, playerId: string, gameState: GameState): string {
    return `**实时更新分析**
对手行动: ${action} ${amount}
当前底池: ${gameState.pot}
你的位置: ${this.currentThoughts.position}

基于这个行动更新你的策略。

返回格式: {"expectedValue": 0.6, "adjustedStrategy": "tighter/looser", "opponentRead": "strong/weak/bluff", "confidence": 0.8}`;
  }

  private buildInstantDecisionPrompt(gameState: GameState, communityCards: Card[]): string {
    return `**即时决策请求**
基于你的实时分析做出决策：

当前思考状态: ${JSON.stringify(this.currentThoughts)}
公共牌: [${communityCards.map(c => `${c.rank}${c.suit}`).join(', ')}]
底池: ${gameState.pot}
当前下注: ${gameState.currentBet}
你的筹码: ${gameState.players.find(p => p.id === this.playerId)?.chips}

立即决策！

返回格式: {"action": "fold/check/call/raise/all-in", "amount": 数字, "reasoning": "基于实时分析的理由"}`;
  }

  // 🔧 解析决策响应
  private parseDecisionResponse(response: any): { action: string; amount?: number } {
    if (!response.action) {
      throw new Error('无效的决策响应');
    }

    return {
      action: response.action,
      amount: response.amount || 0
    };
  }

  // 🔧 辅助方法
  private getPositionName(position: number, totalPlayers: number): string {
    if (totalPlayers === 9) {
      const positions = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'];
      return positions[position] || `位置${position}`;
    }
    return `位置${position}`;
  }

  // 🧠 分析对手
  private async analyzeOpponents(gameState: GameState): Promise<void> {
    const opponents = gameState.players.filter(p => p.id !== this.playerId);
    this.currentThoughts.opponents = opponents.map(p => p.name);

    console.log(`🧠 ${this.playerName} 分析对手: ${this.currentThoughts.opponents.join(', ')}`);

    if (this.apiConfig) {
      try {
        const prompt = this.buildOpponentAnalysisPrompt(opponents);
        const analysis = await this.sendStreamingRequest(prompt, 'opponents');
        this.updateThoughts('opponents', analysis);
      } catch (error) {
        console.warn(`⚠️ 对手分析失败:`, error);
      }
    }
  }

  private buildOpponentAnalysisPrompt(opponents: Player[]): string {
    return `**对手分析请求**
你的位置: ${this.currentThoughts.position}
对手信息: ${opponents.map(p => `${p.name}(位置${p.position}, 筹码${p.chips})`).join(', ')}

分析对手的基本情况和你的相对位置优势。

返回格式: {"opponentCount": ${opponents.length}, "positionAdvantage": "early/middle/late", "stackSizes": "analysis", "confidence": 0.8}`;
  }

  // 📊 获取当前状态
  public getCurrentThoughts(): AIThoughts {
    return { ...this.currentThoughts };
  }

  // 🔄 重置状态
  public reset(): void {
    this.isActive = false;
    this.currentThoughts = {
      position: null,
      holeCards: null,
      handStrength: 0,
      opponents: [],
      potOdds: 0,
      expectedValue: 0,
      strategy: 'unknown',
      confidence: 0,
      lastUpdate: 0
    };
    this.analysisStream = [];
    console.log(`🔄 ${this.playerName} 状态已重置`);
  }
}

// 类型定义
interface AIThoughts {
  position: number | null;
  holeCards: Card[] | null;
  handStrength: number;
  opponents: string[];
  potOdds: number;
  expectedValue: number;
  strategy: string;
  confidence: number;
  lastUpdate: number;
}

interface AnalysisUpdate {
  timestamp: number;
  aspect: string;
  analysis: any;
  confidence: number;
}
