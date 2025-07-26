import { NewGameState } from '../core/game-engine';
import { Card } from '../types/poker';

// 🎯 自适应Prompt管理器
export class AdaptivePromptManager {
  
  // 📝 根据复杂度生成对应的Prompt
  generatePrompt(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    complexityLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive',
    timeLimit: number,
    temperature: number
  ): string {
    
    switch (complexityLevel) {
      case 'minimal':
        return this.generateMinimalPrompt(gameState, playerId, holeCards, timeLimit);
      case 'standard':
        return this.generateStandardPrompt(gameState, playerId, holeCards, timeLimit);
      case 'detailed':
        return this.generateDetailedPrompt(gameState, playerId, holeCards, timeLimit, temperature);
      case 'comprehensive':
        return this.generateComprehensivePrompt(gameState, playerId, holeCards, timeLimit, temperature);
      default:
        return this.generateStandardPrompt(gameState, playerId, holeCards, timeLimit);
    }
  }

  // ⚡ 极简Prompt - 用于明显决策
  private generateMinimalPrompt(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    timeLimit: number
  ): string {
    const player = gameState.players.find(p => p.id === playerId);
    const handStr = `${holeCards[0].rank}${holeCards[0].suit}${holeCards[1].rank}${holeCards[1].suit}`;
    const pot = gameState.pot;
    const toCall = this.getAmountToCall(gameState, playerId);
    const stack = player?.chips || 0;
    
    return `FAST_POKER_DECISION
Hand: ${handStr}
Pot: ${pot}
ToCall: ${toCall}
Stack: ${stack}
Phase: ${gameState.phase}
Board: ${this.getBoardString(gameState.communityCards)}

RESPOND_JSON_ONLY:
{"action": "fold/call/raise", "amount": number, "confidence": 0.8}`;
  }

  // 📊 标准Prompt - 用于常规决策
  private generateStandardPrompt(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    timeLimit: number
  ): string {
    const player = gameState.players.find(p => p.id === playerId);
    const handStr = `${holeCards[0].rank}${holeCards[0].suit}${holeCards[1].rank}${holeCards[1].suit}`;
    const position = this.getPlayerPosition(gameState, playerId);
    const opponents = this.getActiveOpponents(gameState, playerId);
    
    return `PokerGPT-Pro标准分析 | 时限: ${timeLimit}ms

🃏 手牌: ${handStr}
📍 位置: ${position}
💰 筹码: ${player?.chips || 0}
🎯 底池: ${gameState.pot}
📋 阶段: ${gameState.phase}
🎲 牌面: ${this.getBoardString(gameState.communityCards)}
👥 对手: ${opponents.length}人

快速分析要求:
1. 手牌强度 (1-10)
2. 位置优势评估
3. 底池赔率计算
4. 基础GTO策略

JSON格式回复:
{
  "action": "fold/call/raise",
  "amount": number,
  "confidence": 0.8,
  "reasoning": "简洁理由(15字内)",
  "hand_strength": 7,
  "position_factor": "early/middle/late"
}`;
  }

  // 🔍 详细Prompt - 用于复杂决策
  private generateDetailedPrompt(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    timeLimit: number,
    temperature: number
  ): string {
    const player = gameState.players.find(p => p.id === playerId);
    const handStr = `${holeCards[0].rank}${holeCards[0].suit}${holeCards[1].rank}${holeCards[1].suit}`;
    const actionHistory = this.getActionHistory(gameState);
    const potOdds = this.calculatePotOdds(gameState, playerId);
    const stackSizes = this.getStackSizes(gameState);
    
    return `PokerGPT-Pro深度分析 | 时限: ${timeLimit}ms | 温度: ${temperature}

🎮 游戏状态:
- 手牌: ${handStr}
- 位置: ${this.getPlayerPosition(gameState, playerId)}
- 筹码: ${player?.chips || 0} (${Math.round((player?.chips || 0) / gameState.bigBlind)}BB)
- 底池: ${gameState.pot} (${Math.round(gameState.pot / gameState.bigBlind)}BB)
- 阶段: ${gameState.phase}
- 牌面: ${this.getBoardString(gameState.communityCards)}

📊 关键数据:
- 底池赔率: ${potOdds}
- 跟注金额: ${this.getAmountToCall(gameState, playerId)}
- SPR: ${this.calculateSPR(gameState, playerId)}
- 对手数量: ${this.getActiveOpponents(gameState, playerId).length}

📈 行动历史:
${actionHistory.slice(-5).map(a => `${a.player}: ${a.action} ${a.amount || ''}`).join('\n')}

🎯 分析要求:
1. 手牌强度评估 (考虑牌面结构)
2. 位置优势分析
3. 对手范围估计
4. 底池赔率 vs 胜率计算
5. 隐含赔率考虑
6. GTO基础 + 对手调整

JSON格式回复:
{
  "action": "fold/call/raise",
  "amount": number,
  "confidence": 0.8,
  "reasoning": "详细推理(30字内)",
  "hand_strength": 7,
  "position_factor": "early/middle/late",
  "opponent_adjustment": "tighter/standard/looser",
  "pot_odds_analysis": "favorable/marginal/unfavorable"
}`;
  }

  // 🧠 综合Prompt - 用于极复杂决策
  private generateComprehensivePrompt(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    timeLimit: number,
    temperature: number
  ): string {
    const player = gameState.players.find(p => p.id === playerId);
    const handStr = `${holeCards[0].rank}${holeCards[0].suit}${holeCards[1].rank}${holeCards[1].suit}`;
    const boardTexture = this.analyzeBoardTexture(gameState.communityCards);
    const opponentProfiles = this.getOpponentProfiles(gameState, playerId);
    const gameFlow = this.analyzeGameFlow(gameState);
    
    return `PokerGPT-Pro专家级分析 | 时限: ${timeLimit}ms | 温度: ${temperature}

🎮 完整游戏状态:
- 手牌: ${handStr}
- 位置: ${this.getPlayerPosition(gameState, playerId)} (${this.getPositionDetails(gameState, playerId)})
- 筹码: ${player?.chips || 0} (${Math.round((player?.chips || 0) / gameState.bigBlind)}BB)
- 底池: ${gameState.pot} (${Math.round(gameState.pot / gameState.bigBlind)}BB)
- 阶段: ${gameState.phase}
- 牌面: ${this.getBoardString(gameState.communityCards)}

🎲 牌面分析:
- 结构: ${boardTexture.texture}
- 听牌: ${boardTexture.draws}
- 危险度: ${boardTexture.danger}

👥 对手档案:
${opponentProfiles.map(p => `${p.name}: ${p.style} (VPIP: ${p.vpip}%, PFR: ${p.pfr}%)`).join('\n')}

📊 高级数据:
- 底池赔率: ${this.calculatePotOdds(gameState, playerId)}
- SPR: ${this.calculateSPR(gameState, playerId)}
- 隐含赔率: ${this.calculateImpliedOdds(gameState, playerId)}
- 反向隐含赔率: ${this.calculateReverseImpliedOdds(gameState, playerId)}

📈 游戏流程:
- 翻前行动: ${gameFlow.preflop}
- 翻后趋势: ${gameFlow.postflop}
- 激进度: ${gameFlow.aggression}

🎯 专家级分析要求:
1. 精确手牌强度评估 (考虑所有因素)
2. 对手范围构建与更新
3. 多层次EV计算 (直接+隐含+反向隐含)
4. 心理博弈层次分析
5. 平衡策略考虑
6. Meta-game调整
7. 风险管理评估

JSON格式回复:
{
  "action": "fold/call/raise",
  "amount": number,
  "confidence": 0.8,
  "reasoning": "深度推理(50字内)",
  "hand_strength": 7,
  "position_factor": "early/middle/late",
  "opponent_adjustment": "tighter/standard/looser",
  "play_type": "value/bluff/protection/pot_control",
  "ev_analysis": {
    "fold_ev": number,
    "call_ev": number,
    "raise_ev": number
  },
  "risk_assessment": "low/medium/high",
  "meta_considerations": "string"
}`;
  }

  // 辅助方法 (简化实现)
  private getBoardString(communityCards: Card[]): string {
    if (!communityCards || !communityCards.length) return "无";
    return communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
  }

  private getPlayerPosition(gameState: NewGameState, playerId: string): string {
    return "middle"; // 简化实现
  }

  private getActiveOpponents(gameState: NewGameState, playerId: string): any[] {
    return gameState.players.filter(p => p.isActive && p.id !== playerId);
  }

  private getAmountToCall(gameState: NewGameState, playerId: string): number {
    return 0; // 简化实现
  }

  private calculatePotOdds(gameState: NewGameState, playerId: string): string {
    return "2:1"; // 简化实现
  }

  private calculateSPR(gameState: NewGameState, playerId: string): number {
    return 5.0; // 简化实现
  }

  private getActionHistory(gameState: NewGameState): Array<{player: string; action: string; amount?: number}> {
    return []; // 简化实现
  }

  private getStackSizes(gameState: NewGameState): string {
    return "深筹码"; // 简化实现
  }

  private analyzeBoardTexture(communityCards: Card[]): {texture: string; draws: string; danger: string} {
    return {texture: "干燥", draws: "无", danger: "低"}; // 简化实现
  }

  private getOpponentProfiles(gameState: NewGameState, playerId: string): Array<{name: string; style: string; vpip: number; pfr: number}> {
    return []; // 简化实现
  }

  private analyzeGameFlow(gameState: NewGameState): {preflop: string; postflop: string; aggression: string} {
    return {preflop: "标准", postflop: "被动", aggression: "中等"}; // 简化实现
  }

  private getPositionDetails(gameState: NewGameState, playerId: string): string {
    return "CO位"; // 简化实现
  }

  private calculateImpliedOdds(gameState: NewGameState, playerId: string): string {
    return "良好"; // 简化实现
  }

  private calculateReverseImpliedOdds(gameState: NewGameState, playerId: string): string {
    return "中等"; // 简化实现
  }
}
