import { NewGameState } from '../core/game-engine';
import { Card } from '../types/poker';

// 📊 复杂度评估结果
export interface ComplexityAssessment {
    totalScore: number;        // 总复杂度分数 (0-100)
    category: 'simple' | 'medium' | 'complex' | 'extreme';
    factors: {
      handStrengthAmbiguity: number;    // 牌力模糊度 (0-25)
      opponentRangeWidth: number;       // 对手范围宽度 (0-25) 
      actionSequenceComplexity: number; // 行动序列复杂度 (0-25)
      stackAndPotDynamics: number;      // 筹码和底池动态 (0-25)
    };
    recommendedTimeout: number;         // 推荐超时时间(ms)
    recommendedTemperature: number;     // 推荐AI温度
    promptType: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  }

// 🎯 局势复杂度分析器
export class SituationComplexityAnalyzer {

  // 🎯 主要分析入口
  analyzeSituation(
    gameState: NewGameState,
    playerId: string,
    holeCards: Card[]
  ): ComplexityAssessment {

    // 🚀 调试：检查gameState.phase
    console.log('🔍 SituationComplexityAnalyzer收到的gameState:', {
      phase: gameState.phase,
      phaseType: typeof gameState.phase,
      gameStateKeys: Object.keys(gameState),
      hasPhase: 'phase' in gameState,
      gameStateStructure: {
        gameId: gameState.gameId,
        phase: gameState.phase,
        players: gameState.players?.length,
        pot: gameState.pot
      }
    });

    // 简化实现：基于游戏阶段的基础复杂度评估
    let baseScore = 0;

    // 根据游戏阶段设置基础分数
    switch (gameState.phase) {
      case 'preflop':
        baseScore = 20; // 翻前相对简单
        break;
      case 'flop':
        baseScore = 35; // 翻牌中等复杂
        break;
      case 'turn':
        baseScore = 50; // 转牌较复杂
        break;
      case 'river':
        baseScore = 65; // 河牌最复杂
        break;
      default:
        baseScore = 30;
    }

    // 根据底池大小调整
    const pot = gameState.pot || 0;
    const bigBlind = gameState.bigBlind || 100;
    const potBBs = pot / bigBlind;

    if (potBBs > 20) baseScore += 15; // 大底池增加复杂度
    else if (potBBs > 10) baseScore += 8;
    else if (potBBs > 5) baseScore += 3;

    // 根据对手数量调整
    const activeOpponents = gameState.players.filter(p => p.isActive && p.id !== playerId).length;
    if (activeOpponents >= 3) baseScore += 10; // 多人底池
    else if (activeOpponents >= 2) baseScore += 5;

    const totalScore = Math.min(baseScore, 100);

    const factors = {
      handStrengthAmbiguity: Math.floor(totalScore * 0.3),
      opponentRangeWidth: Math.floor(totalScore * 0.25),
      actionSequenceComplexity: Math.floor(totalScore * 0.25),
      stackAndPotDynamics: Math.floor(totalScore * 0.2)
    };

    return {
      totalScore,
      category: this.categorizeComplexity(totalScore),
      factors,
      recommendedTimeout: this.getRecommendedTimeout(totalScore),
      recommendedTemperature: this.getRecommendedTemperature(totalScore),
      promptType: this.getPromptType(totalScore)
    };
  }

  // 🏷️ 复杂度分类
  private categorizeComplexity(score: number): 'simple' | 'medium' | 'complex' | 'extreme' {
    if (score <= 25) return 'simple';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'complex';
    return 'extreme';
  }

  // ⏱️ 推荐超时时间 (临时放宽限制确保稳定性)
  private getRecommendedTimeout(score: number): number {
    if (score <= 25) return 15000;  // 15秒 - 简单局势
    if (score <= 50) return 25000;  // 25秒 - 中等复杂度
    if (score <= 75) return 35000;  // 35秒 - 复杂局势
    return 45000; // 45秒 - 极复杂局势
  }

  // 🌡️ 推荐AI温度
  private getRecommendedTemperature(score: number): number {
    if (score <= 25) return 0.1;   // 简单局势，低温度
    if (score <= 50) return 0.3;   // 中等复杂，中等温度
    if (score <= 75) return 0.5;   // 复杂局势，较高温度
    return 0.7; // 极复杂，高温度保持创造性
  }

  // 📝 推荐Prompt类型
  private getPromptType(score: number): 'minimal' | 'standard' | 'detailed' | 'comprehensive' {
    if (score <= 25) return 'minimal';
    if (score <= 50) return 'standard';
    if (score <= 75) return 'detailed';
    return 'comprehensive';
  }
}
