// Game Types for Bible Jeopardy

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  buzzTime?: number; // timestamp when they buzzed
}

export interface Question {
  id: string;
  category: string;
  value: number;
  question: string;
  answer: string;
  isAnswered: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

export interface GameBoard {
  categories: Category[];
}

export interface GameState {
  roomCode: string;
  status: 'lobby' | 'category-select' | 'playing' | 'question' | 'buzzing' | 'reveal' | 'finished';
  players: Player[];
  hostId: string;
  board: GameBoard | null;
  currentQuestion: Question | null;
  buzzedPlayer: Player | null;
  buzzOrder: { playerId: string; time: number }[];
  round: number; // 1 = Jeopardy, 2 = Double Jeopardy
  selectedCategories: string[];
}

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

// Pusher Events
export type GameEvent =
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'GAME_STARTED'; board: GameBoard }
  | { type: 'QUESTION_SELECTED'; question: Question }
  | { type: 'PLAYER_BUZZED'; playerId: string; time: number }
  | { type: 'ANSWER_JUDGED'; playerId: string; correct: boolean; newScore: number }
  | { type: 'QUESTION_CLOSED'; questionId: string }
  | { type: 'GAME_STATE_UPDATE'; state: Partial<GameState> }
  | { type: 'BUZZ_RESET' }
  | { type: 'REVEAL_ANSWER' };
