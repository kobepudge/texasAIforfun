import { useState, useCallback } from 'react';
import { GameState, Player, Card as CardType, AIConfig, Message } from '../types/poker.ts';
import { INITIAL_GAME_STATE, DEFAULT_AI_CONFIG } from '../constants/poker-game.ts';

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [deck, setDeck] = useState<CardType[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [showdown, setShowdown] = useState(false);
  const [winners, setWinners] = useState<any[]>([]);
  const [aiConversationHistories, setAiConversationHistories] = useState<Record<string, Message[]>>({});

  const updateAIConversationHistory = useCallback((playerId: string, message: Message) => {
    setAiConversationHistories(prev => ({
      ...prev,
      [playerId]: [...(prev[playerId] || []), message]
    }));
  }, []);

  const resetAIConversationHistories = useCallback(() => {
    setAiConversationHistories({});
  }, []);

  // 分配底池给获胜者
  const distributePot = useCallback((winners: any[], players: Player[], pot: number) => {
    console.log(`[底池分配] 开始分配底池 ${pot} 给获胜者:`, winners[0].winners.map(w => w.name));
    
    const winnerCount = winners[0].winners.length;
    const sharePerWinner = Math.floor(pot / winnerCount);
    
    console.log(`[底池分配] 每位获胜者分得: ${sharePerWinner}`);
    
    return players.map(player => {
      const isWinner = winners[0].winners.some(w => w.id === player.id);
      if (isWinner) {
        const newChips = player.chips + sharePerWinner;
        console.log(`[底池分配] ${player.name} 筹码: ${player.chips} + ${sharePerWinner} = ${newChips}`);
        return { ...player, chips: newChips };
      }
      return player;
    });
  }, []);

  // 检查是否只剩一个未弃牌的玩家
  const checkForSinglePlayerWin = useCallback((players: Player[]) => {
    const remainingPlayers = players.filter(p => !p.isFolded && p.isActive);
    return remainingPlayers.length === 1 ? remainingPlayers[0] : null;
  }, []);

  // 筹码管理 - 只允许输光的玩家在局结束后增加筹码
  const addChipsToPlayer = useCallback((playerId: string, amount: number) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === playerId && p.chips === 0 
          ? { ...p, chips: amount, isActive: true }
          : p
      )
    }));
  }, []);

  return {
    gameState,
    setGameState,
    deck,
    setDeck,
    gameStarted,
    setGameStarted,
    showdown,
    setShowdown,
    winners,
    setWinners,
    distributePot,
    checkForSinglePlayerWin,
    addChipsToPlayer,
    aiConversationHistories,
    updateAIConversationHistory,
    resetAIConversationHistories
  };
}

export function useAIConfig() {
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => ({
    openaiApiKey: localStorage.getItem('poker_ai_api_key') || DEFAULT_AI_CONFIG.openaiApiKey,
    baseUrl: localStorage.getItem('poker_ai_base_url') || DEFAULT_AI_CONFIG.baseUrl,
    model: localStorage.getItem('poker_ai_model') || DEFAULT_AI_CONFIG.model,
    enabled: localStorage.getItem('poker_ai_enabled') === 'true',
    customModels: JSON.parse(localStorage.getItem('poker_ai_custom_models') || '[]'),
    enablePreflopGTO: localStorage.getItem('poker_ai_enable_preflop_gto') !== 'false' // 默认启用
  }));

  const [aiStats, setAiStats] = useState({
    successCount: 0,
    errorCount: 0,
    lastResponseTime: 0,
    totalRequests: 0
  });

  // 保存AI配置到本地存储
  const handleAIConfigUpdate = useCallback((config: AIConfig) => {
    setAIConfig(config);
    localStorage.setItem('poker_ai_api_key', config.openaiApiKey);
    localStorage.setItem('poker_ai_base_url', config.baseUrl);
    localStorage.setItem('poker_ai_enabled', config.enabled.toString());
    localStorage.setItem('poker_ai_model', config.model);
    localStorage.setItem('poker_ai_custom_models', JSON.stringify(config.customModels));
    localStorage.setItem('poker_ai_enable_preflop_gto', config.enablePreflopGTO.toString()); // 🎯 保存GTO设置
    
    // 重置AI统计当配置改变时
    if (config.enabled !== aiConfig.enabled || config.model !== aiConfig.model) {
      setAiStats({
        successCount: 0,
        errorCount: 0,
        lastResponseTime: 0,
        totalRequests: 0
      });
    }
  }, [aiConfig.enabled, aiConfig.model]);

  return {
    aiConfig,
    aiStats,
    setAiStats,
    handleAIConfigUpdate
  };
}