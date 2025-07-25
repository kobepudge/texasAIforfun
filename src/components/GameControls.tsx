import { useState } from 'react';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Card } from './ui/card.tsx';

interface GameControlsProps {
  currentPlayer: any;
  gameState: any;
  onPlayerAction: (action: string, amount?: number) => void;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  callAmount: number;
}

export function GameControls({
  currentPlayer,
  gameState,
  onPlayerAction,
  canCheck,
  canCall,
  canRaise,
  callAmount
}: GameControlsProps) {
  // 计算最小加注金额（德州扑克规则）
  const calculateMinRaise = () => {
    // 如果是翻牌前且当前最高下注等于大盲注，那么最小加注是大盲注 + 大盲注 = 2倍大盲注
    if (gameState.phase === 'preflop' && gameState.currentBet === gameState.bigBlindAmount) {
      return gameState.currentBet + gameState.bigBlindAmount;
    }
    
    // 查找本轮最后一次的加注增量
    const allRaises = gameState.actionHistory
      .filter(action => 
        action.phase === gameState.phase && 
        action.amount && 
        (action.action.includes('加注') || (action.action === 'all-in' && action.amount > gameState.bigBlindAmount))
      );
    
    if (allRaises.length === 0) {
      // 如果本轮还没有加注，最小加注增量是大盲注
      return gameState.currentBet + gameState.bigBlindAmount;
    }
    
    // 计算最后一次加注的增量
    const lastRaise = allRaises[allRaises.length - 1];
    const prevHighestBet = allRaises.length > 1 ? 
      allRaises[allRaises.length - 2].amount : 
      gameState.bigBlindAmount;
    
    const lastRaiseIncrement = lastRaise.amount - prevHighestBet;
    const minRaiseIncrement = Math.max(lastRaiseIncrement, gameState.bigBlindAmount);
    
    return gameState.currentBet + minRaiseIncrement;
  };

  const minRaise = calculateMinRaise();
  const [raiseAmount, setRaiseAmount] = useState(Math.max(minRaise, gameState.bigBlindAmount * 2));

  if (!currentPlayer || currentPlayer.isAI) {
    return null;
  }

  const maxRaise = currentPlayer.chips + currentPlayer.currentBet; // 玩家可以下注的最大总金额

  return (
    <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 bg-white shadow-lg z-50">
      <div className="flex flex-col gap-3">
        <div className="text-center text-sm space-y-1">
          <div>当前下注: {gameState.currentBet.toLocaleString()}</div>
          <div>底池: {gameState.pot.toLocaleString()}</div>
          {canRaise && (
            <div className="text-xs text-gray-600">
              最小加注: {minRaise.toLocaleString()} (增量: {(minRaise - gameState.currentBet).toLocaleString()})
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => onPlayerAction('fold')}
            variant="destructive"
            size="sm"
          >
            弃牌
          </Button>

          {canCheck && (
            <Button 
              onClick={() => onPlayerAction('check')}
              variant="outline"
              size="sm"
            >
              过牌
            </Button>
          )}

          {canCall && callAmount > 0 && (
            <Button 
              onClick={() => onPlayerAction('call')}
              variant="default"
              size="sm"
            >
              跟注 {callAmount.toLocaleString()}
            </Button>
          )}

          {canRaise && maxRaise >= minRaise && (
            <div className="flex gap-1">
              <Input
                type="number"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Math.max(minRaise, parseInt(e.target.value) || minRaise))}
                min={minRaise}
                max={maxRaise}
                className="w-24 text-sm"
                placeholder={`最小: ${minRaise}`}
              />
              <Button 
                onClick={() => onPlayerAction('raise', raiseAmount)}
                disabled={raiseAmount > maxRaise || raiseAmount < minRaise}
                size="sm"
              >
                加注至 {raiseAmount.toLocaleString()}
              </Button>
            </div>
          )}

          {currentPlayer.chips > 0 && (
            <Button 
              onClick={() => onPlayerAction('all-in')}
              variant="outline"
              size="sm"
            >
              All In
            </Button>
          )}
        </div>

        <div className="flex gap-2 text-xs">
          <Button 
            onClick={() => setRaiseAmount(Math.max(minRaise, gameState.bigBlindAmount * 2))}
            variant="ghost"
            size="sm"
          >
            2BB
          </Button>
          <Button 
            onClick={() => setRaiseAmount(Math.max(minRaise, gameState.bigBlindAmount * 3))}
            variant="ghost"
            size="sm"
          >
            3BB
          </Button>
          <Button 
            onClick={() => setRaiseAmount(Math.max(minRaise, gameState.pot))}
            variant="ghost"
            size="sm"
          >
            底池
          </Button>
          <Button 
            onClick={() => setRaiseAmount(minRaise)}
            variant="ghost"
            size="sm"
          >
            最小加注
          </Button>
        </div>
      </div>
    </Card>
  );
}