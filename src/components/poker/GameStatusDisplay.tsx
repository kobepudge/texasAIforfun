import { GameState, Player } from '../../types/poker.ts';
import { AIConfig } from '../../types/poker.ts';
import { PlayerNotesManager } from '../../utils/player-notes.ts';

interface GameStatusDisplayProps {
  gameState: GameState;
  currentPlayer: Player | undefined;
  aiConfig: AIConfig;
  aiStats: {
    successCount: number;
    errorCount: number;
    lastResponseTime: number;
    totalRequests: number;
  };
  humanPlayer: Player | undefined;
}

export function GameStatusDisplay({ 
  gameState, 
  currentPlayer, 
  aiConfig, 
  aiStats, 
  humanPlayer 
}: GameStatusDisplayProps) {
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

  const getPlayerNotesCount = () => {
    if (!humanPlayer) return 0;
    return PlayerNotesManager.getPlayerNotes(humanPlayer.id).length;
  };

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg z-30">
      <div className="text-sm space-y-1">
        <div>游戏阶段: {getPhaseText()}</div>
        <div>当前下注: {gameState.currentBet.toLocaleString()}</div>
        <div>当前行动: {currentPlayer?.name}</div>
        <div>小盲/大盲: {gameState.smallBlindAmount}/{gameState.bigBlindAmount}</div>
        <div className="text-gray-300">9人桌 GTO德州扑克 🎯</div>
        {aiConfig.enabled && aiStats.totalRequests > 0 && (
          <div className="text-green-300 text-xs">
            Goliath AI: {aiConfig.model} ({aiStats.successCount}/{aiStats.totalRequests})
          </div>
        )}
        {humanPlayer && getPlayerNotesCount() > 0 && (
          <div className="text-blue-300 text-xs">
            AI观察笔记: {getPlayerNotesCount()}条
          </div>
        )}
      </div>
    </div>
  );
}