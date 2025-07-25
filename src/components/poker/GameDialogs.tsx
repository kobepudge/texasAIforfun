import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog.tsx';
import { Button } from '../ui/button.tsx';
import { Label } from '../ui/label.tsx';
import { Badge } from '../ui/badge.tsx';
import { Player } from '../../types/poker.ts';
import { PlayerNotesManager } from '../../utils/player-notes.ts';
import { CHIP_BUY_IN_OPTIONS } from '../../constants/poker-game.ts';

interface ChipManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  onAddChips: (playerId: string, amount: number) => void;
}

export function ChipManagerDialog({ open, onOpenChange, players, onAddChips }: ChipManagerDialogProps) {
  const brokePlayers = players.filter(p => p.chips === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>筹码管理</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            只有输光筹码的玩家可以在局结束后重新购买筹码
          </div>
          {brokePlayers.map(player => (
            <div key={player.id} className="flex items-center gap-2">
              <Label className="flex-1">{player.name}</Label>
              <div className="flex gap-1">
                {CHIP_BUY_IN_OPTIONS.map(option => (
                  <Button 
                    key={option.amount}
                    size="sm" 
                    onClick={() => onAddChips(player.id, option.amount)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {brokePlayers.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              当前没有需要重新购买筹码的玩家
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlayerNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  humanPlayer: Player | undefined;
}

export function PlayerNotesDialog({ open, onOpenChange, humanPlayer }: PlayerNotesDialogProps) {
  const getPlayerNotesCount = () => {
    if (!humanPlayer) return 0;
    return PlayerNotesManager.getPlayerNotes(humanPlayer.id).length;
  };

  if (!humanPlayer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎯 Goliath AI 观察笔记</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            AI在对局中观察到的行为模式和策略特点
          </div>
          
          {/* 对手档案 */}
          {(() => {
            const profile = PlayerNotesManager.getOpponentProfile(humanPlayer.id);
            if (profile) {
              return (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="text-lg">📊 行为分析</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>激进程度: {(profile.recentBehavior.aggression * 100).toFixed(0)}%</div>
                    <div>紧密程度: {(profile.recentBehavior.tightness * 100).toFixed(0)}%</div>
                    <div>虚张声势频率: {(profile.recentBehavior.bluffFrequency * 100).toFixed(0)}%</div>
                    <div>牌局数量: {profile.handsPlayed}</div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* 笔记列表 */}
          <div className="space-y-3">
            <div className="text-lg">📝 观察笔记</div>
            {PlayerNotesManager.getPlayerNotes(humanPlayer.id)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 20)
              .map(note => (
                <div key={note.id} className="bg-white p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm">{note.noteText}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {note.category} | 可信度: {(note.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <Badge variant={note.confidence > 0.8 ? 'default' : 'secondary'} className="ml-2">
                      {(note.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(note.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            
            {getPlayerNotesCount() === 0 && (
              <div className="text-center text-gray-500 py-8">
                暂无观察笔记，继续游戏让AI学习你的打法
              </div>
            )}
          </div>
          
          {/* 分析报告 */}
          {humanPlayer && getPlayerNotesCount() > 5 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-lg mb-2">📈 详细分析报告</div>
              <pre className="text-sm whitespace-pre-wrap">
                {PlayerNotesManager.generateAnalysisReport(humanPlayer.id)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}