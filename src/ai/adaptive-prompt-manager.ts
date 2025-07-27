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
POSITION: ${position} (${player?.position + 1}/${gameState.players.length} players)
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
POSITION: ${position} (${player?.position + 1}/${gameState.players.length} players)
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
POSITION: ${position} (${player?.position + 1}/${gameState.players.length} players)
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

  private getPlayerPosition(gameState: NewGameState, playerId: string): string {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return "unknown";

    const totalPlayers = gameState.players.length;
    const dealerIndex = gameState.dealerIndex;
    const relativePosition = (player.position - dealerIndex + totalPlayers) % totalPlayers;

    // 标准位置映射
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];

    if (totalPlayers <= 6) {
      const shortPositions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
      return shortPositions[relativePosition] || 'UTG';
    }

    return positions[relativePosition] || 'UTG';
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
    return "2:1"; // 简化实现
  }

  private calculateSPR(gameState: NewGameState, playerId: string): number {
    return 5.0; // 简化实现
  }



  private getStackSizes(gameState: NewGameState): string {
    return "深筹码"; // 简化实现
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
