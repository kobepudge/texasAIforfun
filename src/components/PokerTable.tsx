import { useCallback, useEffect, useRef, useState } from 'react';
import { useAIConfig, useGameState } from '../hooks/useGameState.ts';
import { GamePhase, Message, Player } from '../types/poker.ts';
import { findNextDealer, setupNewGame } from '../utils/game-logic.ts';
import { addActionToHistory, analyzeHandAndGenerateNotes, analyzePlayerPersonality, determineWinners, evaluateHand, recordPlayerBehavior, shouldTransitionPhase } from '../utils/poker.ts';
import { AIConfig as AIConfigComponent } from './AIConfig.tsx';
import { Card } from './Card.tsx';
import { GameControls } from './GameControls.tsx';

import { Player as PlayerComponent } from './Player.tsx';
import { ChipManagerDialog, PlayerNotesDialog } from './poker/GameDialogs.tsx';
import { GameResultDisplay } from './poker/GameResultDisplay.tsx';
import { GameStatusDisplay } from './poker/GameStatusDisplay.tsx';
import { Button } from './ui/button.tsx';

export function PokerTable() {
  const {
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

  } = useGameState();

  // 🚀 AI缓存系统已内置到poker.ts中，无需额外初始化

  const {
    aiConfig,
    aiStats,
    setAiStats,
    handleAIConfigUpdate
  } = useAIConfig();

  const [showChipManager, setShowChipManager] = useState(false);
  const [showPlayerNotes, setShowPlayerNotes] = useState(false);

  // 🚀 AI系统引用 - 动态导入
  const fastDecisionEngineRef = useRef<any | null>(null);
  const aiManagerRef = useRef<any | null>(null);

  // 🚀 检查行动轮次是否完成
  const isRoundComplete = useCallback((players: any[], currentBet: number, lastRaiserIndex: number, bettingStartIndex: number) => {
    const activePlayers = players.filter(p => !p.isFolded && p.isActive);

    // 如果只有一个活跃玩家，轮次完成
    if (activePlayers.length <= 1) {
      console.log('🏁 只有一个活跃玩家，轮次完成');
      return true;
    }

    // 检查所有活跃玩家是否都已行动且下注一致
    for (const player of activePlayers) {
      // 全押玩家不需要再行动
      if (player.isAllIn) continue;

      // 玩家还没行动
      if (!player.hasActed) {
        console.log(`⏳ ${player.name} 还未行动，轮次未完成`);
        return false;
      }

      // 玩家下注不足（需要跟注或弃牌）
      if (player.currentBet < currentBet) {
        console.log(`💰 ${player.name} 下注不足 (${player.currentBet} < ${currentBet})，轮次未完成`);
        return false;
      }
    }

    console.log('✅ 所有玩家都已行动且下注一致，轮次完成');
    return true;
  }, []);

  // 🚀 获取下一个游戏阶段
  const getNextPhase = (currentPhase: string) => {
    switch (currentPhase) {
      case 'preflop': return 'flop';
      case 'flop': return 'turn';
      case 'turn': return 'river';
      case 'river': return 'showdown';
      default: return 'showdown';
    }
  };

  // 🚀 移除老的实时AI系统 - 只使用新架构

  // 🚀 初始化AI决策系统 - 简化版
  useEffect(() => {
    const initializeAISystem = async () => {
      try {
        // 动态导入AI系统
        const { FastDecisionEngine } = await import('../ai/fast-decision-engine.ts');
        const { AIInstanceManager } = await import('../ai/ai-instance-manager.ts');

        console.log('🚀 初始化AI决策系统...');

        // 使用默认配置或用户配置
        const apiConfig = {
          apiKey: aiConfig.openaiApiKey || 'demo-key',
          baseUrl: aiConfig.baseUrl || 'https://api.openai.com/v1',
          model: aiConfig.model || 'gpt-4'
        };

        console.log('🔧 AI配置检查:', {
          hasApiKey: !!aiConfig.openaiApiKey,
          hasBaseUrl: !!aiConfig.baseUrl,
          hasModel: !!aiConfig.model,
          apiConfig
        });

        // 创建AI管理器
        aiManagerRef.current = new AIInstanceManager({
          maxAIPlayers: 8,
          defaultTimeout: 0, // 移除超时限制
          apiConfig,
          enablePerformanceMonitoring: true
        });

        // 创建快速决策引擎
        fastDecisionEngineRef.current = new FastDecisionEngine(apiConfig);

        console.log('✅ AI系统初始化完成 - 游戏可立即开始');
        console.log('⚡ 配置:', apiConfig);
      } catch (error) {
        console.error('❌ AI系统初始化失败:', error);
      }
    };

    initializeAISystem();
  }, [aiConfig.openaiApiKey, aiConfig.baseUrl, aiConfig.model]);

  // 开始新游戏
  const startNewGame = async () => {
    console.log(`
🎮 ===== 开始新游戏 =====
🎯 庄家位置: ${gameState.dealerIndex}
👥 玩家数量: ${gameState.players.length}
💰 小盲: ${gameState.smallBlindAmount}
💰 大盲: ${gameState.bigBlindAmount}
⏰ 开始时间: ${new Date().toLocaleTimeString()}
============================`);
    await startNewGameWithDealer(gameState.dealerIndex);
  };

  // 开始新游戏（指定庄家位置）
  const startNewGameWithDealer = async (dealerIndex: number) => {
    const { newPlayers, newDeck, nextPlayerIndex, pot } = setupNewGame(gameState, dealerIndex);

    // 🚀 AI系统：直接开始游戏
    console.log('🎮 AI系统：游戏启动');

    // 🔥 关键修复：记录盲注到行动历史
    const blindActions: ActionHistoryItem[] = [];
    const smallBlindPlayer = newPlayers.find(p => p.isSmallBlind);
    const bigBlindPlayer = newPlayers.find(p => p.isBigBlind);

    if (smallBlindPlayer) {
      blindActions.push({
        playerName: smallBlindPlayer.name,
        action: 'small_blind',
        amount: gameState.smallBlindAmount,
        phase: 'preflop',
        timestamp: Date.now()
      });
    }

    if (bigBlindPlayer) {
      blindActions.push({
        playerName: bigBlindPlayer.name,
        action: 'big_blind',
        amount: gameState.bigBlindAmount,
        phase: 'preflop',
        timestamp: Date.now()
      });
    }

    console.log('🔍 初始化盲注行动历史:', blindActions);

    setGameState(prev => ({
      ...prev,
      dealerIndex: dealerIndex,
      players: newPlayers,
      communityCards: [],
      pot: pot,
      sidePots: [],
      currentBet: prev.bigBlindAmount,
      phase: 'preflop',
      activePlayerIndex: nextPlayerIndex,
      lastRaiserIndex: newPlayers.findIndex(p => p.isBigBlind),
      bettingRoundStartIndex: nextPlayerIndex,
      actionHistory: blindActions // 🔥 关键修复：从盲注开始记录行动历史
    }));

    setDeck(newDeck);
    setGameStarted(true);
    setShowdown(false);
    setWinners([]);
  };

  // 处理单人获胜
  const handleSinglePlayerWin = useCallback((winner: Player) => {
    console.log(`${winner.name} 单人获胜，获得底池 ${gameState.pot}`);
    
    const newPlayers = gameState.players.map(p => 
      p.id === winner.id ? { ...p, chips: p.chips + gameState.pot } : p
    );
    
    const winnerInfo = [{
      winners: [winner],
      handRanking: { rank: 10, name: '其他玩家弃牌', cards: [], kickers: [] }
    }];
    
    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      pot: 0
    }));
    
    setWinners(winnerInfo);
    setShowdown(true);
  }, [gameState.pot, gameState.players, setGameState, setWinners, setShowdown]);

  // 处理玩家操作
  const handlePlayerAction = useCallback(async (action: string, amount?: number) => {
    const currentPlayer = gameState.players[gameState.activePlayerIndex];
    if (!currentPlayer || currentPlayer.isFolded || !currentPlayer.isActive) return;



    // 🎯 行动轮次日志
    console.log(`
🎮 ===== 玩家行动开始 =====
👤 玩家: ${currentPlayer.name} (${currentPlayer.isAI ? 'AI' : '人类'})
🎯 行动: ${action}${amount ? ` (金额: ${amount})` : ''}
💰 当前筹码: ${currentPlayer.chips}
💵 当前下注: ${currentPlayer.currentBet}
🃏 阶段: ${gameState.phase}
🏆 底池: ${gameState.pot}
📊 当前最高下注: ${gameState.currentBet}
⏰ 时间: ${new Date().toLocaleTimeString()}
============================`);

    // 记录玩家手牌（仅用于调试）
    if (currentPlayer.holeCards && currentPlayer.holeCards.length > 0) {
      console.log(`🃏 ${currentPlayer.name} 手牌:`, currentPlayer.holeCards.map(card => `${card.rank}${card.suit}`).join(', '));
    }

    const newPlayers = [...gameState.players];
    const player = newPlayers[gameState.activePlayerIndex];
    let newPot = gameState.pot;
    let newCurrentBet = gameState.currentBet;
    let newLastRaiserIndex = gameState.lastRaiserIndex;

    // 🚀 关键修复：标记玩家已行动
    player.hasActed = true;

    // 处理不同的玩家行为
    switch (action) {
      case 'fold':
        player.isFolded = true;
        break;

      case 'check':
        // 🚀 详细的check验证日志
        console.log(`🔍 Check验证: 游戏最高下注=${gameState.currentBet}, 玩家当前下注=${player.currentBet}`);
        if (gameState.currentBet !== player.currentBet) {
          console.log(`❌ Check无效: 玩家需要call ${gameState.currentBet - player.currentBet} 才能继续`);
          return;
        }
        console.log(`✅ Check有效: 玩家下注与最高下注相等`);
        break;

      case 'call':
        const callAmount = gameState.currentBet - player.currentBet;
        const actualCall = Math.min(callAmount, player.chips);
        player.currentBet += actualCall;
        player.totalBet += actualCall;
        player.chips -= actualCall;
        newPot += actualCall;
        if (player.chips === 0) player.isAllIn = true;
        break;
      
      case 'raise':
        if (amount && amount > 0) {
          const totalBet = amount;
          const additionalBet = totalBet - player.currentBet;
          const actualBet = Math.min(additionalBet, player.chips);
          player.currentBet += actualBet;
          player.totalBet += actualBet;
          player.chips -= actualBet;
          newPot += actualBet;
          newCurrentBet = player.currentBet;
          newLastRaiserIndex = gameState.activePlayerIndex;
          if (player.chips === 0) player.isAllIn = true;
          
          // 重置其他玩家的行动状态
          newPlayers.forEach((p, index) => {
            if (index !== gameState.activePlayerIndex && !p.isFolded && !p.isAllIn) {
              p.hasActed = false;
            }
          });
        }
        break;
      
      case 'all-in':
        const allInAmount = player.chips;
        player.currentBet += allInAmount;
        player.totalBet += allInAmount;
        player.chips = 0;
        player.isAllIn = true;
        newPot += allInAmount;
        if (player.currentBet > newCurrentBet) {
          newCurrentBet = player.currentBet;
          newLastRaiserIndex = gameState.activePlayerIndex;
          
          newPlayers.forEach((p, index) => {
            if (index !== gameState.activePlayerIndex && !p.isFolded && !p.isAllIn) {
              p.hasActed = false;
            }
          });
        }
        break;
    }

    const actionMessageContent = `${currentPlayer.name} ${action}${amount ? ` ${amount}` : ''}.`;
    const userMessage: Message = {
      role: 'user',
      content: actionMessageContent
    };

    // 🚀 AI系统：简化的会话管理

    // 记录玩家行为
    const handStrength = evaluateHand(player.holeCards, gameState.communityCards).rank;
    const behavior = recordPlayerBehavior(player, action, amount, newPot, gameState.phase, handStrength, gameState);
    player.behaviorHistory.push(behavior);

    if (player.behaviorHistory.length > 20) {
      player.behaviorHistory = player.behaviorHistory.slice(-20);
    }

    if (player.behaviorHistory.length >= 3) {
      player.personalityAnalysis = analyzePlayerPersonality(player);
    }

    // 🚀 AI系统：直接处理游戏状态

    const newActionHistory = addActionToHistory(gameState, player.name, action, amount);

    // 🔍 关键调试：检查行动历史更新
    console.log(`🔍 行动历史更新:`, {
      原始长度: gameState.actionHistory?.length || 0,
      新长度: newActionHistory.length,
      原始历史: gameState.actionHistory,
      新增行动: newActionHistory[newActionHistory.length - 1],
      完整新历史: newActionHistory
    });

    // 检查单人获胜
    const singleWinner = checkForSinglePlayerWin(newPlayers);
    if (singleWinner) {
      const finalPlayers = newPlayers.map(p => 
        p.id === singleWinner.id ? { ...p, chips: p.chips + newPot } : p
      );
      
      const winnerInfo = [{
        winners: [singleWinner],
        handRanking: { rank: 10, name: '其他玩家弃牌', cards: [], kickers: [] }
      }];
      
      setGameState(prev => ({
        ...prev,
        players: finalPlayers,
        pot: 0,
        actionHistory: newActionHistory
      }));
      
      setWinners(winnerInfo);
      setShowdown(true);
      return;
    }

    // 移动到下一个玩家
    let nextPlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
    let attempts = 0;
    const maxAttempts = gameState.players.length;

    // 🚀 修复：检查玩家是否可以行动（未弃牌、活跃、未全押）
    while (
      (newPlayers[nextPlayerIndex].isFolded ||
       !newPlayers[nextPlayerIndex].isActive ||
       newPlayers[nextPlayerIndex].isAllIn) &&
      attempts < maxAttempts
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      attempts++;
    }

    // 🚀 如果所有玩家都无法行动，检查是否应该转换阶段
    if (attempts >= maxAttempts) {
      console.log('⚠️ 所有玩家都无法行动，检查是否应该转换阶段');
      // 保持当前玩家索引，让阶段转换逻辑处理
      nextPlayerIndex = gameState.activePlayerIndex;
    }

    // 🎯 行动结果日志
    console.log(`
✅ ===== 玩家行动完成 =====
👤 玩家: ${currentPlayer.name}
🎯 执行行动: ${action}${amount ? ` (${amount})` : ''}
💰 剩余筹码: ${player.chips}
💵 总下注: ${player.totalBet}
🏆 新底池: ${newPot}
📊 新最高下注: ${newCurrentBet}
➡️ 下一位玩家: ${newPlayers[nextPlayerIndex]?.name || '无'}
${player.isFolded ? '❌ 已弃牌' : ''}
${player.isAllIn ? '🔥 全押' : ''}
============================`);

    setGameState(prev => {
      const newState = {
        ...prev,
        players: newPlayers,
        pot: newPot,
        currentBet: newCurrentBet,
        activePlayerIndex: nextPlayerIndex,
        lastRaiserIndex: newLastRaiserIndex,
        actionHistory: newActionHistory
      };

      // 🔍 验证状态更新
      console.log(`✅ 游戏状态已更新:`, {
        行动历史长度: newState.actionHistory.length,
        最新行动: newState.actionHistory[newState.actionHistory.length - 1],
        阶段: newState.phase,
        下一位玩家: newState.players[newState.activePlayerIndex]?.name
      });

      return newState;
    });
  }, [gameState, checkForSinglePlayerWin, setGameState, setWinners, setShowdown]);

  // 转换游戏阶段
  const transitionToNextPhase = useCallback(() => {
    // 🎲 阶段转换开始日志
    console.log(`
🎲 ===== 游戏阶段转换开始 =====
📊 当前阶段: ${gameState.phase}
👥 活跃玩家: ${gameState.players.filter(p => !p.isFolded && p.isActive).length}
🏆 当前底池: ${gameState.pot}
🃏 公共牌: ${gameState.communityCards.map(card => `${card.rank}${card.suit}`).join(', ') || '无'}
⏰ 转换时间: ${new Date().toLocaleTimeString()}
============================`);

    setGameState(prev => {
      const activePlayers = prev.players.filter(p => !p.isFolded && p.isActive);
      const playersCanAct = activePlayers.filter(p => !p.isAllIn);
      
      const newPlayers = prev.players.map(p => ({ ...p, currentBet: 0, hasActed: false }));
      let newPhase: GamePhase = prev.phase;
      let newCommunityCards = [...prev.communityCards];
      let deckSliceStart = 0;
      let newPot = prev.pot;

      const shouldFastForward = playersCanAct.length <= 1;
      
      if (shouldFastForward) {
        switch (prev.phase) {
          case 'preflop':
            newCommunityCards = [
              ...deck.slice(1, 4),
              deck[5],
              deck[7]
            ];
            deckSliceStart = 8;
            break;
          case 'flop':
            newCommunityCards.push(deck[1]);
            newCommunityCards.push(deck[3]);
            deckSliceStart = 4;
            break;
          case 'turn':
            newCommunityCards.push(deck[1]);
            deckSliceStart = 2;
            break;
        }
        
        newPhase = 'showdown';
        const results = determineWinners(newPlayers, newCommunityCards);
        const updatedPlayers = distributePot(results, newPlayers, prev.pot);
        newPot = 0;
        
        setWinners(results);
        setShowdown(true);
        setDeck(prevDeck => prevDeck.slice(deckSliceStart));
        
        analyzeHandAndGenerateNotes(prev, newCommunityCards, results);
        
        return { 
          ...prev, 
          phase: newPhase, 
          communityCards: newCommunityCards, 
          players: updatedPlayers,
          pot: newPot,
          currentBet: 0,
          activePlayerIndex: -1,
          lastRaiserIndex: -1
        };
      }

      // 正常阶段转换
      switch (prev.phase) {
        case 'preflop':
          newPhase = 'flop';
          newCommunityCards = deck.slice(1, 4);
          deckSliceStart = 4;
          break;
        case 'flop':
          newPhase = 'turn';
          newCommunityCards.push(deck[1]);
          deckSliceStart = 2;
          break;
        case 'turn':
          newPhase = 'river';
          newCommunityCards.push(deck[1]);
          deckSliceStart = 2;
          break;
        case 'river':
          newPhase = 'showdown';
          const results = determineWinners(newPlayers, newCommunityCards);
          const updatedPlayers = distributePot(results, newPlayers, prev.pot);
          newPot = 0;
          
          setWinners(results);
          setShowdown(true);
          setDeck(prevDeck => prevDeck.slice(deckSliceStart));
          
          analyzeHandAndGenerateNotes(prev, newCommunityCards, results);
          
          return { 
            ...prev, 
            phase: newPhase, 
            communityCards: newCommunityCards, 
            players: updatedPlayers,
            pot: newPot,
            currentBet: 0,
            activePlayerIndex: -1,
            lastRaiserIndex: -1
          };
      }

      // 🚀 修复翻后行动顺序：SB先行动，不是UTG
      let bettingStartIndex;
      if (newPhase === 'preflop') {
        // 翻前：UTG先行动 (大盲后第一个)
        bettingStartIndex = (prev.dealerIndex + 3) % prev.players.length; // 跳过庄家、小盲、大盲
      } else {
        // 翻后：小盲先行动 (庄家后第一个)
        bettingStartIndex = (prev.dealerIndex + 1) % prev.players.length;
      }

      // 找到第一个可以行动的玩家
      let attempts = 0;
      const originalStartIndex = bettingStartIndex;
      while (newPlayers[bettingStartIndex].isFolded || !newPlayers[bettingStartIndex].isActive || newPlayers[bettingStartIndex].isAllIn) {
        bettingStartIndex = (bettingStartIndex + 1) % prev.players.length;
        attempts++;
        if (attempts >= prev.players.length) {
          // 所有玩家都无法行动，直接摊牌
          console.log('⚠️ 所有玩家都无法行动，直接摊牌');
          // 设置为-1表示没有活跃玩家
          bettingStartIndex = -1;
          break;
        }
      }

      if (bettingStartIndex === -1) {
        console.log('🏁 没有可行动的玩家，跳过此阶段');
        // 直接转换到下一阶段或摊牌
        return {
          ...prev,
          phase: newPhase === 'river' ? 'showdown' : getNextPhase(newPhase),
          communityCards: newCommunityCards,
          players: newPlayers,
          pot: newPot,
          currentBet: 0,
          activePlayerIndex: -1,
          lastRaiserIndex: -1
        };
      }

      console.log(`🔄 ${newPhase}阶段开始，首个行动玩家: ${newPlayers[bettingStartIndex]?.name} (位置${bettingStartIndex})`);

      // 🚀 重置所有玩家的行动状态和当前下注
      newPlayers.forEach(player => {
        if (!player.isFolded && player.isActive) {
          player.hasActed = false;
          player.currentBet = 0; // 新轮次重置下注
        }
      });

      console.log(`✅ 已重置所有活跃玩家的行动状态`);

      setDeck(prevDeck => prevDeck.slice(deckSliceStart));

      return {
        ...prev,
        phase: newPhase,
        communityCards: newCommunityCards,
        players: newPlayers,
        pot: newPot,
        currentBet: 0,
        activePlayerIndex: bettingStartIndex,
        bettingRoundStartIndex: bettingStartIndex,
        lastRaiserIndex: -1,
        actionHistory: prev.actionHistory // 🔥 关键修复：保留行动历史
      };
    });
  }, [deck, distributePot, setGameState, setWinners, setShowdown, setDeck]);

  // 检查阶段转换 - 简化逻辑
  useEffect(() => {
    if (!gameStarted || showdown) return;

    // 🔍 详细的阶段转换检查日志
    const activePlayers = gameState.players.filter(p => !p.isFolded && p.isActive);
    const playersCanAct = activePlayers.filter(p => !p.isAllIn);

    console.log(`
🔍 ===== 阶段转换检查 =====
🎮 游戏已开始: ${gameStarted}
🏁 是否摊牌: ${showdown}
🃏 当前阶段: ${gameState.phase}
👥 活跃玩家数: ${activePlayers.length}
🎯 可行动玩家数: ${playersCanAct.length}
🎲 当前活跃玩家: ${gameState.players[gameState.activePlayerIndex]?.name || '无'}
📊 玩家行动状态:
${playersCanAct.map(p => `   - ${p.name}: hasActed=${p.hasActed}, currentBet=${p.currentBet}`).join('\n')}
============================`);

    // 🚀 简化：直接检查是否应该转换阶段
    if (shouldTransitionPhase(gameState)) {
      console.log(`[阶段转换] 满足转换条件，1秒后转换阶段`);
      const timer = setTimeout(() => {
        transitionToNextPhase();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, gameStarted, showdown, transitionToNextPhase]);

  // AI自动操作
  useEffect(() => {
    if (!gameStarted || showdown) return;

    const currentPlayer = gameState.players[gameState.activePlayerIndex];

    // 🔍 详细的AI触发条件检查
    console.log(`
🔍 ===== AI触发条件检查 =====
🎮 游戏已开始: ${gameStarted}
🏁 是否摊牌: ${showdown}
👤 当前玩家: ${currentPlayer?.name || '无'}
🤖 是否AI: ${currentPlayer?.isAI || false}
❌ 是否弃牌: ${currentPlayer?.isFolded || false}
🔥 是否全押: ${currentPlayer?.isAllIn || false}
🎯 活跃玩家索引: ${gameState.activePlayerIndex}
🃏 当前阶段: ${gameState.phase}
============================`);

    if (!currentPlayer?.isAI || currentPlayer.isFolded || currentPlayer.isAllIn) return;

    const thinkingTime = 2000; // 新AI系统：增加到2秒思考时间，给GTO决策更多时间

    // 🤖 AI思考开始日志
    console.log(`
🤖 ===== AI开始思考 =====
👤 AI玩家: ${currentPlayer.name}
🧠 AI配置: ${aiConfig.enabled ? '已启用' : '已禁用'}
⏱️ 思考时间: ${thinkingTime}ms
🃏 阶段: ${gameState.phase}
🏆 底池: ${gameState.pot}
📊 当前下注: ${gameState.currentBet}
💰 AI筹码: ${currentPlayer.chips}
🎯 位置: ${gameState.activePlayerIndex}
⏰ 开始时间: ${new Date().toLocaleTimeString()}
============================`);

    const timer = setTimeout(async () => {
      const apiKey = aiConfig.enabled ? aiConfig.openaiApiKey : undefined;
      const baseUrl = aiConfig.enabled ? aiConfig.baseUrl : undefined;
      const model = aiConfig.enabled ? aiConfig.model : undefined;

      const requestStartTime = Date.now();

      // 🚀 AI系统决策日志
      console.log(`
⚡ ===== 新AI快速决策开始 =====
👤 AI玩家: ${currentPlayer.name}
📊 游戏状态:
   - 阶段: ${gameState.phase}
   - 底池: ${gameState.pot}
   - 当前下注: ${gameState.currentBet}
   - AI筹码: ${currentPlayer.chips}
   - 公共牌: ${gameState.communityCards.map(card => `${card.rank}${card.suit}`).join(', ') || '无'}
⏰ 开始时间: ${new Date().toLocaleTimeString()}
============================`);

      try {
        console.log(`⚡ 新AI快速决策系统: ${currentPlayer.name}`);
        console.log('🔧 AI系统状态检查:', {
          fastDecisionEngine: !!fastDecisionEngineRef.current,
          aiManager: !!aiManagerRef.current,
          apiKey: !!apiKey,
          baseUrl: !!baseUrl,
          model: !!model
        });

        // 🚀 只使用新AI系统 - 移除所有老系统
        if (!fastDecisionEngineRef.current) {
          throw new Error('新AI系统未初始化');
        }

        // 🔍 AI行动前的详细状态检查
        console.log(`🔍 AI行动前状态检查:`, {
          当前阶段: gameState.phase,
          行动历史长度: gameState.actionHistory?.length || 0,
          行动历史内容: gameState.actionHistory || [],
          当前玩家: gameState.players[gameState.activePlayerIndex]?.name,
          底池: gameState.pot,
          当前下注: gameState.currentBet
        });

        // 转换游戏状态格式为NewGameState
        const newGameState = {
          gameId: `game_${Date.now()}`,
          phase: gameState.phase,
          round: 1,
          players: gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            isActive: p.isActive,
            isHuman: !p.isAI,
            position: gameState.players.indexOf(p),
            holeCards: p.holeCards || [],
            currentBet: p.currentBet || 0,
            hasActed: p.hasActed || false,
            isFolded: p.isFolded || false,
            isAllIn: p.isAllIn || false
          })),
          activePlayerIndex: gameState.activePlayerIndex,
          dealerIndex: gameState.dealerIndex || 0,
          communityCards: gameState.communityCards || [],
          pot: gameState.pot,
          currentBet: gameState.currentBet,
          smallBlind: gameState.smallBlindAmount || 50,
          bigBlind: gameState.bigBlindAmount || 100,
          actionHistory: gameState.actionHistory || [],
          currentRoundActions: (gameState.actionHistory || []).filter(a => a.phase === gameState.phase), // 只包含当前阶段的行动
          roundStartTime: Date.now(),
          actionStartTime: Date.now(),
          isGameActive: true
        };

        // 🚀 调试：检查传递给AI的游戏状态
        console.log('🔍 传递给AI的游戏状态:', {
          phase: newGameState.phase,
          originalPhase: gameState.phase,
          currentBet: newGameState.currentBet,
          pot: newGameState.pot,
          activePlayer: newGameState.players[newGameState.activePlayerIndex]?.name,
          actionHistoryLength: gameState.actionHistory?.length || 0,
          actionHistoryPreview: gameState.actionHistory?.slice(-3) || []
        });

        // 🔍 详细调试行动历史
        console.log('📊 行动历史详情:', {
          totalActions: gameState.actionHistory?.length || 0,
          allActions: gameState.actionHistory || [],
          currentPhaseActions: gameState.actionHistory?.filter(a => a.phase === gameState.phase) || [],
          传递给AI的行动历史: newGameState.actionHistory,
          传递给AI的当前轮次行动: newGameState.currentRoundActions
        });

        const startTime = Date.now();
        // 🚀 使用makeUltraFastDecision进行智能决策
        const aiDecision = await fastDecisionEngineRef.current.makeUltraFastDecision(
          newGameState,
          currentPlayer.id,
          currentPlayer.holeCards || [],
          new Map(), // 对手档案
          0 // 无超时限制，确保决策质量
        );

        const decision = {
          action: aiDecision.action,
          amount: aiDecision.amount
        };

        const responseTime = Date.now() - startTime;
        console.log(`⚡ 新AI快速决策完成: ${decision.action} ${decision.amount || ''} (${responseTime}ms)`);

        // 执行AI决策
        handlePlayerAction(decision.action, decision.amount);

      } catch (error) {
        const responseTime = Date.now() - startTime;

        // ❌ 新AI系统失败 - 直接弃牌
        console.error(`❌ 新AI系统决策失败: ${currentPlayer.name}`, error);
        console.error(`⏱️ 失败时间: ${responseTime}ms`);

        setAiStats(prev => ({
          successCount: prev.successCount,
          errorCount: prev.errorCount + 1,
          lastResponseTime: responseTime,
          totalRequests: prev.totalRequests + 1
        }));

        // 失败时自动弃牌
        handlePlayerAction('fold');
      }
    }, thinkingTime);

    return () => clearTimeout(timer);
  }, [gameState.activePlayerIndex, gameStarted, showdown, aiConfig, handlePlayerAction, gameState.phase, gameState.players, gameState.communityCards.length, setAiStats]);

  // 新手局
  const startNextHand = () => {
    const nextDealerIndex = findNextDealer(gameState.players, gameState.dealerIndex);
    setShowdown(false);
    setWinners([]);
    startNewGameWithDealer(nextDealerIndex);
  };

  const currentPlayer = gameState.players[gameState.activePlayerIndex];
  const humanPlayer = gameState.players.find(p => !p.isAI);
  const canCheck = gameState.currentBet === 0 || (currentPlayer?.currentBet === gameState.currentBet);
  const canCall = gameState.currentBet > (currentPlayer?.currentBet || 0);
  const canRaise = currentPlayer && currentPlayer.chips > 0 && !currentPlayer.isAllIn;
  const callAmount = gameState.currentBet - (currentPlayer?.currentBet || 0);

  const getPhaseText = () => {
    switch (gameState.phase) {
      case 'preflop': return '翻牌前';
      case 'flop': return '翻牌';
      case 'turn': return '转牌';
      case 'river': return '河牌';
      case 'showdown': return '摊牌';
      default: return gameState.phase;
    }
  };

  return (
    <div className="relative w-full h-screen bg-green-800 overflow-hidden">
      {/* 玩家位置层 */}
      {gameState.players.map((player, index) => (
        <PlayerComponent
          key={player.id}
          player={player}
          isCurrentPlayer={gameState.activePlayerIndex === index}
          showCards={showdown}
        />
      ))}

      {/* 桌子中央层 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="bg-green-900 rounded-full w-96 h-72 flex flex-col items-center justify-center border-4 border-green-700 shadow-2xl">
          <div className="flex gap-2 mb-4">
            {gameState.communityCards.map((card, index) => (
              <Card key={index} card={card} size="medium" />
            ))}
            {Array.from({ length: 5 - gameState.communityCards.length }).map((_, index) => (
              <div key={`placeholder-${index}`} className="w-12 h-16 border-2 border-dashed border-gray-400 rounded opacity-30"></div>
            ))}
          </div>
          
          <div className="text-white text-center">
            <div className="text-lg">底池</div>
            <div className="text-2xl">{gameState.pot.toLocaleString()}</div>
          </div>
          
          <div className="text-yellow-300 text-sm mt-2">
            {getPhaseText()}
          </div>

          {!gameStarted && (
            <div className="mt-4 text-center space-y-3">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-3 rounded-lg text-sm mb-3 border border-blue-300">
                <div className="font-bold">⚡ 新AI架构系统</div>
                <div className="text-xs mt-1">15秒快速决策 | 智能GTO策略</div>
                {!aiConfig.enabled && (
                  <div className="text-xs mt-1 text-orange-600">
                    💡 点击右上角"AI设置"配置API获得最佳体验
                  </div>
                )}
              </div>
              <Button onClick={startNewGame} className="px-8 py-3 text-lg bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
                🚀 开始新AI对战
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 游戏状态信息层 */}
      {gameStarted && !showdown && (
        <GameStatusDisplay
          gameState={gameState}
          currentPlayer={currentPlayer}
          aiConfig={aiConfig}
          aiStats={aiStats}
          humanPlayer={humanPlayer}
        />
      )}

      {/* 新AI系统状态监控 */}
      <div className="absolute top-4 left-4 z-50 space-y-3">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl shadow-lg border border-blue-400">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-bold text-lg">⚡ 新AI架构</span>
          </div>
          <div className="space-y-1 text-sm">
            <div>模型: {aiConfig.model || 'gpt-4'}</div>
            <div>决策速度: 1-15秒</div>
            <div className="flex gap-4">
              <span className="text-green-300">✅ {aiStats.successCount}</span>
              <span className="text-red-300">❌ {aiStats.errorCount}</span>
            </div>
            {aiStats.lastResponseTime > 0 && (
              <div className="text-yellow-300">
                ⏱️ {Math.round(aiStats.lastResponseTime)}ms
              </div>
            )}
          </div>
        </div>

        {gameStarted && (
          <div className="bg-green-800/90 text-white p-3 rounded-lg text-sm border border-green-600">
            <div className="font-bold">🎮 游戏状态</div>
            <div>阶段: {gameState.phase}</div>
            <div>活跃玩家: {gameState.players.filter(p => !p.isFolded).length}</div>
          </div>
        )}
      </div>

      {/* 游戏结果层 */}
      {showdown && winners.length > 0 && (
        <GameResultDisplay
          winners={winners}
          gameState={gameState}
          onNextHand={startNextHand}
          onShowChipManager={() => setShowChipManager(true)}
          onShowPlayerNotes={() => setShowPlayerNotes(true)}
          humanPlayer={humanPlayer}
        />
      )}

      {/* 人类玩家控制层 */}
      {gameStarted && !showdown && currentPlayer && !currentPlayer.isAI && (
        <GameControls
          currentPlayer={currentPlayer}
          gameState={gameState}
          canCheck={canCheck}
          canCall={canCall}
          canRaise={canRaise}
          callAmount={callAmount}
          onPlayerAction={handlePlayerAction}
        />
      )}

      {/* 顶级配置层 */}
      <div className="absolute top-4 right-4 z-60">
        <AIConfigComponent config={aiConfig} onConfigUpdate={handleAIConfigUpdate} />
      </div>

      {/* 对话框层 */}
      <ChipManagerDialog
        open={showChipManager}
        onOpenChange={setShowChipManager}
        players={gameState.players}
        onAddChips={addChipsToPlayer}
      />

      <PlayerNotesDialog
        open={showPlayerNotes}
        onOpenChange={setShowPlayerNotes}
        humanPlayer={humanPlayer}
      />
    </div>
  );
}