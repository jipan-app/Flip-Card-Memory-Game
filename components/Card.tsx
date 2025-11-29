import React from 'react';
import { CardType } from '../types';
import { audio } from '../services/audioService';

interface CardProps {
  card: CardType;
  onClick: (card: CardType) => void;
  disabled: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, disabled }) => {
  const handleClick = () => {
    if (!disabled && !card.isFlipped && !card.isMatched) {
      audio.playClick();
      onClick(card);
    }
  };

  const handleMouseEnter = () => {
    if (!disabled && !card.isFlipped && !card.isMatched) {
      audio.playHover();
    }
  };

  return (
    <div
      className="relative w-full aspect-square perspective-1000 cursor-pointer group"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <div
        className={`w-full h-full relative transform-style-3d transition-transform duration-500 ${
          card.isFlipped || card.isMatched ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front of card (Hidden state) */}
        <div className="absolute w-full h-full backface-hidden rounded-xl bg-slate-800 border-2 border-slate-600 shadow-lg flex items-center justify-center group-hover:border-cyan-400 group-hover:shadow-cyan-500/50 transition-all">
          <i className="fa-solid fa-question text-3xl text-slate-500 opacity-20"></i>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl"></div>
        </div>

        {/* Back of card (Revealed state) */}
        <div 
          className={`absolute w-full h-full backface-hidden rotate-y-180 rounded-xl border-2 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden ${
            card.isMatched ? 'animate-match ring-4 ring-white/50 border-white' : ''
          }`}
          style={{ background: card.color }}
        >
          {/* Shine Effect Container */}
          {card.isFlipped && !card.isMatched && (
             <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
               <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine"></div>
             </div>
          )}

          <i className={`fa-solid ${card.icon} text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${card.isMatched ? 'animate-bounce' : ''}`}></i>
        </div>
      </div>
    </div>
  );
};

export default Card;