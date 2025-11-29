import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from './components/Card';
import Modal from './components/Modal';
import { CardType, GameMode, GameState, ICONS } from './types';
import { audio } from './services/audioService';

const LEVELS_STORAGE_KEY = 'neon_memory_levels_progress';

// Function to calculate grid size based on pair count
const getGridClass = (totalCards: number) => {
  if (totalCards <= 16) return 'grid-cols-4'; // 4x4
  if (totalCards <= 20) return 'grid-cols-4 md:grid-cols-5'; // 5x4
  if (totalCards <= 24) return 'grid-cols-4 md:grid-cols-6'; // 6x4
  if (totalCards <= 30) return 'grid-cols-5 md:grid-cols-6'; // 6x5
  return 'grid-cols-6';
};

const App: React.FC = () => {
  // State
  // Initialize levels directly from storage to prevent overwriting on initial render
  const [levels, setLevels] = useState<{normal: number, infinite: number}>(() => {
    try {
      const savedLevels = localStorage.getItem(LEVELS_STORAGE_KEY);
      if (savedLevels) {
        return JSON.parse(savedLevels);
      }
      // Legacy fallback
      const oldLevel = localStorage.getItem('neon_memory_level');
      if (oldLevel) {
        const lvl = parseInt(oldLevel, 10);
        return { normal: lvl, infinite: lvl };
      }
    } catch (e) {
      console.error("Failed to parse levels from storage", e);
    }
    return { normal: 1, infinite: 1 };
  });

  const [cards, setCards] = useState<CardType[]>([]);
  const [flippedCards, setFlippedCards] = useState<CardType[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [mode, setMode] = useState<GameMode>('normal');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  
  // Timer ref for handling mismatch auto-flip
  const mismatchTimerRef = useRef<any>(null);

  // Debug Modal State
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);
  const [skipPassword, setSkipPassword] = useState<string>('');
  const [targetSkipLevel, setTargetSkipLevel] = useState<string>('');
  const [skipError, setSkipError] = useState<string>('');

  // Save levels to storage whenever they change
  useEffect(() => {
    localStorage.setItem(LEVELS_STORAGE_KEY, JSON.stringify(levels));
  }, [levels]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
    };
  }, []);

  // Generate Cards for current level
  const startLevel = useCallback((targetLevel: number, targetMode: GameMode) => {
    // Clear any pending flip-backs
    if (mismatchTimerRef.current) {
      clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = null;
    }

    // Determine difficulty
    // Level 1: 4 pairs (8 cards)
    // Level 2: 6 pairs (12 cards)
    // Level 3: 8 pairs (16 cards)
    // Increases by 2 pairs every level, max capped by available icons
    let numPairs = 4 + (targetLevel - 1) * 2;
    if (numPairs > ICONS.length) numPairs = ICONS.length; // Cap at max icons
    
    // Select icons
    const selectedIcons = ICONS.slice(0, numPairs);
    const cardPairs: Partial<CardType>[] = [];
    
    selectedIcons.forEach((icon, index) => {
      // Generate a unique vibrant gradient for this pair based on HSL
      const hue = Math.floor((index / selectedIcons.length) * 360);
      const color = `linear-gradient(135deg, hsl(${hue}, 85%, 60%), hsl(${hue + 40}, 90%, 35%))`;
      
      // Push pair
      cardPairs.push({ icon, color });
      cardPairs.push({ icon, color });
    });
    
    // Shuffle
    const shuffled = cardPairs
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({
        id: index,
        icon: item.icon!,
        color: item.color!,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(shuffled);
    setFlippedCards([]);
    setMatchedPairs(0);
    setGameState('playing');
    setMode(targetMode);
    setIsPaused(false);
    
    // Timer calculation
    if (targetMode === 'normal') {
      setTimeLeft(20 + numPairs * 3);
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && mode === 'normal' && !isPaused) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('lost');
            audio.playError();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, mode, isPaused]);

  // Check Win Condition
  useEffect(() => {
    if (gameState === 'playing' && matchedPairs > 0 && matchedPairs === cards.length / 2) {
      audio.playWin();
      setTimeout(() => {
        setGameState('won');
      }, 500);
    }
  }, [matchedPairs, cards.length, gameState]);

  // Card Click Handler
  const handleCardClick = (card: CardType) => {
    // Basic guards
    if (isPaused || card.isFlipped || card.isMatched) return;

    // Fast-Play Logic:
    // If there are 2 flipped cards (mismatch waiting to close), clicking a 3rd card
    // immediately closes the previous pair and opens the new one.
    if (flippedCards.length === 2) {
      if (mismatchTimerRef.current) {
        clearTimeout(mismatchTimerRef.current);
        mismatchTimerRef.current = null;
      }
      
      // Close the previous pair, open the new card
      setCards((prev) => prev.map((c) => {
        // Unflip the mismatched pair
        if (c.id === flippedCards[0].id || c.id === flippedCards[1].id) {
          return { ...c, isFlipped: false };
        }
        // Flip the new card
        if (c.id === card.id) {
          return { ...c, isFlipped: true };
        }
        return c;
      }));

      setFlippedCards([card]);
      audio.playClick();
      return;
    }

    // Normal flip logic (0 or 1 card currently flipped)
    const newCards = cards.map((c) => 
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);
    
    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);
    audio.playClick();

    // Check Match
    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;

      if (first.icon === second.icon) {
        // MATCH FOUND
        audio.playMatch();
        // Register match immediately - no delay
        setCards((prev) => 
          prev.map((c) => 
            (c.id === first.id || c.id === second.id) ? { ...c, isMatched: true, isFlipped: true } : c
          )
        );
        setMatchedPairs((prev) => prev + 1);
        setFlippedCards([]);
      } else {
        // MISMATCH
        // Set a timer to flip back, but allow the user to interrupt it by clicking another card
        mismatchTimerRef.current = setTimeout(() => {
          setCards((prev) => 
            prev.map((c) => 
              (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
          mismatchTimerRef.current = null;
        }, 1000); // 1s visual duration if not interrupted
      }
    }
  };

  const handleNextLevel = () => {
    const nextLevel = levels[mode] + 1;
    setLevels((prev) => ({...prev, [mode]: nextLevel}));
    startLevel(nextLevel, mode);
  };

  const handleRetry = () => {
    startLevel(levels[mode], mode);
  };

  const handleResetClick = () => {
    audio.playClick();
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current);
    setLevels({ normal: 1, infinite: 1 });
    localStorage.removeItem(LEVELS_STORAGE_KEY);
    setGameState('menu');
    setShowResetConfirm(false);
    audio.playClick();
  };

  const handleSkipSubmit = () => {
    if (skipPassword === '134567') {
      const targetLvl = parseInt(targetSkipLevel);
      
      if (!isNaN(targetLvl) && targetLvl > 0) {
        setSkipPassword('');
        setTargetSkipLevel('');
        setSkipError('');
        setShowSkipModal(false);
        setLevels(prev => ({ ...prev, [mode]: targetLvl }));
        startLevel(targetLvl, mode);
      } else {
        setSkipError('Invalid Level Number');
        audio.playError();
      }
    } else {
      setSkipError('Access Denied: Invalid Password');
      audio.playError();
    }
  };

  const openSkipModal = () => {
    setTargetSkipLevel((levels[mode] + 1).toString());
    setShowSkipModal(true);
  };

  // Render Helpers
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center z-10 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-layer-group text-3xl text-cyan-400"></i>
          <div>
            <h1 className="font-tech text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              NEON FLIP
            </h1>
            <span className="text-xs text-slate-400 tracking-wider">MEMORY PROTOCOL</span>
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-slate-400 uppercase">Level</span>
              <span className="font-tech text-xl text-yellow-400">{levels[mode]}</span>
            </div>
            {mode === 'normal' && (
               <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-slate-400 uppercase">Time</span>
                <span className={`font-tech text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <button 
                onClick={() => setIsPaused(true)}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-cyan-400 transition-colors"
                title="Pause / Home"
            >
                <i className="fa-solid fa-pause"></i>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        {gameState === 'menu' && (
          <div className="text-center space-y-8 animate-[fadeIn_0.5s_ease-out]">
             <div className="inline-block p-8 rounded-full bg-slate-800/50 border border-slate-700 shadow-[0_0_50px_rgba(79,70,229,0.3)] mb-4">
                <i className="fa-solid fa-brain text-6xl text-indigo-400"></i>
             </div>
             <h2 className="text-4xl md:text-6xl font-tech font-bold text-white mb-2">
               READY TO START?
             </h2>
             <div className="flex gap-4 justify-center text-sm text-slate-400">
                <p>Normal Level: <span className="text-yellow-400 font-bold">{levels.normal}</span></p>
                <p>|</p>
                <p>Infinite Level: <span className="text-cyan-400 font-bold">{levels.infinite}</span></p>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
               <button 
                 onClick={() => startLevel(levels.normal, 'normal')}
                 onMouseEnter={() => audio.playHover()}
                 className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(219,39,119,0.4)] hover:scale-105 transition-all"
               >
                 <i className="fa-solid fa-stopwatch mr-2"></i> NORMAL MODE
               </button>
               <button 
                 onClick={() => startLevel(levels.infinite, 'infinite')}
                 onMouseEnter={() => audio.playHover()}
                 className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(8,145,178,0.4)] hover:scale-105 transition-all"
               >
                 <i className="fa-solid fa-infinity mr-2"></i> INFINITE MODE
               </button>
             </div>
             
             <div className="mt-12">
               <button 
                 onClick={handleResetClick}
                 className="text-slate-500 hover:text-red-400 text-sm transition-colors"
               >
                 Reset All Progress
               </button>
             </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className={`w-full max-w-5xl mx-auto ${isPaused ? 'blur-sm pointer-events-none' : ''}`}>
            {/* Mobile Stats Display */}
             <div className="flex justify-between sm:hidden mb-4 px-2">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 uppercase">Level</span>
                  <span className="font-tech text-xl text-yellow-400">{levels[mode]}</span>
                </div>
                {mode === 'normal' && (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400 uppercase">Time</span>
                    <span className={`font-tech text-xl ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
             </div>

            <div className={`grid gap-3 sm:gap-4 ${getGridClass(cards.length)} auto-rows-fr`}>
              {cards.map((card) => (
                <Card 
                  key={card.id} 
                  card={card} 
                  onClick={handleCardClick} 
                  disabled={isPaused}
                />
              ))}
            </div>
            
            <div className="mt-8 flex justify-center">
               <button 
                 onClick={openSkipModal}
                 className="text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
               >
                 <i className="fa-solid fa-bug"></i> DEBUG MENU
               </button>
            </div>
          </div>
        )}

      </main>

      {/* Modals */}
      {isPaused && (
        <Modal 
            title="GAME PAUSED" 
            actionLabel="Resume Game" 
            onAction={() => setIsPaused(false)}
            secondaryLabel="Back to Menu"
            onSecondary={() => {
              setIsPaused(false);
              setGameState('menu');
            }}
        >
            <div className="text-center">
                <i className="fa-solid fa-pause text-5xl text-cyan-400 mb-4"></i>
                <p>System frozen. Awaiting input.</p>
            </div>
        </Modal>
      )}

      {showResetConfirm && (
        <Modal 
            title="FACTORY RESET" 
            actionLabel="Confirm Wipe" 
            onAction={confirmReset}
            secondaryLabel="Cancel"
            onSecondary={() => setShowResetConfirm(false)}
        >
            <div className="flex flex-col items-center text-center">
                <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4"></i>
                <p className="font-bold text-white mb-2">WARNING: IRREVERSIBLE ACTION</p>
                <p className="text-slate-400">All progress in Normal and Infinite modes will be lost permanently.</p>
            </div>
        </Modal>
      )}

      {gameState === 'won' && (
        <Modal 
          title="LEVEL COMPLETE!" 
          actionLabel="Next Level" 
          onAction={handleNextLevel}
          secondaryLabel="Menu"
          onSecondary={() => setGameState('menu')}
        >
          <div className="flex flex-col items-center">
            <i className="fa-solid fa-trophy text-5xl text-yellow-400 mb-4 animate-bounce"></i>
            <p>System sync achieved. Data recovered.</p>
            <p className="text-sm mt-2 text-slate-500">Proceeding to Level {levels[mode] + 1}</p>
          </div>
        </Modal>
      )}

      {gameState === 'lost' && (
        <Modal 
          title="SYSTEM FAILURE" 
          actionLabel="Try Again" 
          onAction={handleRetry}
          secondaryLabel="Menu"
          onSecondary={() => setGameState('menu')}
        >
          <div className="flex flex-col items-center">
            <i className="fa-solid fa-skull-crossbones text-5xl text-red-500 mb-4 animate-pulse"></i>
            <p>Time limit exceeded. Connection severed.</p>
          </div>
        </Modal>
      )}

      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-tech font-bold text-white mb-4 flex items-center gap-2">
              <i className="fa-solid fa-user-secret text-red-500"></i> ADMIN OVERRIDE
            </h2>
            <p className="text-slate-400 mb-4 text-sm">Enter security code and target level.</p>
            
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">ACCESS CODE</label>
                <input 
                  type="password" 
                  value={skipPassword}
                  onChange={(e) => setSkipPassword(e.target.value)}
                  placeholder="******"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
              
              <div>
                 <label className="text-xs text-slate-500 block mb-1">TARGET LEVEL</label>
                 <input 
                  type="number"
                  min="1"
                  value={targetSkipLevel}
                  onChange={(e) => setTargetSkipLevel(e.target.value)}
                  placeholder="Enter Level"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {skipError && <p className="text-red-500 text-xs mb-4">{skipError}</p>}
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSkipSubmit}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all"
              >
                JUMP
              </button>
              <button
                onClick={() => { setShowSkipModal(false); setSkipPassword(''); setSkipError(''); }}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;