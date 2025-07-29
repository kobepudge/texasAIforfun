import { NewGameState } from '../core/game-engine';
import { Card } from '../types/poker';
import { RealPokerMathEngine } from './real-poker-math.ts';

// 🎯 自适应Prompt管理器
export class AdaptivePromptManager {
  private pokerMath: RealPokerMathEngine;

  constructor() {
    this.pokerMath = new RealPokerMathEngine();
  }
  
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
    const handStr = `${holeCards[0].rank}${holeCards[0].suit} ${holeCards[1].rank}${holeCards[1].suit}`;
    const pot = gameState.pot;
    const toCall = this.getAmountToCall(gameState, playerId);
    const stack = player?.chips || 0;
    const board = this.getBoardString(gameState.communityCards);

    return `OBVIOUS: ${handStr} vs ${board}, Pot:${pot}, Call:${toCall}, Stack:${stack}
→ {"action":"fold/check/call/raise/all-in","amount":0,"confidence":0.9}`;
  }

  // 📊 标准Prompt - 用于常规决策
  private generateStandardPrompt(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[],
    timeLimit: number
  ): string {
    const player = gameState.players.find(p => p.id === playerId);
    const handStr = `${holeCards[0].rank}${holeCards[0].suit} ${holeCards[1].rank}${holeCards[1].suit}`;
    const position = this.getPlayerPosition(gameState, playerId);
    const toCall = this.getAmountToCall(gameState, playerId);
    const actionHistory = this.getActionHistory(gameState);
    const opponents = this.getActiveOpponents(gameState, playerId);

    return `=== TEXAS HOLDEM DECISION ===
YOUR HAND: ${handStr}
BOARD: ${this.getBoardString(gameState.communityCards)}
POSITION: ${position} | ${this.getPositionContext(gameState, playerId)}
${this.buildPositionMap(gameState, playerId)}
CHIPS: ${player?.chips || 0} | POT: ${gameState.pot} | TO CALL: ${toCall}
PHASE: ${gameState.phase}

COMPLETE GAME STATE:
${JSON.stringify({
  gameState: {
    phase: gameState.phase,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    bigBlind: gameState.bigBlind,
    board: gameState.communityCards.map(c => `${c.rank}${c.suit}`),
    myPosition: position,
    myChips: player?.chips || 0,
    myCards: [holeCards[0], holeCards[1]].map(c => `${c.rank}${c.suit}`),
    toCall: toCall,
    potOdds: toCall > 0 ? `${(gameState.pot / toCall).toFixed(1)}:1` : "N/A"
  },
  detailedBettingHistory: this.buildDetailedBettingSequence(gameState),
  currentRoundSummary: this.buildCurrentRoundSummary(gameState),
  opponents: opponents.map(opp => ({
    name: opp.name,
    position: this.getPlayerPosition(gameState, opp.id),
    chips: opp.chips,
    isActive: opp.isActive,
    style: "unknown" // 可以后续添加
  })),
  gameFormat: {
    blinds: `${gameState.smallBlind}/${gameState.bigBlind}`,
    tableSize: gameState.players.length,
    gameType: "cash"
  }
}, null, 2)}

RESPOND ONLY: {"action":"fold/check/call/raise/all-in","amount":number,"confidence":0.8}`;

    // 调试：打印完整Prompt
    console.log(`🔍 标准Prompt内容:\n${result}`);
    return result;
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
    const handStr = `${holeCards[0].rank}${holeCards[0].suit} ${holeCards[1].rank}${holeCards[1].suit}`;
    const position = this.getPlayerPosition(gameState, playerId);
    const toCall = this.getAmountToCall(gameState, playerId);
    const actionHistory = this.getActionHistory(gameState);
    const opponents = this.getActiveOpponents(gameState, playerId);

    return `=== COMPLEX POKER DECISION ===
YOUR HAND: ${handStr}
BOARD: ${this.getBoardString(gameState.communityCards)}
POSITION: ${position} | ${this.getPositionContext(gameState, playerId)}
${this.buildPositionMap(gameState, playerId)}
CHIPS: ${player?.chips || 0} | POT: ${gameState.pot} | TO CALL: ${toCall}

COMPLETE GAME DATA:
${JSON.stringify({
  gameState: {
    phase: gameState.phase,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    bigBlind: gameState.bigBlind,
    board: gameState.communityCards.map(c => `${c.rank}${c.suit}`),
    myPosition: position,
    myChips: player?.chips || 0,
    myCards: [holeCards[0], holeCards[1]].map(c => `${c.rank}${c.suit}`),
    toCall: toCall,
    potOdds: toCall > 0 ? `${(gameState.pot / toCall).toFixed(1)}:1` : "N/A",
    stackToPotRatio: toCall > 0 ? ((player?.chips || 0) / gameState.pot).toFixed(1) : "N/A"
  },
  detailedBettingHistory: this.buildDetailedBettingSequence(gameState),
  currentRoundSummary: this.buildCurrentRoundSummary(gameState),
  opponents: opponents.map(opp => ({
    name: opp.name,
    position: this.getPlayerPosition(gameState, opp.id),
    chips: opp.chips,
    isActive: opp.isActive,
    stackBB: Math.round((opp.chips || 0) / gameState.bigBlind)
  })),
  boardAnalysis: {
    texture: this.analyzeBoardTexture(gameState.communityCards),
    drawPossible: gameState.communityCards.length >= 3,
    pairedBoard: this.isPairedBoard(gameState.communityCards)
  },
  gameFormat: {
    blinds: `${gameState.smallBlind}/${gameState.bigBlind}`,
    tableSize: gameState.players.length,
    gameType: "cash",
    effectiveStacks: Math.min(...opponents.map(opp => opp.chips || 0), player?.chips || 0)
  }
}, null, 2)}

ANALYZE: Hand strength, position, pot odds, opponent ranges, board texture
RESPOND ONLY: {"action":"fold/check/call/raise/all-in","amount":number,"confidence":0.8}`;

    // 调试：打印完整Prompt
    console.log(`🔍 详细Prompt内容:\n${result}`);
    return result;
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
    const handStr = `${holeCards[0].rank}${holeCards[0].suit} ${holeCards[1].rank}${holeCards[1].suit}`;
    const position = this.getPlayerPosition(gameState, playerId);
    const toCall = this.getAmountToCall(gameState, playerId);
    const opponents = this.getActiveOpponents(gameState, playerId);

    return `=== EXPERT POKER ANALYSIS ===
YOUR HAND: ${handStr}
BOARD: ${this.getBoardString(gameState.communityCards)}
POSITION: ${position} | ${this.getPositionContext(gameState, playerId)}
${this.buildPositionMap(gameState, playerId)}
CHIPS: ${player?.chips || 0} | POT: ${gameState.pot} | TO CALL: ${toCall}

COMPLETE EXPERT GAME DATA:
${JSON.stringify({
  gameState: {
    phase: gameState.phase,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    bigBlind: gameState.bigBlind,
    board: gameState.communityCards.map(c => `${c.rank}${c.suit}`),
    myPosition: position,
    myChips: player?.chips || 0,
    myCards: [holeCards[0], holeCards[1]].map(c => `${c.rank}${c.suit}`),
    toCall: toCall,
    potOdds: toCall > 0 ? `${(gameState.pot / toCall).toFixed(1)}:1` : "N/A",
    stackToPotRatio: toCall > 0 ? ((player?.chips || 0) / gameState.pot).toFixed(1) : "N/A"
  },
  completeActionHistory: this.buildDetailedBettingSequence(gameState),
  currentRoundAnalysis: this.buildCurrentRoundSummary(gameState),
  opponents: opponents.map(opp => ({
    name: opp.name,
    position: this.getPlayerPosition(gameState, opp.id),
    chips: opp.chips,
    stackBB: Math.round((opp.chips || 0) / gameState.bigBlind),
    isActive: opp.isActive
  })),
  expertAnalysis: {
    boardTexture: this.analyzeBoardTexture(gameState.communityCards),
    drawPossible: gameState.communityCards.length >= 3,
    pairedBoard: this.isPairedBoard(gameState.communityCards),
    flushPossible: this.isFlushPossible(gameState.communityCards),
    straightPossible: this.isStraightPossible(gameState.communityCards)
  },
  gameFormat: {
    blinds: `${gameState.smallBlind}/${gameState.bigBlind}`,
    tableSize: gameState.players.length,
    gameType: "cash",
    effectiveStacks: Math.min(...opponents.map(opp => opp.chips || 0), player?.chips || 0)
  }
}, null, 2)}

**位置策略建议**: ${this.getPositionStrategy(gameState, playerId)}

EXPERT ANALYSIS: Hand strength, position, complete betting history, opponent ranges, board texture, pot odds, implied odds, meta-game considerations
RESPOND ONLY: {"action":"fold/check/call/raise/all-in","amount":number,"confidence":0.8}`;

    // 调试：打印完整Prompt
    console.log(`🔍 专家级Prompt内容:\n${result}`);
    return result;
  }

  // 辅助方法 (简化实现)
  private getBoardString(communityCards: Card[]): string {
    if (!communityCards || !communityCards.length) return "无";
    return communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
  }


  private getAmountToCall(gameState: NewGameState, playerId: string): number {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 0;

    const toCall = Math.max(0, gameState.currentBet - (player.currentBet || 0));

    // 调试信息
    console.log(`💰 计算跟注金额: 玩家${player.name}, 当前最高下注${gameState.currentBet}, 玩家已下注${player.currentBet || 0}, 需要跟注${toCall}`);

    return toCall;
  }

  private getActionHistory(gameState: NewGameState): any[] {
    const history = gameState.actionHistory || [];
    console.log(`🔍 AdaptivePromptManager获取行动历史:`, {
      原始长度: history.length,
      原始数据: history,
      gameState类型: typeof gameState,
      gameState键: Object.keys(gameState),
      第一个行动示例: history[0] || null
    });

    // 🔥 修复：转换ActionRecord格式到ActionHistoryItem格式
    const convertedHistory = history.map(action => ({
      playerName: action.playerName,
      action: action.action,
      amount: action.amount,
      phase: action.phase,
      timestamp: action.timestamp
    }));

    console.log(`🔄 转换后的行动历史:`, {
      转换后长度: convertedHistory.length,
      转换后数据: convertedHistory,
      第一个转换示例: convertedHistory[0] || null
    });

    return convertedHistory;
  }

  private getActiveOpponents(gameState: NewGameState, playerId: string): any[] {
    return gameState.players.filter(p => p.id !== playerId && p.isActive);
  }

  private analyzeBoardTexture(communityCards: Card[]): string {
    if (!communityCards || communityCards.length === 0) return "preflop";

    const suits = communityCards.map(c => c.suit);
    const ranks = communityCards.map(c => c.rank);

    // 检查同花可能
    const suitCounts = suits.reduce((acc, suit) => {
      acc[suit] = (acc[suit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxSuitCount = Math.max(...Object.values(suitCounts));
    const flushDraw = maxSuitCount >= 3;

    // 检查顺子可能
    const rankValues = ranks.map(rank => {
      if (rank === 'A') return 14;
      if (rank === 'K') return 13;
      if (rank === 'Q') return 12;
      if (rank === 'J') return 11;
      if (rank === '10') return 10;
      return parseInt(rank);
    }).sort((a, b) => a - b);

    let straightDraw = false;
    for (let i = 0; i < rankValues.length - 1; i++) {
      if (rankValues[i + 1] - rankValues[i] === 1) {
        straightDraw = true;
        break;
      }
    }

    if (flushDraw && straightDraw) return "draw_heavy";
    if (flushDraw) return "flush_draw";
    if (straightDraw) return "straight_draw";

    return "dry";
  }

  private buildDetailedBettingSequence(gameState: NewGameState): any {
    // 🔍 详细调试：检查传入的gameState
    console.log(`🔍 buildDetailedBettingSequence接收到的gameState:`, {
      gameState类型: typeof gameState,
      gameState键: Object.keys(gameState),
      actionHistory字段: gameState.actionHistory,
      actionHistory长度: gameState.actionHistory?.length || 0,
      actionHistory类型: typeof gameState.actionHistory
    });

    const actionHistory = this.getActionHistory(gameState);

    // 调试信息
    console.log(`🔍 构建下注序列: 总行动数${actionHistory?.length || 0}`, actionHistory);

    if (!actionHistory || actionHistory.length === 0) {
      console.log(`⚠️ 行动历史为空`);
      return {
        preflop: [],
        flop: [],
        turn: [],
        river: [],
        summary: "No actions yet - action history is empty"
      };
    }

    // 按阶段分组行动
    const actionsByPhase = {
      preflop: actionHistory.filter(a => a.phase === 'preflop'),
      flop: actionHistory.filter(a => a.phase === 'flop'),
      turn: actionHistory.filter(a => a.phase === 'turn'),
      river: actionHistory.filter(a => a.phase === 'river')
    };

    // 调试每个阶段的行动数量
    console.log(`📊 各阶段行动统计:`, {
      preflop: actionsByPhase.preflop.length,
      flop: actionsByPhase.flop.length,
      turn: actionsByPhase.turn.length,
      river: actionsByPhase.river.length
    });

    // 构建每个阶段的行动序列
    const formatActions = (actions: any[]) =>
      actions.map(a => `${a.playerName}: ${a.action}${a.amount ? `(${a.amount})` : ''}`);

    const result = {
      preflop: formatActions(actionsByPhase.preflop),
      flop: formatActions(actionsByPhase.flop),
      turn: formatActions(actionsByPhase.turn),
      river: formatActions(actionsByPhase.river),
      summary: `Total actions: ${actionHistory.length}, Current phase: ${gameState.phase}`
    };

    console.log(`✅ 构建的下注序列:`, result);
    return result;
  }

  private buildCurrentRoundSummary(gameState: NewGameState): string {
    const allActions = this.getActionHistory(gameState);
    const currentPhaseActions = allActions.filter(a => a.phase === gameState.phase);

    console.log(`🔍 当前轮次总结: 阶段${gameState.phase}, 总行动${allActions.length}, 当前阶段行动${currentPhaseActions.length}`);
    console.log(`📋 当前阶段行动详情:`, currentPhaseActions);

    if (currentPhaseActions.length === 0) {
      return `${gameState.phase} phase started, no actions yet`;
    }

    const actionSummary = currentPhaseActions
      .map(a => `${a.playerName} ${a.action}${a.amount ? ` ${a.amount}` : ''}`)
      .join(' → ');

    const result = `${gameState.phase}: ${actionSummary}`;
    console.log(`✅ 当前轮次总结结果: ${result}`);
    return result;
  }

  private isPairedBoard(communityCards: Card[]): boolean {
    if (!communityCards || communityCards.length < 2) return false;

    const ranks = communityCards.map(c => c.rank);
    const rankCounts = ranks.reduce((acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.values(rankCounts).some(count => count >= 2);
  }

  private isFlushPossible(communityCards: Card[]): boolean {
    if (!communityCards || communityCards.length < 3) return false;

    const suits = communityCards.map(c => c.suit);
    const suitCounts = suits.reduce((acc, suit) => {
      acc[suit] = (acc[suit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Math.max(...Object.values(suitCounts)) >= 3;
  }

  private isStraightPossible(communityCards: Card[]): boolean {
    if (!communityCards || communityCards.length < 3) return false;

    const ranks = communityCards.map(c => c.rank);
    const rankValues = ranks.map(rank => {
      if (rank === 'A') return 14;
      if (rank === 'K') return 13;
      if (rank === 'Q') return 12;
      if (rank === 'J') return 11;
      if (rank === '10') return 10;
      return parseInt(rank);
    }).sort((a, b) => a - b);

    // 检查是否有连续的牌
    for (let i = 0; i < rankValues.length - 2; i++) {
      if (rankValues[i + 1] - rankValues[i] === 1 && rankValues[i + 2] - rankValues[i + 1] === 1) {
        return true;
      }
    }

    return false;
  }

  private getActiveOpponents(gameState: NewGameState, playerId: string): any[] {
    return gameState.players.filter(p => p.isActive && p.id !== playerId);
  }



  private calculatePotOdds(gameState: NewGameState, playerId: string): string {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return "N/A";
    
    const toCall = Math.max(0, gameState.currentBet - (player.currentBet || 0));
    const potOddsResult = this.pokerMath.calculatePotOdds(gameState.pot, toCall);
    
    return potOddsResult.odds;
  }

  private calculateSPR(gameState: NewGameState, playerId: string): number {
    const effectiveStack = this.pokerMath.calculateEffectiveStack(gameState, playerId);
    const sprResult = this.pokerMath.calculateSPR(effectiveStack, gameState.pot);
    
    return sprResult.spr;
  }



  private getStackSizes(gameState: NewGameState): string {
    const totalPlayers = gameState.players.filter(p => p.isActive).length;
    const averageStack = gameState.players.reduce((sum, p) => sum + p.chips, 0) / totalPlayers;
    const bigBlind = gameState.bigBlind || 100;
    const avgStackBB = averageStack / bigBlind;
    
    if (avgStackBB > 100) return "深筹码 (100BB+)";
    if (avgStackBB > 50) return "中筹码 (50-100BB)";
    return "浅筹码 (<50BB)";
  }

  private getOpponentProfiles(gameState: NewGameState, playerId: string): Array<{name: string; style: string; vpip: number; pfr: number}> {
    return gameState.players
      .filter(p => p.id !== playerId && p.isActive)
      .map(p => ({
        name: p.name,
        style: "未知", // 需要从对手档案系统获取
        vpip: 25, // 默认值，需要从统计系统获取
        pfr: 18   // 默认值，需要从统计系统获取
      }));
  }

  private analyzeGameFlow(gameState: NewGameState): {preflop: string; postflop: string; aggression: string} {
    const recentActions = gameState.actionHistory?.slice(-5) || [];
    const raisingActions = recentActions.filter(a => a.action === 'raise' || a.action === 'bet').length;
    const totalActions = recentActions.length;
    
    const aggressionLevel = totalActions > 0 ? raisingActions / totalActions : 0;
    
    return {
      preflop: gameState.phase === 'preflop' ? "进行中" : "已完成",
      postflop: gameState.phase !== 'preflop' ? "进行中" : "未开始", 
      aggression: aggressionLevel > 0.5 ? "激进" : aggressionLevel > 0.2 ? "中等" : "被动"
    };
  }

  private getPositionDetails(gameState: NewGameState, playerId: string): string {
    return this.getPlayerPosition(gameState, playerId);
  }

  private calculateImpliedOdds(gameState: NewGameState, playerId: string): string {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return "无法计算";
    
    const effectiveStack = this.pokerMath.calculateEffectiveStack(gameState, playerId);
    const pot = gameState.pot;
    const stackToPotRatio = effectiveStack / pot;
    
    if (stackToPotRatio > 5) return "极佳 (深筹码)";
    if (stackToPotRatio > 2) return "良好 (中等筹码)";
    return "有限 (浅筹码)";
  }

  private calculateReverseImpliedOdds(gameState: NewGameState, playerId: string): string {
    const boardCards = gameState.communityCards || [];
    if (boardCards.length === 0) return "翻前无逆向隐含赔率";
    
    const boardDanger = this.assessBoardDanger(boardCards);
    
    if (boardDanger > 0.7) return "高风险 (危险牌面)";
    if (boardDanger > 0.4) return "中等风险";
    return "低风险 (安全牌面)";
  }

  // 🔧 辅助方法：评估牌面危险程度
  private assessBoardDanger(communityCards: Card[]): number {
    if (communityCards.length < 3) return 0;
    
    let danger = 0;
    
    // 检查潜在同花
    const suitCounts = this.countSuits(communityCards);
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    if (maxSuitCount >= 3) danger += 0.3;
    
    // 检查潜在顺子
    const ranks = communityCards.map(c => this.getCardValue(c)).sort((a, b) => a - b);
    let consecutive = 1;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] === ranks[i-1] + 1) consecutive++;
    }
    if (consecutive >= 3) danger += 0.2;
    
    // 检查对子面
    const rankCounts: { [rank: string]: number } = {};
    for (const card of communityCards) {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }
    const maxRankCount = Math.max(...Object.values(rankCounts));
    if (maxRankCount >= 2) danger += 0.2;
    
    return Math.min(danger, 1.0);
  }

  private countSuits(cards: Card[]): { [suit: string]: number } {
    const counts: { [suit: string]: number } = {};
    for (const card of cards) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    return counts;
  }

  private getCardValue(card: Card): number {
    if (card.rank === 'A') return 14;
    if (card.rank === 'K') return 13;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'J') return 11;
    if (card.rank === 'T' || card.rank === '10') return 10;
    return parseInt(card.rank);
  }

  // 🎯 获取玩家位置（动态计算相对于庄家的位置）
  private getPlayerPosition(gameState: NewGameState, playerId: string): string {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 'UNKNOWN';
    
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = gameState.dealerIndex;
    const totalPlayers = gameState.players.length;
    
    // 计算相对于庄家的位置
    const relativePosition = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;
    
    // 9人桌标准位置顺序：庄家开始顺时针
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];
    
    // 根据玩家数量调整位置映射
    if (totalPlayers <= 6) {
      const shortPositions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
      return shortPositions[relativePosition] || 'UTG';
    }
    
    return positions[relativePosition] || `POS${relativePosition}`;
  }

  // 🎯 获取位置上下文信息
  private getPositionContext(gameState: NewGameState, playerId: string): string {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 'Unknown Position Context';
    
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    const dealerIndex = gameState.dealerIndex;
    const totalPlayers = gameState.players.length;
    const relativePosition = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;
    const dealerPlayer = gameState.players[dealerIndex];
    
    // 构建完整的位置上下文
    const context = [
      `座位 ${playerIndex + 1}/${totalPlayers}`,
      `庄家: ${dealerPlayer?.name}(座位${dealerIndex + 1})`,
      `相对位置: 第${relativePosition + 1}个行动`
    ];
    
    // 添加位置特点说明
    const position = this.getPlayerPosition(gameState, playerId);
    const positionNote = this.getPositionAdvantage(position);
    if (positionNote) {
      context.push(positionNote);
    }
    
    return context.join(' | ');
  }

  // 🎯 获取位置优势说明
  private getPositionAdvantage(position: string): string {
    const advantages: Record<string, string> = {
      'BTN': '最佳位置(最后行动)',
      'CO': '后位优势(信息多)',
      'MP': '中位(谨慎策略)',
      'MP+1': '中位(观察前位)',
      'UTG': '前位(需要强牌)',
      'UTG+1': '前位(谨慎开局)',
      'UTG+2': '前位(逐步放松)',
      'SB': '小盲(翻后位置差)',
      'BB': '大盲(已投资盲注)'
    };
    
    return advantages[position] || '';
  }

  // 🎯 构建位置分布图（显示所有玩家位置）
  private buildPositionMap(gameState: NewGameState, currentPlayerId: string): string {
    const dealerIndex = gameState.dealerIndex;
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];
    
    const positionMap = gameState.players.map((player, index) => {
      const relativePos = (index - dealerIndex + gameState.players.length) % gameState.players.length;
      const position = positions[relativePos] || `POS${relativePos}`;
      const isCurrentPlayer = player.id === currentPlayerId;
      const marker = isCurrentPlayer ? '👤' : (player.isActive ? '✓' : '✗');
      
      return `${position}:${player.name}${marker}`;
    }).join(' | ');
    
    return `位置分布: ${positionMap}`;
  }

  // 🎯 获取位置策略建议
  private getPositionStrategy(gameState: NewGameState, playerId: string): string {
    const position = this.getPlayerPosition(gameState, playerId);
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return '无法获取位置策略';

    const phase = gameState.phase;
    const activePlayers = gameState.players.filter(p => p.isActive).length;
    const stackBB = Math.round(player.chips / gameState.bigBlind);
    
    // 基于位置的策略建议
    const strategies: Record<string, { general: string; preflop: string; postflop: string; considerations: string[] }> = {
      'UTG': {
        general: '前位需要非常谨慎，只能玩强牌',
        preflop: '开牌范围：AA-99, AK-AQ, 偶然AJs, KQs',
        postflop: '激进价值下注，谨慎bluff，避免多路底池',
        considerations: ['后面还有很多玩家', '位置劣势严重', '需要强牌才能继续']
      },
      'UTG+1': {
        general: '依然是前位，范围可以稍微放宽',
        preflop: '开牌范围：AA-88, AK-AJ, KQ, A10s, 少量中等suited connectors',
        postflop: '倾向于价值导向，少量位置bluff',
        considerations: ['仍有很多玩家在后面', '需要相对强的牌力', '避免被夹击']
      },
      'UTG+2': {
        general: '前位末期，可以开始扩展范围',
        preflop: '开牌范围：AA-77, AK-A10, KQ-KJ, suited connectors',
        postflop: '更多的C-bet机会，适度bluff',
        considerations: ['位置依然不佳', '但可以开始增加攻击性', '观察中后位反应']
      },
      'MP': {
        general: '中位开始，有一定的位置优势',
        preflop: '开牌范围：AA-66, AK-A9, KQ-K10, 更多suited hands',
        postflop: '平衡价值和bluff，利用位置优势',
        considerations: ['有一定信息优势', '可以更积极地游戏', '注意后位的攻击']
      },
      'MP+1': {
        general: '中位后期，范围进一步扩展',
        preflop: '开牌范围：AA-55, AK-A8, KQ-K9, 各种suited connectors',
        postflop: '更多的bluff机会，积极的价值下注',
        considerations: ['位置优势增强', '可以更多地控制pot size', '利用信息优势']
      },
      'CO': {
        general: '后位优势明显，可以更激进',
        preflop: '开牌范围：很宽，包括投机牌和位置bluff',
        postflop: '频繁的C-bet，利用位置优势施压',
        considerations: ['接近最佳位置', '可以偷取很多底池', '对抗盲注位优势大']
      },
      'BTN': {
        general: '最佳位置，最后行动的巨大优势',
        preflop: '开牌范围：极宽，几乎任何两张牌都有游戏价值',
        postflop: '最大化位置优势，频繁bluff和价值下注',
        considerations: ['信息优势最大', '可以控制pot size', '最有利的位置进行bluff']
      },
      'SB': {
        general: '小盲位翻后位置差，需要谨慎',
        preflop: '对抗steal要有选择性地反击，不要过度防守',
        postflop: '优先考虑check/call，避免复杂的多街bluff',
        considerations: ['翻后必须最先行动', '容易被位置欺负', '投资了小盲注但位置差']
      },
      'BB': {
        general: '大盲位已经投资，但翻后位置不佳',
        preflop: '有关闭行动权的优势，可以更宽地防守',
        postflop: 'Donk bet在特定情况下有效，多使用check/raise',
        considerations: ['已投资大盲注', '翻后位置劣势', '需要更强的牌力继续']
      }
    };

    const strategy = strategies[position] || {
      general: '位置策略信息不可用',
      preflop: '根据标准策略进行',
      postflop: '谨慎游戏',
      considerations: ['评估位置优劣势']
    };

    // 根据游戏阶段和筹码深度调整建议
    let stackAdvice = '';
    if (stackBB > 100) {
      stackAdvice = '深筹码：更多的implied odds，可以游戏更多投机牌';
    } else if (stackBB < 30) {
      stackAdvice = '浅筹码：更多push/fold决策，减少后续街复杂性';
    } else {
      stackAdvice = '中等筹码：标准策略适用';
    }

    const phaseStrategy = phase === 'preflop' ? strategy.preflop : strategy.postflop;

    return `
📍 **${position}位置分析**
• **总体策略**: ${strategy.general}
• **当前阶段建议**: ${phaseStrategy}
• **筹码深度建议**: ${stackAdvice}
• **关键考虑**: ${strategy.considerations.join(' | ')}
• **活跃玩家数**: ${activePlayers}人 - ${activePlayers > 6 ? '多人底池，需要更强牌力' : '少人底池，可以更激进'}`;
  }
}
