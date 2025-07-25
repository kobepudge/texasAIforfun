import { Player as PlayerType, Card as CardType } from '../types/poker.ts';
import { Card } from './Card.tsx';

interface PlayerProps {
  player: PlayerType;
  isCurrentPlayer: boolean;
  showCards: boolean;
}

// 🔥 修复：9人桌玩家位置计算
function getPlayerPosition(position: number, totalPlayers: number) {
  if (totalPlayers === 9) {
    // 9人桌的位置分布 - 椭圆形排列
    const positions = [
      // 按钮位(庄家) - 右侧
      { top: '50%', right: '2%', transform: 'translateY(-50%)' },
      // 小盲 - 右下
      { bottom: '30%', right: '12%' },
      // 大盲 - 底部右侧，避免遮挡操作框
      { bottom: '18%', right: '30%' },
      // 枪口位 - 底部中间，避免遮挡操作框
      { bottom: '18%', left: '50%', transform: 'translateX(-50%)' },
      // 枪口+1 - 底部左侧，避免遮挡操作框
      { bottom: '18%', left: '30%' },
      // 枪口+2 - 左下
      { bottom: '30%', left: '12%' },
      // 中位 - 左侧
      { top: '50%', left: '2%', transform: 'translateY(-50%)' },
      // 中位+1 - 左上
      { top: '25%', left: '20%' },
      // 截止位 - 顶部右侧
      { top: '25%', right: '20%' }
    ];
    
    return positions[position] || positions[0];
  } else if (totalPlayers === 10) {
    // 10人桌的位置分布（保持兼容性）
    const positions = [
      { top: '45%', right: '2%', transform: 'translateY(-50%)' },
      { bottom: '35%', right: '15%' },
      { bottom: '20%', right: '35%' },
      { bottom: '20%', left: '50%', transform: 'translateX(-50%)' },
      { bottom: '20%', left: '35%' },
      { bottom: '35%', left: '15%' },
      { top: '45%', left: '2%', transform: 'translateY(-50%)' },
      { top: '25%', left: '15%' },
      { top: '8%', left: '35%' },
      { top: '8%', right: '35%' }
    ];
    
    return positions[position] || positions[0];
  } else {
    // 6人桌的位置分布（保持兼容性）
    const positions = [
      { top: '50%', right: '5%', transform: 'translateY(-50%)' }, // 庄家
      { bottom: '30%', right: '25%' }, // 小盲
      { bottom: '15%', left: '50%', transform: 'translateX(-50%)' }, // 大盲
      { bottom: '30%', left: '25%' }, // 枪口
      { top: '50%', left: '5%', transform: 'translateY(-50%)' }, // 中位
      { top: '20%', left: '50%', transform: 'translateX(-50%)' } // 后位
    ];
    
    return positions[position] || positions[0];
  }
}

export function Player({ player, isCurrentPlayer, showCards }: PlayerProps) {
  const position = getPlayerPosition(player.position, 9); // 设定为9人桌

  const getPlayerStatusColor = () => {
    if (player.isFolded) return 'bg-red-900/30 border-red-600';
    if (player.isAllIn) return 'bg-purple-900/30 border-purple-600';
    if (isCurrentPlayer) return 'bg-yellow-400/20 border-yellow-400 shadow-lg shadow-yellow-400/30';
    return 'bg-gray-900/50 border-gray-600';
  };

  const getPositionBadge = () => {
    if (player.isDealer) return '🎯';
    if (player.isSmallBlind) return 'SB';
    if (player.isBigBlind) return 'BB';
    return null;
  };

  return (
    <div 
      className={`absolute z-10 ${getPlayerStatusColor()} border-2 rounded-lg p-2 transition-all duration-300`}
      style={position}
    >
      <div className="flex flex-col items-center gap-1 min-w-[100px]">
        {/* 玩家名称和筹码 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-white text-sm font-medium truncate max-w-[80px]">
              {player.name}
            </span>
            {getPositionBadge() && (
              <span className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded">
                {getPositionBadge()}
              </span>
            )}
          </div>
          <div className="text-green-300 text-xs">
            💰 {player.chips.toLocaleString()}
          </div>
          {player.currentBet > 0 && (
            <div className="text-yellow-300 text-xs">
              下注: {player.currentBet.toLocaleString()}
            </div>
          )}
        </div>

        {/* 手牌 */}
        <div className="flex gap-1">
          {player.holeCards.map((card, index) => (
            <Card
              key={index}
              card={showCards || !player.isAI ? card : { suit: 'hearts', rank: '?' } as CardType}
              size="small"
            />
          ))}
        </div>

        {/* 状态指示器 */}
        {player.isFolded && (
          <div className="text-red-400 text-xs">已弃牌</div>
        )}
        {player.isAllIn && (
          <div className="text-purple-400 text-xs animate-pulse">全押</div>
        )}
      </div>
    </div>
  );
}