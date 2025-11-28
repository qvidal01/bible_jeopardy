// Zustand store for game state management
import { create } from 'zustand';
import { GameState, Player, Question, GameBoard, Category } from '@/types/game';
import { getQuestionsForCategory, CATEGORY_DEFINITIONS } from '@/data/categories';

interface GameStore extends GameState {
  // Actions
  setRoomCode: (code: string) => void;
  setHostId: (id: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayerScore: (playerId: string, score: number) => void;
  setStatus: (status: GameState['status']) => void;
  setBoard: (board: GameBoard) => void;
  selectQuestion: (question: Question) => void;
  playerBuzz: (playerId: string, time: number) => void;
  resetBuzz: () => void;
  markQuestionAnswered: (questionId: string) => void;
  setSelectedCategories: (categories: string[]) => void;
  initializeBoard: (categoryIds: string[]) => void;
  resetGame: () => void;
  updateGameState: (state: Partial<GameState>) => void;
}

const initialState: Omit<GameState, 'updateGameState'> = {
  roomCode: '',
  status: 'lobby',
  players: [],
  hostId: '',
  board: null,
  currentQuestion: null,
  buzzedPlayer: null,
  buzzOrder: [],
  round: 1,
  selectedCategories: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setRoomCode: (code) => set({ roomCode: code }),

  setHostId: (id) => set({ hostId: id }),

  addPlayer: (player) => set((state) => ({
    players: [...state.players.filter(p => p.id !== player.id), player]
  })),

  removePlayer: (playerId) => set((state) => ({
    players: state.players.filter((p) => p.id !== playerId)
  })),

  updatePlayerScore: (playerId, score) => set((state) => ({
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, score } : p
    )
  })),

  setStatus: (status) => set({ status }),

  setBoard: (board) => set({ board }),

  selectQuestion: (question) => set({
    currentQuestion: question,
    status: 'question',
    buzzOrder: [],
    buzzedPlayer: null
  }),

  playerBuzz: (playerId, time) => set((state) => {
    const player = state.players.find(p => p.id === playerId);
    const newBuzzOrder = [...state.buzzOrder, { playerId, time }].sort((a, b) => a.time - b.time);

    // First buzzer wins
    const firstBuzzer = newBuzzOrder[0];
    const buzzedPlayer = state.players.find(p => p.id === firstBuzzer.playerId) || null;

    return {
      buzzOrder: newBuzzOrder,
      buzzedPlayer: state.buzzedPlayer || buzzedPlayer,
      status: 'buzzing'
    };
  }),

  resetBuzz: () => set({
    buzzOrder: [],
    buzzedPlayer: null,
    status: 'question'
  }),

  markQuestionAnswered: (questionId) => set((state) => {
    if (!state.board) return state;

    const newBoard: GameBoard = {
      categories: state.board.categories.map((cat) => ({
        ...cat,
        questions: cat.questions.map((q) =>
          q.id === questionId ? { ...q, isAnswered: true } : q
        )
      }))
    };

    // Check if all questions are answered
    const allAnswered = newBoard.categories.every(cat =>
      cat.questions.every(q => q.isAnswered)
    );

    return {
      board: newBoard,
      currentQuestion: null,
      status: allAnswered ? 'finished' : 'playing'
    };
  }),

  setSelectedCategories: (categories) => set({ selectedCategories: categories }),

  initializeBoard: (categoryIds) => {
    const categories: Category[] = categoryIds.map((catId) => {
      const catDef = CATEGORY_DEFINITIONS.find(c => c.id === catId);
      return {
        id: catId,
        name: catDef?.name || catId,
        description: catDef?.description || '',
        questions: getQuestionsForCategory(catId)
      };
    });

    set({
      board: { categories },
      status: 'playing',
      selectedCategories: categoryIds
    });
  },

  resetGame: () => set({
    ...initialState,
    roomCode: get().roomCode,
    players: get().players.map(p => ({ ...p, score: 0 })),
    hostId: get().hostId
  }),

  updateGameState: (newState) => set((state) => ({ ...state, ...newState })),
}));

// Generate a random room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
