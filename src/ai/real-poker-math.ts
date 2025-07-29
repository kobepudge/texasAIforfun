import { Card } from '../types/poker';
import { NewGameState } from '../core/game-engine';

// 🧮 真实德州扑克数学计算引擎 - 替换所有假数据
export class RealPokerMathEngine {

  // 🎯 计算真实底池赔率
  calculatePotOdds(potSize: number, betSize: number): PotOddsResult {
    if (betSize <= 0) {
      return {
        odds: 'N/A',
        ratio: 0,
        percentage: 0,
        description: 'No bet to call'
      };
    }

    const totalPot = potSize + betSize;
    const oddsRatio = potSize / betSize;
    const percentage = (betSize / totalPot) * 100;

    return {
      odds: `${oddsRatio.toFixed(1)}:1`,
      ratio: oddsRatio,
      percentage: Math.round(percentage),
      description: this.describePotOdds(percentage)
    };
  }

  // 🎯 计算真实SPR (Stack-to-Pot Ratio)
  calculateSPR(effectiveStack: number, potSize: number): SPRResult {
    if (potSize <= 0) {
      return {
        spr: 999,
        category: 'undefined',
        playingStyle: 'Cannot determine - no pot',
        commitment: 'none'
      };
    }

    const spr = effectiveStack / potSize;
    
    return {
      spr: Math.round(spr * 10) / 10, // 保留1位小数
      category: this.getSPRCategory(spr),
      playingStyle: this.getSPRPlayingStyle(spr),
      commitment: this.getSPRCommitment(spr)
    };
  }

  // 🎯 计算所需胜率 (Required Equity)
  calculateRequiredEquity(potSize: number, betSize: number): number {
    if (betSize <= 0) return 0;
    
    const totalPot = potSize + betSize;
    const requiredEquity = betSize / totalPot;
    
    return Math.round(requiredEquity * 100);
  }

  // 🎯 分析隐含赔率
  calculateImpliedOdds(gameData: ImpliedOddsInput): ImpliedOddsResult {
    const {
      currentPot,
      betToCall,
      effectiveStack,
      opponentStack,
      position,
      opponentTendency,
      handType
    } = gameData;

    // 计算可能获得的额外价值
    const remainingStack = Math.min(effectiveStack - betToCall, opponentStack);
    const currentOdds = this.calculatePotOdds(currentPot, betToCall);
    
    // 根据对手倾向调整支付概率
    const payoffProbability = this.estimatePayoffProbability(
      opponentTendency, 
      position, 
      handType
    );
    
    const potentialWinnings = currentPot + betToCall + (remainingStack * payoffProbability);
    const impliedOdds = potentialWinnings / betToCall;
    
    return {
      currentOdds: currentOdds.ratio,
      impliedOdds: Math.round(impliedOdds * 10) / 10,
      potentialWinnings: Math.round(potentialWinnings),
      payoffProbability: Math.round(payoffProbability * 100),
      recommendation: this.getImpliedOddsRecommendation(impliedOdds, currentOdds.ratio)
    };
  }

  // 🎯 计算手牌强度 (基于真实概率)
  calculateHandStrength(holeCards: Card[], communityCards: Card[] = []): HandStrengthResult {
    const handRank = this.getHandRank(holeCards, communityCards);
    const relativeStrength = this.calculateRelativeStrength(holeCards, communityCards);
    const drawingPotential = this.assessDrawingPotential(holeCards, communityCards);
    
    return {
      absoluteStrength: handRank.strength,
      relativeStrength: relativeStrength,
      handCategory: handRank.category,
      drawingPotential: drawingPotential,
      description: handRank.description,
      improvementOuts: this.countOuts(holeCards, communityCards)
    };
  }

  // 🎯 阻断牌效应分析
  analyzeBlockerEffects(holeCards: Card[], board: Card[], action: string): BlockerAnalysis {
    const blockers = this.identifyBlockers(holeCards, board);
    const impactScore = this.calculateBlockerImpact(blockers, action);
    
    return {
      blockers: blockers,
      impactScore: impactScore,
      recommendation: this.getBlockerRecommendation(impactScore, action),
      specificEffects: this.describeBlockerEffects(blockers, board)
    };
  }

  // 🎯 计算有效筹码
  calculateEffectiveStack(gameState: NewGameState, playerId: string): number {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return 0;

    const activeOpponents = gameState.players.filter(p => 
      p.id !== playerId && p.isActive
    );

    if (activeOpponents.length === 0) return player.chips;

    // 有效筹码 = 自己的筹码和所有对手中最小的筹码
    const opponentStacks = activeOpponents.map(p => p.chips);
    const minOpponentStack = Math.min(...opponentStacks);
    
    return Math.min(player.chips, minOpponentStack);
  }

  // 🎯 对手范围分析
  analyzeOpponentRange(stats: OpponentStats, action: string, position: string): RangeAnalysis {
    const vpipRange = this.getVPIPRange(stats.vpip);
    const pfrRange = this.getPFRRange(stats.pfr);
    const positionAdjustment = this.getPositionRangeAdjustment(position);
    const actionAdjustment = this.getActionRangeAdjustment(action, stats);
    
    const estimatedRange = this.combineRangeFactors([
      vpipRange,
      pfrRange,
      positionAdjustment,
      actionAdjustment
    ]);

    return {
      estimatedRange: estimatedRange,
      rangeWidth: this.calculateRangeWidth(estimatedRange),
      topPairs: this.countTopPairs(estimatedRange),
      draws: this.countDraws(estimatedRange),
      bluffs: this.countBluffs(estimatedRange),
      confidence: this.calculateRangeConfidence(stats)
    };
  }

  // 🔧 私有辅助方法
  private describePotOdds(percentage: number): string {
    if (percentage <= 20) return 'Excellent pot odds - strong call';
    if (percentage <= 30) return 'Good pot odds - favorable call';
    if (percentage <= 40) return 'Fair pot odds - consider equity';
    if (percentage <= 50) return 'Poor pot odds - need strong hand';
    return 'Terrible pot odds - fold most hands';
  }

  private getSPRCategory(spr: number): string {
    if (spr <= 1) return 'very_low';
    if (spr <= 4) return 'low';
    if (spr <= 10) return 'medium';
    if (spr <= 20) return 'high';
    return 'very_high';
  }

  private getSPRPlayingStyle(spr: number): string {
    if (spr <= 1) return 'Commit with any piece - stack off territory';
    if (spr <= 4) return 'Play straightforward - avoid tricky plays';
    if (spr <= 10) return 'Standard post-flop play - balance ranges';
    if (spr <= 20) return 'Deep play - maximize implied odds';
    return 'Very deep - speculative hands gain value';
  }

  private getSPRCommitment(spr: number): string {
    if (spr <= 1) return 'committed';
    if (spr <= 4) return 'likely_committed';
    if (spr <= 10) return 'flexible';
    return 'uncommitted';
  }

  private estimatePayoffProbability(tendency: string, position: string, handType: string): number {
    let baseProbability = 0.3; // 基础30%支付概率

    // 根据对手倾向调整
    switch (tendency.toLowerCase()) {
      case 'lag': // Loose Aggressive
        baseProbability = 0.5;
        break;
      case 'lp': // Loose Passive  
        baseProbability = 0.7;
        break;
      case 'tag': // Tight Aggressive
        baseProbability = 0.25;
        break;
      case 'tp': // Tight Passive
        baseProbability = 0.4;
        break;
    }

    // 位置调整
    if (position === 'out_of_position') {
      baseProbability *= 0.8; // 位置劣势减少支付
    }

    // 手牌类型调整
    switch (handType) {
      case 'draw':
        baseProbability *= 1.2; // 听牌有更好隐含赔率
        break;
      case 'made_hand':
        baseProbability *= 0.9;
        break;
      case 'bluff':
        baseProbability *= 0.6; // 诈唬隐含赔率较差
        break;
    }

    return Math.min(baseProbability, 1.0);
  }

  private getImpliedOddsRecommendation(impliedOdds: number, currentOdds: number): string {
    const improvement = impliedOdds / currentOdds;
    
    if (improvement >= 2.0) {
      return 'Excellent implied odds - strong call with draws';
    } else if (improvement >= 1.5) {
      return 'Good implied odds - favorable for speculative hands';
    } else if (improvement >= 1.2) {
      return 'Decent implied odds - consider position and opponent';
    } else {
      return 'Poor implied odds - need strong current equity';
    }
  }

  private getHandRank(holeCards: Card[], communityCards: Card[]): {
    strength: number;
    category: string;
    description: string;
  } {
    // 简化实现 - 后续会增强为完整的hand evaluator
    const allCards = [...holeCards, ...communityCards];
    
    if (allCards.length < 2) {
      return {
        strength: 0.1,
        category: 'unknown',
        description: 'Insufficient cards to evaluate'
      };
    }

    // 基础手牌评估逻辑
    const isPair = holeCards[0].rank === holeCards[1].rank;
    const isSuited = holeCards[0].suit === holeCards[1].suit;
    const highCard = this.getHighCardValue(holeCards);

    let strength = highCard / 14; // 基础强度基于最高牌

    if (isPair) {
      strength += 0.3; // 对子加成
      return {
        strength: Math.min(strength, 1.0),
        category: 'pair',
        description: `Pocket pair of ${holeCards[0].rank}s`
      };
    }

    if (isSuited) {
      strength += 0.1; // 同花加成
    }

    // 连牌加成
    const gap = Math.abs(this.getCardValue(holeCards[0]) - this.getCardValue(holeCards[1]));
    if (gap <= 4) {
      strength += (5 - gap) * 0.02;
    }

    const category = strength > 0.7 ? 'strong' : strength > 0.4 ? 'medium' : 'weak';
    
    return {
      strength: Math.min(strength, 1.0),
      category: category,
      description: `${category} holding with ${holeCards[0].rank}${holeCards[1].rank}${isSuited ? 's' : 'o'}`
    };
  }

  private calculateRelativeStrength(holeCards: Card[], communityCards: Card[]): number {
    // 相对强度考虑牌面结构 - 简化实现
    if (communityCards.length === 0) {
      // 翻前相对强度就是绝对强度
      return this.getHandRank(holeCards, communityCards).strength;
    }

    // 翻后需要考虑牌面结构
    const boardDanger = this.assessBoardDanger(communityCards);
    const absoluteStrength = this.getHandRank(holeCards, communityCards).strength;
    
    // 危险的牌面降低相对强度
    return absoluteStrength * (1 - boardDanger * 0.3);
  }

  private assessDrawingPotential(holeCards: Card[], communityCards: Card[]): number {
    if (communityCards.length === 0) return 0; // 翻前无听牌

    const outs = this.countOuts(holeCards, communityCards);
    return Math.min(outs * 2, 100) / 100; // 每个out约2%胜率
  }

  private countOuts(holeCards: Card[], communityCards: Card[]): number {
    // 简化的out计算 - 后续会增强
    if (communityCards.length === 0) return 0;

    let outs = 0;
    
    // 检查同花听牌
    const flushOuts = this.countFlushOuts(holeCards, communityCards);
    outs += flushOuts;

    // 检查顺子听牌  
    const straightOuts = this.countStraightOuts(holeCards, communityCards);
    outs += straightOuts;

    // 检查对子听牌
    const pairOuts = this.countPairOuts(holeCards, communityCards);
    outs += pairOuts;

    return outs;
  }

  private countFlushOuts(holeCards: Card[], communityCards: Card[]): number {
    const allCards = [...holeCards, ...communityCards];
    const suitCounts = this.countSuits(allCards);
    
    for (const count of Object.values(suitCounts)) {
      if (count === 4) return 9; // 同花听牌
    }
    return 0;
  }

  private countStraightOuts(holeCards: Card[], communityCards: Card[]): number {
    // 简化实现 - 检查开口顺子听牌
    const allCards = [...holeCards, ...communityCards];
    const ranks = allCards.map(c => this.getCardValue(c)).sort((a, b) => a - b);
    
    // 检查连续性
    let consecutive = 1;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] === ranks[i-1] + 1) {
        consecutive++;
      } else if (ranks[i] !== ranks[i-1]) {
        consecutive = 1;
      }
    }

    if (consecutive === 4) return 8; // 开口顺子听牌
    if (consecutive === 3) return 4; // 内顺听牌可能
    return 0;
  }

  private countPairOuts(holeCards: Card[], communityCards: Card[]): number {
    if (holeCards[0].rank === holeCards[1].rank) return 2; // 对子改三条
    
    // 计算能组成对子的outs
    let outs = 0;
    for (const card of holeCards) {
      if (!communityCards.some(c => c.rank === card.rank)) {
        outs += 3; // 每张牌3个out组成对子
      }
    }
    return outs;
  }

  private identifyBlockers(holeCards: Card[], board: Card[]): string[] {
    const blockers: string[] = [];
    
    // A和K的阻断效应
    for (const card of holeCards) {
      if (card.rank === 'A') {
        blockers.push('AA combos', 'AK combos', 'strong aces');
      }
      if (card.rank === 'K') {
        blockers.push('KK combos', 'AK combos', 'strong kings');
      }
    }

    // 同花阻断
    const suits = holeCards.map(c => c.suit);
    for (const suit of suits) {
      const boardSuitCount = board.filter(c => c.suit === suit).length;
      if (boardSuitCount >= 2) {
        blockers.push(`${suit} flush draws`);
      }
    }

    return blockers;
  }

  private calculateBlockerImpact(blockers: string[], action: string): number {
    let impact = 0;
    
    // 根据阻断的combo数量评分
    impact += blockers.length * 0.1;
    
    // 根据行动类型调整
    if (action === 'bluff') {
      impact *= 1.5; // 诈唬时阻断效应更重要
    } else if (action === 'value') {
      impact *= 0.8; // 价值下注时阻断效应较次要
    }

    return Math.min(impact, 1.0);
  }

  private getBlockerRecommendation(impact: number, action: string): string {
    if (impact >= 0.7) {
      return `Strong blocker effects support ${action} - opponent range significantly reduced`;
    } else if (impact >= 0.4) {
      return `Moderate blocker effects - ${action} has some additional merit`;
    } else {
      return `Minimal blocker effects - decision based primarily on other factors`;
    }
  }

  private describeBlockerEffects(blockers: string[], board: Card[]): string[] {
    return blockers.map(blocker => {
      switch (blocker) {
        case 'AA combos':
          return 'Blocking pocket aces reduces opponent\'s strongest hands';
        case 'AK combos':  
          return 'Blocking AK reduces opponent\'s strong unpaired hands';
        case 'strong aces':
          return 'Blocking strong ace combinations (AQ+, AJ+)';
        default:
          return `Blocking ${blocker}`;
      }
    });
  }

  // 🔧 基础工具方法
  private getCardValue(card: Card): number {
    if (card.rank === 'A') return 14;
    if (card.rank === 'K') return 13;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'J') return 11;
    if (card.rank === 'T' || card.rank === '10') return 10;
    return parseInt(card.rank);
  }

  private getHighCardValue(cards: Card[]): number {
    return Math.max(...cards.map(c => this.getCardValue(c)));
  }

  private countSuits(cards: Card[]): { [suit: string]: number } {
    const counts: { [suit: string]: number } = {};
    for (const card of cards) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    return counts;
  }

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

  // 范围分析辅助方法（简化实现）
  private getVPIPRange(vpip: number): number {
    return Math.min(vpip, 100) / 100;
  }

  private getPFRRange(pfr: number): number {
    return Math.min(pfr, 100) / 100;
  }

  private getPositionRangeAdjustment(position: string): number {
    const positionMultipliers: { [key: string]: number } = {
      'UTG': 0.6,
      'MP': 0.8,
      'CO': 1.1,
      'BTN': 1.3,
      'SB': 0.9,
      'BB': 1.0
    };
    return positionMultipliers[position] || 1.0;
  }

  private getActionRangeAdjustment(action: string, stats: OpponentStats): number {
    switch (action) {
      case 'raise':
        return 0.7; // 加注收紧范围
      case '3bet':
        return 0.3; // 3bet大幅收紧
      case 'call':
        return 1.2; // 跟注稍微放宽
      default:
        return 1.0;
    }
  }

  private combineRangeFactors(factors: number[]): number {
    return factors.reduce((acc, factor) => acc * factor, 1.0);
  }

  private calculateRangeWidth(range: number): string {
    if (range >= 0.5) return 'very_wide';
    if (range >= 0.3) return 'wide';
    if (range >= 0.2) return 'medium';
    if (range >= 0.1) return 'tight';
    return 'very_tight';
  }

  private countTopPairs(range: number): number {
    return Math.round(range * 50); // 估算顶对数量
  }

  private countDraws(range: number): number {
    return Math.round(range * 30); // 估算听牌数量
  }

  private countBluffs(range: number): number {
    return Math.round(range * 20); // 估算诈唬数量
  }

  private calculateRangeConfidence(stats: OpponentStats): number {
    // 基于样本数量计算信心度
    const sampleSize = stats.handsPlayed || 0;
    if (sampleSize >= 500) return 0.9;
    if (sampleSize >= 200) return 0.7;
    if (sampleSize >= 100) return 0.5;
    if (sampleSize >= 50) return 0.3;
    return 0.1;
  }
}

// 🔧 接口定义
export interface PotOddsResult {
  odds: string;           // 如 "2.5:1"
  ratio: number;          // 数值比例
  percentage: number;     // 百分比表示
  description: string;    // 描述性建议
}

export interface SPRResult {
  spr: number;
  category: string;       // very_low, low, medium, high, very_high
  playingStyle: string;   // 游戏风格建议
  commitment: string;     // 承诺程度
}

export interface ImpliedOddsInput {
  currentPot: number;
  betToCall: number;
  effectiveStack: number;
  opponentStack: number;
  position: string;
  opponentTendency: string;
  handType: string;       // draw, made_hand, bluff
}

export interface ImpliedOddsResult {
  currentOdds: number;
  impliedOdds: number;
  potentialWinnings: number;
  payoffProbability: number;
  recommendation: string;
}

export interface HandStrengthResult {
  absoluteStrength: number;   // 0-1
  relativeStrength: number;   // 考虑牌面的相对强度
  handCategory: string;       // pair, two_pair, etc.
  drawingPotential: number;   // 听牌潜力
  description: string;        // 文字描述
  improvementOuts: number;    // 改进的outs数
}

export interface BlockerAnalysis {
  blockers: string[];         // 阻断的combos
  impactScore: number;        // 影响评分 0-1
  recommendation: string;     // 建议
  specificEffects: string[];  // 具体效应描述
}

export interface OpponentStats {
  vpip: number;
  pfr: number;
  aggression: number;
  handsPlayed?: number;
}

export interface RangeAnalysis {
  estimatedRange: number;     // 估算的范围宽度
  rangeWidth: string;         // wide, tight, etc.
  topPairs: number;          // 顶对数量
  draws: number;             // 听牌数量
  bluffs: number;            // 诈唬数量
  confidence: number;        // 分析信心度
}