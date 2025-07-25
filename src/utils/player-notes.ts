import { PlayerNote, OpponentProfile, HandAction, GameContext } from '../types/gto-poker';

// PlayerNotes管理系统
export class PlayerNotesManager {
  private static readonly STORAGE_KEY = 'gto_player_notes';
  private static readonly PROFILES_KEY = 'gto_opponent_profiles';

  // 保存玩家笔记
  static savePlayerNote(note: PlayerNote): void {
    const existingNotes = this.getAllNotes();
    existingNotes.push(note);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingNotes));
    console.log(`💾 保存玩家笔记: ${note.noteText} (可信度: ${note.confidence})`);
  }

  // 获取所有笔记
  static getAllNotes(): PlayerNote[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // 获取特定玩家的笔记
  static getPlayerNotes(playerId: string): PlayerNote[] {
    return this.getAllNotes().filter(note => note.playerId === playerId);
  }

  // 获取高可信度笔记（用于AI决策）
  static getHighConfidenceNotes(playerId: string, minConfidence: number = 0.7): PlayerNote[] {
    return this.getPlayerNotes(playerId).filter(note => note.confidence >= minConfidence);
  }

  // 更新对手档案
  static updateOpponentProfile(playerId: string, playerName: string, actions: HandAction[]): void {
    const profiles = this.getOpponentProfiles();
    let profile = profiles.find(p => p.playerId === playerId);
    
    if (!profile) {
      profile = {
        playerId,
        playerName,
        notes: [],
        recentBehavior: {
          aggression: 0.5,
          tightness: 0.5,
          bluffFrequency: 0.2,
          valueThreshold: 0.6
        },
        handsPlayed: 0,
        lastUpdated: new Date()
      };
      profiles.push(profile);
    }

    // 分析行为模式
    profile.recentBehavior = this.analyzeBehaviorPattern(actions);
    profile.handsPlayed += 1;
    profile.lastUpdated = new Date();
    profile.notes = this.getPlayerNotes(playerId);

    localStorage.setItem(this.PROFILES_KEY, JSON.stringify(profiles));
  }

  // 获取对手档案
  static getOpponentProfiles(): OpponentProfile[] {
    const stored = localStorage.getItem(this.PROFILES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // 获取特定对手档案
  static getOpponentProfile(playerId: string): OpponentProfile | null {
    return this.getOpponentProfiles().find(p => p.playerId === playerId) || null;
  }

  // 分析行为模式
  private static analyzeBehaviorPattern(actions: HandAction[]): {
    aggression: number;
    tightness: number;
    bluffFrequency: number;
    valueThreshold: number;
  } {
    if (actions.length === 0) {
      return {
        aggression: 0.5,
        tightness: 0.5,
        bluffFrequency: 0.2,
        valueThreshold: 0.6
      };
    }

    const aggressiveActions = actions.filter(a => a.action === 'bet' || a.action === 'raise').length;
    const passiveActions = actions.filter(a => a.action === 'call' || a.action === 'check').length;
    const folds = actions.filter(a => a.action === 'fold').length;

    const aggression = aggressiveActions / (aggressiveActions + passiveActions + 0.1);
    const tightness = folds / actions.length;
    
    // 简化的虚张声势频率估算
    const postflopAggressive = actions.filter(a => 
      a.phase !== 'preflop' && (a.action === 'bet' || a.action === 'raise')
    ).length;
    const bluffFrequency = Math.min(0.4, postflopAggressive / Math.max(actions.length, 1) * 2);

    return {
      aggression: Math.max(0, Math.min(1, aggression)),
      tightness: Math.max(0, Math.min(1, tightness)),
      bluffFrequency: Math.max(0, Math.min(1, bluffFrequency)),
      valueThreshold: 0.6 // 默认值下注阈值
    };
  }

  // 生成对手行为笔记
  static generateBehaviorNote(
    playerId: string,
    playerName: string,
    action: HandAction,
    context: GameContext,
    handResult?: { won: boolean; showdown: boolean }
  ): PlayerNote | null {
    
    let noteText = '';
    let confidence = 0.5;
    let category: PlayerNote['category'] = 'postflop';

    // 分析特定行为模式
    if (action.phase === 'preflop') {
      category = 'preflop';
      if (action.action === 'raise' && action.amount > context.blindLevels.big * 3) {
        noteText = `玩家 '${playerName}' 在${context.position}位置进行大额翻前加注 (${action.amount}，${(action.amount / context.blindLevels.big).toFixed(1)}BB)`;
        confidence = 0.8;
      }
    } else if (action.action === 'fold' && action.potSize > context.blindLevels.big * 5) {
      category = 'folding';
      noteText = `玩家 '${playerName}' 在${action.phase}圈面对较大底池 (${action.potSize}) 选择弃牌`;
      confidence = 0.7;
    } else if (action.action === 'bet' && action.amount > action.potSize) {
      category = 'sizing';
      noteText = `玩家 '${playerName}' 在${action.phase}圈进行超底池下注 (下注${action.amount}，底池${action.potSize})`;
      confidence = 0.9;
    }

    if (noteText) {
      return {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId,
        observerId: 'goliath_ai',
        noteText,
        confidence,
        category,
        createdAt: new Date(),
        gameContext: {
          phase: action.phase,
          position: action.position,
          stackSize: action.stackSize,
          potSize: action.potSize
        }
      };
    }

    return null;
  }

  // 清理过期笔记
  static cleanupOldNotes(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const allNotes = this.getAllNotes();
    const recentNotes = allNotes.filter(note => new Date(note.createdAt) > cutoffDate);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentNotes));
    console.log(`🧹 清理了 ${allNotes.length - recentNotes.length} 条过期笔记`);
  }

  // 导出分析报告
  static generateAnalysisReport(playerId: string): string {
    const profile = this.getOpponentProfile(playerId);
    if (!profile) return `玩家 ${playerId} 无足够数据进行分析`;

    const { recentBehavior, notes, handsPlayed } = profile;
    
    let report = `\n=== 对手分析报告: ${profile.playerName} ===\n`;
    report += `牌局数量: ${handsPlayed}\n`;
    report += `激进程度: ${(recentBehavior.aggression * 100).toFixed(1)}%\n`;
    report += `紧密程度: ${(recentBehavior.tightness * 100).toFixed(1)}%\n`;
    report += `虚张声势频率: ${(recentBehavior.bluffFrequency * 100).toFixed(1)}%\n\n`;
    
    report += `=== 重要行为笔记 ===\n`;
    const highConfidenceNotes = notes.filter(n => n.confidence >= 0.8).slice(0, 5);
    highConfidenceNotes.forEach((note, index) => {
      report += `${index + 1}. ${note.noteText} (可信度: ${(note.confidence * 100).toFixed(0)}%)\n`;
    });

    return report;
  }
}

// 手牌历史管理
export class HandHistoryManager {
  private static readonly STORAGE_KEY = 'gto_hand_history';

  static saveHandHistory(handHistory: any): void {
    const existingHistory = this.getAllHandHistory();
    existingHistory.push(handHistory);
    
    // 只保留最近100手
    if (existingHistory.length > 100) {
      existingHistory.splice(0, existingHistory.length - 100);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingHistory));
  }

  static getAllHandHistory(): any[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static getRecentHands(count: number = 10): any[] {
    return this.getAllHandHistory().slice(-count);
  }
}