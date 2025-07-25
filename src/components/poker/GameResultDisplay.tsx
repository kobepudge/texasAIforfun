import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { GameState } from '../../types/poker.ts';
import { PlayerNotesManager } from '../../utils/player-notes.ts';

interface GameResultDisplayProps {
  winners: any[];
  gameState: GameState;
  onNextHand: () => void;
  onShowChipManager: () => void;
  onShowPlayerNotes: () => void;
  humanPlayer: any;
}

export function GameResultDisplay({
  winners,
  gameState,
  onNextHand,
  onShowChipManager,
  onShowPlayerNotes,
  humanPlayer
}: GameResultDisplayProps) {
  const getPlayerNotesCount = () => {
    if (!humanPlayer) return 0;
    return PlayerNotesManager.getPlayerNotes(humanPlayer.id).length;
  };

  if (winners.length === 0) return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 mt-40">
      <div className="bg-black bg-opacity-90 text-white p-6 rounded-xl text-center space-y-4 border-2 border-yellow-400 shadow-2xl">
        <div className="text-xl">
          🎉 获胜者: {winners[0].winners.map(w => w.name).join(', ')}
        </div>
        <div className="text-yellow-300">
          {winners[0].handRanking.name}
          {winners[0].handRanking.rank === 10 && " 🏆"}
        </div>
        {winners[0].handRanking.rank === 10 && (
          <div className="text-green-300 text-sm animate-pulse">
            直接获胜，无需摊牌
          </div>
        )}
        <div className="text-gray-300 text-sm space-y-1">
          <div>当前庄家: {gameState.players[gameState.dealerIndex]?.name}</div>
          <div>小盲: {gameState.players.find(p => p.isSmallBlind)?.name}</div>
          <div>大盲: {gameState.players.find(p => p.isBigBlind)?.name}</div>
        </div>
        <div className="flex gap-4 justify-center pt-2">
          <Button onClick={onNextHand} className="px-6 py-2 bg-green-600 hover:bg-green-700">
            下一手
          </Button>
          <Button 
            onClick={onShowChipManager} 
            className="px-6 py-2"
            variant="outline"
          >
            筹码管理
          </Button>
          {humanPlayer && (
            <Button 
              onClick={onShowPlayerNotes} 
              className="px-6 py-2"
              variant="outline"
            >
              <Badge variant="secondary" className="mr-2">
                {getPlayerNotesCount()}
              </Badge>
              AI笔记
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}