// GTO翻前决策服务

export interface GTODecision {
  action: 'fold' | 'call' | 'raise' | 'all_in' | 'limp';
  amount: number;
  frequency: number;
  hand_tier: string;
  stack_tier: 'short' | 'medium' | 'deep';
  stack_bb: number;
  scenario: string;
  reasoning: string;
}

export interface GTOQuery {
  hand: string;
  position: string;
  facing_action?: string;
  players_behind?: number;
  stack_bb?: number;
}

export interface GTOResponse {
  success: boolean;
  decision: GTODecision;
  query: GTOQuery;
  error?: string;
}

class GTOService {
  private baseUrl: string;
  private cache: Map<string, GTODecision>;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  // 生成缓存键
  private generateCacheKey(query: GTOQuery): string {
    const {
      hand,
      position,
      facing_action = 'none',
      players_behind = 0,
      stack_bb = 100
    } = query;
    
    return `${hand}_${position}_${facing_action}_${players_behind}_${stack_bb}`;
  }

  // 获取翻前GTO决策 (带重试机制)
  async getPreflopDecision(query: GTOQuery): Promise<GTODecision> {
    const cacheKey = this.generateCacheKey(query);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log(`⚡ GTO缓存命中: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    // 重试机制
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 GTO查询 (尝试 ${attempt}/${maxRetries}): ${JSON.stringify(query)}`);

        const params = new URLSearchParams({
          hand: query.hand,
          position: query.position,
          facing_action: query.facing_action || 'none',
          players_behind: (query.players_behind || 0).toString(),
          stack_bb: (query.stack_bb || 100).toString()
        });

        const response = await fetch(`${this.baseUrl}/api/preflop-decision?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // 增加到10秒超时
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`GTO API错误: ${response.status} ${response.statusText}`);
        }

        const data: GTOResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'GTO决策失败');
        }

        // 缓存结果
        this.cache.set(cacheKey, data.decision);

        console.log(`✅ GTO决策: ${data.decision.action} ${data.decision.amount || ''} (${data.decision.reasoning})`);

        return data.decision;

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ GTO服务尝试 ${attempt} 失败:`, error);

        // 如果不是最后一次尝试，等待一下再重试
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.error('❌ GTO服务所有重试都失败:', lastError);

    // 返回保守的默认决策
    const fallbackDecision: GTODecision = {
      action: 'fold',
      amount: 0,
      frequency: 1.0,
      hand_tier: 'UNKNOWN',
      stack_tier: 'medium',
      stack_bb: query.stack_bb || 100,
      scenario: 'fallback',
      reasoning: 'GTO服务不可用，保守弃牌'
    };

    return fallbackDecision;
  }

  // 检查是否为翻前阶段
  isPreflop(phase: string): boolean {
    return phase === 'preflop';
  }

  // 转换手牌格式
  formatHoleCards(holeCards: Array<{rank: string, suit: string}>): string {
    if (!holeCards || holeCards.length !== 2) {
      return 'XX';
    }

    const [card1, card2] = holeCards;
    const rank1 = card1.rank === '10' ? 'T' : card1.rank;
    const rank2 = card2.rank === '10' ? 'T' : card2.rank;
    
    // 确定是否同花
    const suited = card1.suit === card2.suit;
    
    // 按强度排序 (A > K > Q > J > T > 9 > ... > 2)
    const rankOrder = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const rank1Index = rankOrder.indexOf(rank1);
    const rank2Index = rankOrder.indexOf(rank2);
    
    let hand: string;
    
    if (rank1 === rank2) {
      // 对子
      hand = `${rank1}${rank2}`;
    } else if (rank1Index < rank2Index) {
      // rank1更强
      hand = `${rank1}${rank2}${suited ? 's' : 'o'}`;
    } else {
      // rank2更强
      hand = `${rank2}${rank1}${suited ? 's' : 'o'}`;
    }
    
    return hand;
  }

  // 转换位置格式
  formatPosition(playerIndex: number, totalPlayers: number, dealerIndex: number): string {
    // 计算相对于庄家的位置
    const relativePosition = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;

    // 9人桌标准位置顺序：庄家开始顺时针
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'MP+1', 'CO'];

    // 根据玩家数量调整位置映射
    if (totalPlayers <= 6) {
      const shortPositions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
      return shortPositions[relativePosition] || 'UTG';
    }

    console.log(`🔍 GTO位置格式化: playerIndex=${playerIndex}, dealerIndex=${dealerIndex}, relativePosition=${relativePosition}, 位置=${positions[relativePosition]}`);

    return positions[relativePosition] || 'UTG';
  }

  // 计算筹码深度 (以大盲为单位)
  calculateStackDepth(chips: number, bigBlind: number): number {
    return Math.round(chips / bigBlind);
  }

  // 分析面对的行动
  analyzeFacingAction(gameState: any, currentPlayerId?: string): string {
    console.log('🔍 分析行动历史:', {
      actionHistory: gameState.actionHistory,
      phase: gameState.phase,
      currentBet: gameState.currentBet,
      bigBlind: gameState.bigBlindAmount,
      currentPlayerId
    });

    // 翻前特殊处理
    if (gameState.phase === 'preflop') {
      return this.analyzePreflopAction(gameState, currentPlayerId);
    }

    // 翻后处理
    if (!gameState.actionHistory || gameState.actionHistory.length === 0) {
      return 'none';
    }

    // 查找当前轮次的行动
    const currentRoundActions = gameState.actionHistory.filter(
      (action: any) => action.phase === gameState.phase
    );

    if (currentRoundActions.length === 0) {
      return 'none';
    }

    // 分析最后的有效行动（排除弃牌）
    const validActions = currentRoundActions.filter(
      (action: any) => action.action !== 'fold'
    );

    if (validActions.length === 0) {
      return 'none';
    }

    const lastAction = validActions[validActions.length - 1];

    if (lastAction.action === 'raise') {
      const raiseSize = lastAction.amount / (gameState.bigBlindAmount || 100);
      if (raiseSize <= 2.5) return 'raise_2bb';
      if (raiseSize <= 3.5) return 'raise_3bb';
      if (raiseSize <= 4.5) return 'raise_4bb';
      return '3bet';
    }

    if (lastAction.action === 'call') {
      return 'limp';
    }

    return 'none';
  }

  // 翻前行动分析
  private analyzePreflopAction(gameState: any, currentPlayerId?: string): string {
    const bigBlind = gameState.bigBlindAmount || 100;
    const currentBet = gameState.currentBet || 0;

    console.log('🔍 翻前行动分析:', {
      currentBet,
      bigBlind,
      ratio: currentBet / bigBlind,
      actionHistory: gameState.actionHistory,
      currentPlayerId
    });

    // 获取翻前行动序列
    const preflopActions = gameState.actionHistory?.filter(
      (action: any) => action.phase === 'preflop'
    ) || [];

    // 过滤出有效行动（排除弃牌）
    const validActions = preflopActions.filter(
      (action: any) => action.action !== 'fold'
    );

    console.log('🔍 有效翻前行动:', validActions);

    // 如果当前下注为0或等于大盲，且没有有效行动，说明无人行动
    if (currentBet <= bigBlind && validActions.length === 0) {
      return 'none';
    }

    // 如果当前下注等于大盲，检查是否有跛入
    if (currentBet === bigBlind) {
      const callActions = validActions.filter(action => action.action === 'call');
      if (callActions.length > 0) {
        // 🎯 关键修复：检查当前玩家是否为BB
        const currentPlayer = gameState.players?.find((p: any) => p.id === currentPlayerId);
        if (currentPlayer) {
          const position = this.formatPosition(
            currentPlayer.position,
            gameState.players.length,
            gameState.dealerIndex
          );

          // 如果当前玩家是BB，且只有跛入没有加注，则facing_action为none
          if (position === 'BB') {
            console.log('🎯 BB位置面对跛入，可以免费看翻牌，facing_action=none');
            return 'none';
          }
        }

        return 'limp';
      }
      return 'none'; // 只有盲注，无人行动
    }

    // 分析加注序列
    const raiseActions = validActions.filter(action => action.action === 'raise');

    if (raiseActions.length === 0) {
      return 'none';
    }

    // 分析加注大小
    const raiseRatio = currentBet / bigBlind;

    // 判断是否为3bet或更高
    if (raiseActions.length >= 2) {
      if (raiseActions.length >= 3) {
        return '4bet';
      }
      return '3bet';
    }

    // 首次加注，根据大小分类
    if (raiseRatio <= 2.5) {
      return 'raise_2bb';
    } else if (raiseRatio <= 3.5) {
      return 'raise_3bb';
    } else if (raiseRatio <= 4.5) {
      return 'raise_4bb';
    } else {
      return 'raise_4bb'; // 大于4BB的首次加注
    }
  }

  // 计算后面还没行动的玩家数量
  calculatePlayersBehind(gameState: any, currentPlayerId: string): number {
    if (!gameState.players || !gameState.actionHistory) {
      return 0;
    }

    // 找到当前玩家的位置
    const currentPlayerIndex = gameState.players.findIndex((p: any) => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) {
      return 0;
    }

    // 获取翻前已经行动的玩家ID
    const preflopActions = gameState.actionHistory.filter(
      (action: any) => action.phase === 'preflop'
    );
    const actedPlayerIds = new Set(preflopActions.map((action: any) => action.playerId));

    // 计算当前玩家后面还没行动的活跃玩家数量
    let playersBehind = 0;
    const totalPlayers = gameState.players.length;

    for (let i = 1; i < totalPlayers; i++) {
      const nextPlayerIndex = (currentPlayerIndex + i) % totalPlayers;
      const nextPlayer = gameState.players[nextPlayerIndex];

      // 如果玩家还活跃且还没行动，计入
      if (nextPlayer.isActive && !actedPlayerIds.has(nextPlayer.id)) {
        playersBehind++;
      }
    }

    console.log(`🔍 计算后面玩家: 当前玩家${currentPlayerId}, 后面还有${playersBehind}个玩家未行动`);

    return playersBehind;
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // 清空缓存
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ GTO缓存已清空');
  }

  // 获取缓存统计
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 创建全局实例
export const gtoService = new GTOService();

// 导出类型和服务
export default GTOService;
