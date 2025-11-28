'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/gameStore';
import { getPusherClient, getGameChannel, GAME_EVENTS } from '@/lib/pusher';
import { Player, Question, GameBoard } from '@/types/game';
import JeopardyBoard from '@/components/JeopardyBoard';
import QuestionModal from '@/components/QuestionModal';
import Scoreboard from '@/components/Scoreboard';
import CategorySelector from '@/components/CategorySelector';
import Lobby from '@/components/Lobby';
import BuzzerButton from '@/components/BuzzerButton';
import { getQuestionsForCategory, CATEGORY_DEFINITIONS } from '@/data/categories';

export default function GameRoom() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;

  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [canBuzz, setCanBuzz] = useState(false);

  const {
    status,
    players,
    board,
    currentQuestion,
    buzzedPlayer,
    hostId,
    setRoomCode,
    setHostId,
    addPlayer,
    removePlayer,
    updatePlayerScore,
    setStatus,
    setBoard,
    selectQuestion,
    playerBuzz,
    resetBuzz,
    markQuestionAnswered,
    initializeBoard,
    updateGameState,
  } = useGameStore();

  // Initialize player from sessionStorage
  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('playerId');
    const storedPlayerName = sessionStorage.getItem('playerName');
    const storedIsHost = sessionStorage.getItem('isHost') === 'true';

    if (!storedPlayerId || !storedPlayerName) {
      router.push('/');
      return;
    }

    setPlayerId(storedPlayerId);
    setPlayerName(storedPlayerName);
    setIsHost(storedIsHost);
    setRoomCode(roomCode);

    if (storedIsHost) {
      setHostId(storedPlayerId);
    }

    // Add self as player
    const player: Player = {
      id: storedPlayerId,
      name: storedPlayerName,
      score: 0,
      isHost: storedIsHost,
    };
    addPlayer(player);
  }, [roomCode, router, setRoomCode, setHostId, addPlayer]);

  // Broadcast game event to other players (simulated - in production use Pusher)
  const broadcastEvent = useCallback(async (event: string, data: unknown) => {
    try {
      await fetch('/api/game/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, event, data }),
      });
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }, [roomCode]);

  // For demo purposes without Pusher, we'll use local state
  // In production, uncomment the Pusher subscription below

  /*
  useEffect(() => {
    if (!playerId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getGameChannel(roomCode));

    channel.bind(GAME_EVENTS.PLAYER_JOINED, (data: Player) => {
      addPlayer(data);
    });

    channel.bind(GAME_EVENTS.PLAYER_LEFT, (data: { playerId: string }) => {
      removePlayer(data.playerId);
    });

    channel.bind(GAME_EVENTS.GAME_STARTED, (data: { board: GameBoard }) => {
      setBoard(data.board);
      setStatus('playing');
    });

    channel.bind(GAME_EVENTS.QUESTION_SELECTED, (data: { question: Question }) => {
      selectQuestion(data.question);
      setCanBuzz(true);
    });

    channel.bind(GAME_EVENTS.PLAYER_BUZZED, (data: { playerId: string; time: number }) => {
      playerBuzz(data.playerId, data.time);
      setCanBuzz(false);
    });

    channel.bind(GAME_EVENTS.ANSWER_JUDGED, (data: { playerId: string; correct: boolean; newScore: number }) => {
      updatePlayerScore(data.playerId, data.newScore);
    });

    channel.bind(GAME_EVENTS.QUESTION_CLOSED, (data: { questionId: string }) => {
      markQuestionAnswered(data.questionId);
      setShowAnswer(false);
      setCanBuzz(false);
    });

    channel.bind(GAME_EVENTS.REVEAL_ANSWER, () => {
      setShowAnswer(true);
    });

    channel.bind(GAME_EVENTS.BUZZ_RESET, () => {
      resetBuzz();
      setCanBuzz(true);
    });

    setIsConnected(true);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getGameChannel(roomCode));
    };
  }, [playerId, roomCode]);
  */

  // Simulated connection for demo
  useEffect(() => {
    setIsConnected(true);
  }, []);

  // Handle category selection and game start
  const handleStartGame = (categoryIds: string[]) => {
    initializeBoard(categoryIds);
    broadcastEvent(GAME_EVENTS.GAME_STARTED, { categoryIds });
  };

  // Handle question selection
  const handleSelectQuestion = (question: Question) => {
    selectQuestion(question);
    setCanBuzz(true);
    setShowAnswer(false);
    broadcastEvent(GAME_EVENTS.QUESTION_SELECTED, { question });
  };

  // Handle player buzz
  const handleBuzz = () => {
    if (!canBuzz || buzzedPlayer) return;
    const time = Date.now();
    playerBuzz(playerId, time);
    setCanBuzz(false);
    broadcastEvent(GAME_EVENTS.PLAYER_BUZZED, { playerId, time });
  };

  // Handle answer judgment (host only)
  const handleJudge = (correct: boolean) => {
    if (!buzzedPlayer || !currentQuestion) return;

    const pointChange = correct ? currentQuestion.value : -currentQuestion.value;
    const newScore = buzzedPlayer.score + pointChange;
    updatePlayerScore(buzzedPlayer.id, newScore);

    broadcastEvent(GAME_EVENTS.ANSWER_JUDGED, {
      playerId: buzzedPlayer.id,
      correct,
      newScore,
    });

    if (correct) {
      // Close question after correct answer
      handleCloseQuestion();
    } else {
      // Reset buzz for other players to try
      resetBuzz();
      setCanBuzz(true);
      broadcastEvent(GAME_EVENTS.BUZZ_RESET, {});
    }
  };

  // Handle reveal answer
  const handleRevealAnswer = () => {
    setShowAnswer(true);
    broadcastEvent(GAME_EVENTS.REVEAL_ANSWER, {});
  };

  // Handle closing question
  const handleCloseQuestion = () => {
    if (!currentQuestion) return;
    markQuestionAnswered(currentQuestion.id);
    setShowAnswer(false);
    setCanBuzz(false);
    broadcastEvent(GAME_EVENTS.QUESTION_CLOSED, { questionId: currentQuestion.id });
  };

  // Loading state
  if (!isConnected || !playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-xl">Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 p-4">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-yellow-400">BIBLE JEOPARDY</h1>
            <p className="text-blue-300 text-sm">Room: {roomCode}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white">
              Playing as: <strong className="text-yellow-400">{playerName}</strong>
              {isHost && <span className="ml-2 text-xs bg-yellow-500 text-blue-900 px-2 py-0.5 rounded">HOST</span>}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Lobby State */}
        {status === 'lobby' && (
          <Lobby
            roomCode={roomCode}
            players={players}
            isHost={isHost}
            onStartCategorySelect={() => setStatus('category-select')}
          />
        )}

        {/* Category Selection (Host Only) */}
        {status === 'category-select' && isHost && (
          <CategorySelector
            onStartGame={handleStartGame}
            onCancel={() => setStatus('lobby')}
          />
        )}

        {/* Waiting for host to select categories */}
        {status === 'category-select' && !isHost && (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <p className="text-2xl text-white">Host is selecting categories...</p>
            </div>
          </div>
        )}

        {/* Game Playing State */}
        {(status === 'playing' || status === 'question' || status === 'buzzing') && board && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Board */}
            <div className="lg:col-span-3">
              <JeopardyBoard
                board={board}
                onSelectQuestion={handleSelectQuestion}
                isHost={isHost}
                disabled={status !== 'playing'}
              />
            </div>

            {/* Sidebar - Scoreboard */}
            <div className="lg:col-span-1">
              <Scoreboard players={players} hostId={hostId} />
            </div>
          </div>
        )}

        {/* Game Finished */}
        {status === 'finished' && (
          <div className="text-center py-12">
            <h2 className="text-4xl font-bold text-yellow-400 mb-6">Game Over!</h2>
            <Scoreboard players={players} hostId={hostId} />
            {isHost && (
              <button
                onClick={() => {
                  setStatus('lobby');
                  // Reset all player scores
                  players.forEach(p => updatePlayerScore(p.id, 0));
                }}
                className="mt-6 px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold rounded-xl"
              >
                Play Again
              </button>
            )}
          </div>
        )}
      </main>

      {/* Question Modal */}
      {currentQuestion && (status === 'question' || status === 'buzzing') && (
        <QuestionModal
          question={currentQuestion}
          buzzedPlayer={buzzedPlayer}
          isHost={isHost}
          showAnswer={showAnswer}
          onBuzz={handleBuzz}
          onJudge={handleJudge}
          onRevealAnswer={handleRevealAnswer}
          onClose={handleCloseQuestion}
          canBuzz={canBuzz && !buzzedPlayer}
          playerId={playerId}
        />
      )}

      {/* Buzzer for non-host players (shows at bottom of screen during questions) */}
      {!isHost && (status === 'question' || status === 'buzzing') && !currentQuestion && (
        <BuzzerButton
          onBuzz={handleBuzz}
          disabled={!canBuzz || !!buzzedPlayer}
          buzzedPlayerName={buzzedPlayer?.name}
          isCurrentBuzzer={buzzedPlayer?.id === playerId}
        />
      )}
    </div>
  );
}
