export interface CardType {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
  color: string;
}

export type GameMode = 'normal' | 'infinite';

export type GameState = 'menu' | 'playing' | 'won' | 'lost';

export interface LevelConfig {
  gridCols: number;
  pairs: number;
  timeBonus: number; // Seconds added per level
}

export const ICONS = [
  'fa-ghost', 'fa-fire', 'fa-dragon', 'fa-bolt', 
  'fa-snowflake', 'fa-robot', 'fa-rocket', 'fa-gamepad',
  'fa-heart', 'fa-star', 'fa-crown', 'fa-gem',
  'fa-skull', 'fa-anchor', 'fa-bomb', 'fa-bug',
  'fa-puzzle-piece', 'fa-chess-knight', 'fa-dice-d20', 'fa-virus'
];