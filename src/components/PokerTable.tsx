import { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Card as CardType, GamePhase, Message } from '../types/poker.ts';
import { createDeck, shuffleDeck, makeAIDecision, shouldTransitionPhase, determineWinners, addActionToHistory, evaluateHand, recordPlayerBehavior, analyzePlayerPersonality, analyzeHandAndGenerateNotes, getPositionName, formatHand } from '../utils/poker.ts';
import { setupNewGame, calculateAIThinkingTime, findNextDealer } from '../utils/game-logic.ts';
import { useGameState, useAIConfig } from '../hooks/useGameState.ts';
import { PlayerNotesManager } from '../utils/player-notes.ts';
import { Player as PlayerComponent } from './Player.tsx';
import { Card } from './Card.tsx';
import { GameControls } from './GameControls.tsx';
import { AIConfig as AIConfigComponent } from './AIConfig.tsx';
import { AIStatusMonitor } from './AIStatusMonitor.tsx';
import { HybridSessionMonitor } from './HybridSessionMonitor.tsx';
import { GameStatusDisplay } from './poker/GameStatusDisplay.tsx';
import { GameResultDisplay } from './poker/GameResultDisplay.tsx';
import { ChipManagerDialog, PlayerNotesDialog } from './poker/GameDialogs.tsx';
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
    aiConversationHistories,
    updateAIConversationHistory,
    resetAIConversationHistories
  } = useGameState();

  const {
    aiConfig,
    aiStats,
    setAiStats,
    handleAIConfigUpdate
  } = useAIConfig();

  const [showChipManager, setShowChipManager] = useState(false);
  const [showPlayerNotes, setShowPlayerNotes] = useState(false);

  // 开始新游戏
  const startNewGame = () => {
    startNewGameWithDealer(gameState.dealerIndex);
  };

  // 开始新游戏（指定庄家位置）
  const startNewGameWithDealer = (dealerIndex: number) => {
    const { newPlayers, newDeck, nextPlayerIndex, pot } = setupNewGame(gameState, dealerIndex);

    resetAIConversationHistories();
    newPlayers.forEach(player => {
      if (player.isAI) {
        const systemMessage: Message = {
          role: 'system',
          content: `你是一位名叫 ${player.name} 的德州扑克GTO大师。你正在参加一场牌局。你的当前位置是 ${getPositionName(player, { ...gameState, players: newPlayers, dealerIndex })}, 你的手牌是 ${formatHand(player.holeCards)}。请根据牌局的进展做出最优决策。`
        };
        updateAIConversationHistory(player.id, systemMessage);
      }
    });

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
      actionHistory: []
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
  const handlePlayerAction = useCallback((action: string, amount?: number) => {
    const currentPlayer = gameState.players[gameState.activePlayerIndex];
    if (!currentPlayer || currentPlayer.isFolded || !currentPlayer.isActive) return;

    const newPlayers = [...gameState.players];
    const player = newPlayers[gameState.activePlayerIndex];
    let newPot = gameState.pot;
    let newCurrentBet = gameState.currentBet;
    let newLastRaiserIndex = gameState.lastRaiserIndex;

    player.hasActed = true;

    // 处理不同的玩家行为
    switch (action) {
      case 'fold':
        player.isFolded = true;
        break;
      
      case 'check':
        if (gameState.currentBet !== player.currentBet) return;
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

    gameState.players.forEach(p => {
      if (p.isAI) {
        updateAIConversationHistory(p.id, userMessage);
      }
    });

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

    const newActionHistory = addActionToHistory(gameState, player.name, action, amount);

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
    while (newPlayers[nextPlayerIndex].isFolded || !newPlayers[nextPlayerIndex].isActive) {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      if (nextPlayerIndex === gameState.activePlayerIndex) break;
    }

    setGameState(prev => ({
      ...prev,
      players: newPlayers,
      pot: newPot,
      currentBet: newCurrentBet,
      activePlayerIndex: nextPlayerIndex,
      lastRaiserIndex: newLastRaiserIndex,
      actionHistory: newActionHistory
    }));
  }, [gameState, checkForSinglePlayerWin, setGameState, setWinners, setShowdown, updateAIConversationHistory]);

  // 转换游戏阶段
  const transitionToNextPhase = useCallback(() => {
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

      let bettingStartIndex = (prev.dealerIndex + 1) % prev.players.length;
      while (newPlayers[bettingStartIndex].isFolded || !newPlayers[bettingStartIndex].isActive || newPlayers[bettingStartIndex].isAllIn) {
        bettingStartIndex = (bettingStartIndex + 1) % prev.players.length;
        if (bettingStartIndex === (prev.dealerIndex + 1) % prev.players.length) {
          break;
        }
      }

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
        lastRaiserIndex: -1
      };
    });
  }, [deck, distributePot, setGameState, setWinners, setShowdown, setDeck]);

  // 检查阶段转换
  useEffect(() => {
    if (!gameStarted || showdown) return;

    if (shouldTransitionPhase(gameState)) {
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
    if (!currentPlayer?.isAI || currentPlayer.isFolded || currentPlayer.isAllIn) return;
    
    const thinkingTime = calculateAIThinkingTime(gameState.phase, gameState.communityCards.length);
    
    const timer = setTimeout(async () => {
      const apiKey = aiConfig.enabled ? aiConfig.openaiApiKey : undefined;
      const baseUrl = aiConfig.enabled ? aiConfig.baseUrl : undefined;
      const model = aiConfig.enabled ? aiConfig.model : undefined;
      
      const requestStartTime = Date.now();
      
      const conversationHistory = aiConversationHistories[currentPlayer.id] || [];

      try {
        const decision = await makeAIDecision(
          currentPlayer, 
          gameState, 
          gameState.communityCards, 
          conversationHistory,
          apiKey,
          baseUrl,
          model
        );
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: JSON.stringify(decision)
        };
        updateAIConversationHistory(currentPlayer.id, assistantMessage);

        const responseTime = Date.now() - requestStartTime;
        setAiStats(prev => ({
          successCount: prev.successCount + 1,
          errorCount: prev.errorCount,
          lastResponseTime: responseTime,
          totalRequests: prev.totalRequests + 1
        }));
        
        handlePlayerAction(decision.action, decision.amount);
        
      } catch (error) {
        setAiStats(prev => ({
          successCount: prev.successCount,
          errorCount: prev.errorCount + 1,
          lastResponseTime: prev.lastResponseTime,
          totalRequests: prev.totalRequests + 1
        }));
        
        handlePlayerAction('fold');
      }
    }, thinkingTime);

    return () => clearTimeout(timer);
  }, [gameState.activePlayerIndex, gameStarted, showdown, aiConfig, handlePlayerAction, gameState.phase, gameState.players, gameState.communityCards.length, setAiStats, aiConversationHistories, updateAIConversationHistory]);

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
              {!aiConfig.enabled && (
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm mb-3 animate-pulse border border-yellow-300">
                  <div className="font-medium">💡 配置AI获得GTO对战体验</div>
                  <div className="text-xs mt-1">点击右上角"AI设置"配置API密钥</div>
                </div>
              )}
              <Button onClick={startNewGame} className="px-8 py-2">
                开始GTO对战
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

      {/* AI状态监控层 */}
      <div className="absolute top-4 left-4 z-50 space-y-3">
        <AIStatusMonitor
          enabled={aiConfig.enabled}
          model={aiConfig.model}
          lastResponseTime={aiStats.lastResponseTime}
          errorCount={aiStats.errorCount}
          successCount={aiStats.successCount}
        />
        
        {/* V1.5混合会话监控 */}
        {aiConfig.enabled && gameStarted && (
          <HybridSessionMonitor />
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