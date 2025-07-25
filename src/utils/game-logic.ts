import { GameState, Player, Card as CardType } from '../types/poker.ts';
import { AI_DELAY_CONFIG } from '../constants/poker-game.ts';
import { createDeck, shuffleDeck, getPositionName } from './poker.ts';

export function calculateAIThinkingTime(phase: string, communityCardsCount: number): number {
  const baseDelay = AI_DELAY_CONFIG.BASE_DELAY;
  const randomDelay = Math.random() * AI_DELAY_CONFIG.RANDOM_DELAY_MAX;
  const phaseDelay = phase === 'preflop' ? AI_DELAY_CONFIG.PREFLOP_EXTRA : AI_DELAY_CONFIG.POSTFLOP_EXTRA;
  const complexityDelay = communityCardsCount * AI_DELAY_CONFIG.COMPLEXITY_MULTIPLIER;
  
  return baseDelay + randomDelay + phaseDelay + complexityDelay;
}

export function setupNewGame(gameState: GameState, dealerIndex: number): {
  newPlayers: Player[];
  newDeck: CardType[];
  nextPlayerIndex: number;
  pot: number;
} {
  const newDeck = shuffleDeck(createDeck());
  
  // 设置位置和盲注
  const activePlayers = gameState.players.filter(p => p.isActive && p.chips > 0);
  
  // 找到小盲和大盲位置（跳过没有筹码的玩家）
  let smallBlindIndex = (dealerIndex + 1) % gameState.players.length;
  while (!gameState.players[smallBlindIndex].isActive || gameState.players[smallBlindIndex].chips <= 0) {
    smallBlindIndex = (smallBlindIndex + 1) % gameState.players.length;
    if (smallBlindIndex === dealerIndex) break;
  }
  
  let bigBlindIndex = (smallBlindIndex + 1) % gameState.players.length;
  while (!gameState.players[bigBlindIndex].isActive || gameState.players[bigBlindIndex].chips <= 0) {
    bigBlindIndex = (bigBlindIndex + 1) % gameState.players.length;
    if (bigBlindIndex === dealerIndex) break;
  }
  
  console.log(`位置设置详情:`);
  console.log(`- 庄家: ${gameState.players[dealerIndex]?.name} (位置${dealerIndex})`);
  console.log(`- 小盲: ${gameState.players[smallBlindIndex]?.name} (位置${smallBlindIndex})`);
  console.log(`- 大盲: ${gameState.players[bigBlindIndex]?.name} (位置${bigBlindIndex})`);
  
  const newPlayers = gameState.players.map((player, index) => {
    return {
      ...player,
      holeCards: [],
      currentBet: 0,
      totalBet: 0,
      isFolded: false,
      isAllIn: false,
      hasActed: false,
      isDealer: index === dealerIndex,
      isSmallBlind: index === smallBlindIndex,
      isBigBlind: index === bigBlindIndex,
      // AI玩家使用"Goliath"身份
      aiPersonality: player.isAI ? {
        key: 'goliath',
        name: 'Goliath GTO专家',
        description: '精通游戏理论最优策略的顶级AI',
        instruction: '基于GTO策略进行决策，根据对手行为适度调整',
        aggressionLevel: 0.6 + (Math.random() - 0.5) * 0.2,
        tightnessLevel: 0.4 + (Math.random() - 0.5) * 0.2,
        bluffFrequency: 0.25 + (Math.random() - 0.5) * 0.1,
        adaptability: 0.8,
        unpredictability: 0.3
      } : undefined,
      behaviorHistory: player.behaviorHistory || [],
      personalityAnalysis: player.personalityAnalysis
    };
  });

  // 发手牌
  let deckIndex = 0;
  newPlayers.forEach(player => {
    if (player.isActive && player.chips > 0) {
      player.holeCards = [newDeck[deckIndex], newDeck[deckIndex + 1]];
      deckIndex += 2;
    }
  });

  // 收取盲注
  const smallBlindPlayer = newPlayers.find(p => p.isSmallBlind);
  const bigBlindPlayer = newPlayers.find(p => p.isBigBlind);
  
  let pot = 0;
  
  if (smallBlindPlayer) {
    const blindAmount = Math.min(gameState.smallBlindAmount, smallBlindPlayer.chips);
    smallBlindPlayer.currentBet = blindAmount;
    smallBlindPlayer.totalBet = blindAmount;
    smallBlindPlayer.chips -= blindAmount;
    pot += blindAmount;
    if (smallBlindPlayer.chips === 0) smallBlindPlayer.isAllIn = true;
  }
  
  if (bigBlindPlayer) {
    const blindAmount = Math.min(gameState.bigBlindAmount, bigBlindPlayer.chips);
    bigBlindPlayer.currentBet = blindAmount;
    bigBlindPlayer.totalBet = blindAmount;
    bigBlindPlayer.chips -= blindAmount;
    pot += blindAmount;
    if (bigBlindPlayer.chips === 0) bigBlindPlayer.isAllIn = true;
  }

  let nextPlayerIndex = (bigBlindIndex + 1) % newPlayers.length;
  
  // 找到第一个能行动的玩家
  while (newPlayers[nextPlayerIndex].isFolded || !newPlayers[nextPlayerIndex].isActive || newPlayers[nextPlayerIndex].chips === 0) {
    nextPlayerIndex = (nextPlayerIndex + 1) % newPlayers.length;
    if (nextPlayerIndex === bigBlindIndex) break;
  }

  return {
    newPlayers,
    newDeck: newDeck.slice(deckIndex),
    nextPlayerIndex,
    pot
  };
}

export function findNextDealer(players: Player[], currentDealerIndex: number): number {
  const activePlayers = players.filter(p => p.isActive && p.chips > 0);
  if (activePlayers.length < 2) return currentDealerIndex;
  
  let nextDealerIndex = (currentDealerIndex + 1) % players.length;
  const originalDealerIndex = currentDealerIndex;
  
  // 确保新庄家是活跃且有筹码的玩家
  while (!players[nextDealerIndex].isActive || players[nextDealerIndex].chips <= 0) {
    nextDealerIndex = (nextDealerIndex + 1) % players.length;
    // 防止无限循环
    if (nextDealerIndex === originalDealerIndex) break;
  }
  
  console.log(`庄家位置移动: ${players[originalDealerIndex]?.name} (位置${originalDealerIndex}) -> ${players[nextDealerIndex]?.name} (位置${nextDealerIndex})`);
  
  return nextDealerIndex;
}