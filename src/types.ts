export interface Player {
  id: string;
  name: string;
  role: 'citizen' | 'spy';
  word: string;
  isEliminated: boolean;
}

export type GamePhase = 'setup' | 'category-select' | 'role-reveal' | 'describe' | 'vote' | 'spy-guess' | 'punishment' | 'result' | 'manage-categories';

export interface Word {
  id: string;
  text: string;
}

export interface Category {
  id: string;
  name: string;
  words: Word[];
  isCustom?: boolean;
}

export interface Punishment {
  id: string;
  text: string;
  isCustom?: boolean;
}

export interface GameState {
  players: Player[];
  phase: GamePhase;
  selectedCategoryIds: string[];
  currentWord: Word | null;
  currentPlayerIndex: number;
  winner: 'citizens' | 'spy' | null;
}
