import { Card as CardType } from '../types/poker';

interface CardProps {
  card: CardType;
  isHidden?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function Card({ card, isHidden = false, size = 'medium' }: CardProps) {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const sizeClasses = {
    small: 'w-10 h-14 text-xs',
    medium: 'w-14 h-20 text-sm',
    large: 'w-18 h-26 text-base'
  };

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  if (isHidden) {
    return (
      <div className={`${sizeClasses[size]} bg-blue-900 rounded border border-gray-300 flex items-center justify-center`}>
        <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-900 rounded flex items-center justify-center">
          <div className="w-6 h-8 bg-blue-600 rounded-sm opacity-50"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-white rounded border border-gray-300 relative shadow-sm`}>
      {/* 左上角显示数字和花色 */}
      <div className={`absolute top-1 left-1 ${isRed ? 'text-red-600' : 'text-black'} flex flex-col items-center leading-none`}>
        <div className="font-bold">{card.rank}</div>
        <div className="text-lg">{suitSymbols[card.suit]}</div>
      </div>
      
      {/* 中央大花色显示 */}
      <div className={`absolute inset-0 flex items-center justify-center ${isRed ? 'text-red-600' : 'text-black'}`}>
        <div className={`${
          size === 'small' ? 'text-2xl' : 
          size === 'medium' ? 'text-3xl' : 
          'text-4xl'
        } opacity-30`}>
          {suitSymbols[card.suit]}
        </div>
      </div>
      
      {/* 右下角倒置显示（可选，保持传统扑克牌样式）*/}
      <div className={`absolute bottom-1 right-1 ${isRed ? 'text-red-600' : 'text-black'} flex flex-col items-center leading-none rotate-180`}>
        <div className="font-bold text-xs">{card.rank}</div>
        <div className="text-sm">{suitSymbols[card.suit]}</div>
      </div>
    </div>
  );
}