import {
  PlayerNote,
  OpponentProfile,
  GameContext,
  GTODecision,
  AISystemConfig,
} from "../types/gto-poker";
import { PlayerNotesManager } from "./player-notes";
import { HybridSessionManager } from "./hybrid-session-manager";

// 🔥 GTO AI系统 V1.5 - "Goliath" 混合会话架构
export class GTOAISystem {
  private config: AISystemConfig;
  private hybridSession: HybridSessionManager;

  constructor(config: AISystemConfig) {
    this.config = config;
    this.hybridSession = new HybridSessionManager(config);

    console.log(`🎯 初始化Goliath GTO AI系统 V1.5`);
    console.log(`   模型: ${config.model}`);
    console.log(`   架构: 混合会话 (Hybrid Session)`);
    console.log(`   Token上限: 50,000 (阈值: 37,500)`);
  }

  // 🔥 主决策接口 - 使用混合会话架构
  async makeDecision(
    handHistory: string,
    context: GameContext,
    aiPlayerName: string,
    opponentId?: string,
  ): Promise<GTODecision> {
    console.log(
      `\n🎯 ${aiPlayerName} [Goliath V1.5] 开始混合会话决策`,
    );

    // 显示会话状态
    const sessionStatus = this.hybridSession.getSessionStatus();
    console.log(`📊 会话状态:`, sessionStatus);

    try {
      // 🔥 使用混合会话管理器进行决策
      const decision = await this.hybridSession.makeAIDecision(
        handHistory,
        context,
        aiPlayerName,
        opponentId,
      );

      // 记录行为用于后续分析
      this.recordAIBehavior(
        aiPlayerName,
        decision,
        context,
        opponentId,
      );

      console.log(
        `✅ ${aiPlayerName} [Goliath V1.5] 混合会话决策完成:`,
        decision,
      );
      return decision;
    } catch (error) {
      console.error(
        `❌ ${aiPlayerName} [Goliath V1.5] 混合会话决策失败:`,
        error,
      );

      // 返回GTO备用决策
      return this.getGTOBackupDecision(context);
    }
  }

  // 🔥 记录AI行为用于学习
  private recordAIBehavior(
    aiPlayerName: string,
    decision: GTODecision,
    context: GameContext,
    opponentId?: string,
  ): void {
    if (!opponentId) return;

    const handAction = {
      playerId: aiPlayerName,
      action: decision.action as any,
      amount: decision.amount,
      phase: context.phase as any,
      position: context.position,
      timestamp: new Date(),
      stackSize: context.yourStack,
      potSize: context.potSize,
    };

    // 更新AI自己的行为记录
    PlayerNotesManager.updateOpponentProfile(
      aiPlayerName,
      aiPlayerName,
      [handAction],
    );

    console.log(
      `📝 记录AI行为: ${aiPlayerName} ${decision.action} ${decision.amount}`,
    );
  }

  // 🔥 GTO备用决策逻辑
  private getGTOBackupDecision(
    context: GameContext,
  ): GTODecision {
    const { phase, yourStack, potSize, position } = context;
    const stackToPotRatio = yourStack / Math.max(potSize, 1);

    console.log(
      `🔄 使用GTO备用决策: 阶段=${phase}, 位置=${position}, SPR=${stackToPotRatio.toFixed(1)}`,
    );

    if (phase === "preflop") {
      // 基于位置的翻前GTO策略
      const latePositions = ["Button (BTN)", "Cut-off (CO)"];
      const middlePositions = ["Middle Position (MP)", "MP+1"];

      if (latePositions.includes(position)) {
        return {
          action: "raise",
          amount: context.blindLevels.big * 2.5,
          reasoning: "GTO备用决策：后位开池加注",
        };
      } else if (middlePositions.includes(position)) {
        return {
          action: "fold",
          amount: 0,
          reasoning: "GTO备用决策：中位保守弃牌",
        };
      } else {
        return {
          action: "fold",
          amount: 0,
          reasoning: "GTO备用决策：前位保守弃牌",
        };
      }
    } else {
      // 翻后GTO策略
      if (stackToPotRatio > 4) {
        return {
          action: "check",
          amount: 0,
          reasoning: "GTO备用决策：深筹码保守过牌",
        };
      } else if (stackToPotRatio > 1) {
        return {
          action: "call",
          amount: 0,
          reasoning: "GTO备用决策：中等筹码跟注",
        };
      } else {
        return {
          action: "call",
          amount: 0,
          reasoning: "GTO备用决策：浅筹码保守跟注",
        };
      }
    }
  }

  // 🔥 手动重置会话
  public resetSession(): void {
    this.hybridSession.resetSession();
    console.log(`🔄 Goliath GTO AI系统会话已重置`);
  }

  // 🔥 获取系统状态
  public getSystemStatus(): {
    version: string;
    architecture: string;
    session: any;
    config: Partial<AISystemConfig>;
  } {
    return {
      version: "V1.5",
      architecture: "Hybrid Session (混合会话)",
      session: this.hybridSession.getSessionStatus(),
      config: {
        model: this.config.model,
        aiPersonality: this.config.aiPersonality,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    };
  }

  // 🔥 兼容性方法 - 保持现有接口
  public validateDecision(decision: any): boolean {
    return (
      decision &&
      typeof decision.action === "string" &&
      [
        "fold",
        "check",
        "call",
        "bet",
        "raise",
        "all-in",
      ].includes(decision.action) &&
      typeof decision.amount === "number" &&
      typeof decision.reasoning === "string" &&
      decision.reasoning.length > 0
    );
  }
}

// 🔥 保持向后兼容 - GTO决策分析器
export class GTOAnalyzer {
  // 分析手牌强度
  static analyzeHandStrength(
    hand: string[],
    communityCards: string[],
  ): {
    strength: number;
    category:
      | "premium"
      | "strong"
      | "medium"
      | "weak"
      | "trash";
    description: string;
  } {
    // 简化的手牌强度分析
    const allCards = [...hand, ...communityCards];

    return {
      strength: 0.7,
      category: "strong",
      description: "强牌 - 顶对好踢脚",
    };
  }

  // 计算底池赔率
  static calculatePotOdds(
    potSize: number,
    betSize: number,
  ): {
    odds: number;
    percentage: number;
    recommendation: string;
  } {
    const totalPot = potSize + betSize;
    const odds = betSize / totalPot;
    const percentage = odds * 100;

    let recommendation = "";
    if (percentage < 25) {
      recommendation = "优秀的底池赔率，建议跟注";
    } else if (percentage < 33) {
      recommendation = "可接受的底池赔率";
    } else {
      recommendation = "底池赔率不佳，需要强牌";
    }

    return { odds, percentage, recommendation };
  }

  // 分析位置优势
  static analyzePositionAdvantage(
    position: string,
    phase: string,
  ): {
    advantage: "strong" | "medium" | "weak";
    description: string;
  } {
    const latePositions = ["Button (BTN)", "Cut-off (CO)"];
    const earlyPositions = [
      "Under The Gun (UTG)",
      "UTG+1",
      "UTG+2",
    ];

    if (latePositions.includes(position)) {
      return {
        advantage: "strong",
        description: "后位优势，信息充分，可以更加激进",
      };
    } else if (earlyPositions.includes(position)) {
      return {
        advantage: "weak",
        description: "前位劣势，需要更强的牌才能游戏",
      };
    } else {
      return {
        advantage: "medium",
        description: "中位，需要根据具体情况调整策略",
      };
    }
  }
}

// 🔥 Legacy支持 - 保持现有代码的兼容性
export function createLegacyGTOAI(
  config: AISystemConfig,
): GTOAISystem {
  console.log(
    `⚠️ 使用Legacy接口创建GTO AI系统，建议升级到V1.5混合会话架构`,
  );
  return new GTOAISystem(config);
}