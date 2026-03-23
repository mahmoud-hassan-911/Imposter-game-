/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  UserPlus, 
  X, 
  EyeOff, 
  AlertCircle,
  Trophy,
  RotateCcw,
  ChevronRight,
  User,
  Settings,
  Plus,
  Trash2,
  ChevronLeft,
  Ghost,
  Check,
  Minus,
  Tags,
  Rocket,
  MessageCircle,
  CheckSquare,
  HelpCircle,
  Search,
  XCircle,
  Skull,
  ArrowRight,
  PartyPopper
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Player, GamePhase, Word, Category, Punishment } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_PUNISHMENTS } from './constants';
import { playClick, playSuccess, playFail, playReveal } from './utils/sound';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  // Persistence
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('spy_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old data structure (pairs -> words)
        return parsed.map((cat: any) => {
          if (cat.pairs && !cat.words) {
            return {
              id: cat.id,
              name: cat.name,
              isCustom: cat.isCustom,
              words: cat.pairs.map((p: any) => ({ id: p.id, text: p.citizen }))
            };
          }
          return {
            ...cat,
            words: cat.words || []
          };
        });
      }
    } catch (e) {
      console.error('Failed to parse categories', e);
    }
    return DEFAULT_CATEGORIES;
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('spy_players');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [spyCount, setSpyCount] = useState(1);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [isWordVisible, setIsWordVisible] = useState(false);
  const [winner, setWinner] = useState<'citizens' | 'spy' | null>(null);

  // New Question & Voting State
  const [discussionMode, setDiscussionMode] = useState<'open' | 'directed'>(() => {
    return (localStorage.getItem('spy_discussion_mode') as 'open' | 'directed') || 'directed';
  });
  const [questionPairs, setQuestionPairs] = useState<{asker: Player, answerer: Player}[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [currentVoterSelections, setCurrentVoterSelections] = useState<string[]>([]);
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [showVoterPrompt, setShowVoterPrompt] = useState(true);

  // Category Management State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newWordText, setNewWordText] = useState('');

  // Punishment State
  const [punishments, setPunishments] = useState<Punishment[]>(() => {
    try {
      const saved = localStorage.getItem('spy_punishments');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PUNISHMENTS;
  });
  const [punishmentMode, setPunishmentMode] = useState<'random' | 'players'>(() => {
    return (localStorage.getItem('spy_punishment_mode') as 'random' | 'players') || 'random';
  });
  const [spyGuessOptions, setSpyGuessOptions] = useState<Word[]>([]);
  const [selectedPunishment, setSelectedPunishment] = useState<Punishment | null>(null);
  const [guessingSpy, setGuessingSpy] = useState<Player | null>(null);
  const [spiesToGuess, setSpiesToGuess] = useState<Player[]>([]);
  const [accusedPlayers, setAccusedPlayers] = useState<Player[]>([]);
  const [settingsTab, setSettingsTab] = useState<'categories' | 'punishments'>('categories');
  const [newPunishmentText, setNewPunishmentText] = useState('');

  useEffect(() => {
    localStorage.setItem('spy_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('spy_punishments', JSON.stringify(punishments));
  }, [punishments]);

  useEffect(() => {
    localStorage.setItem('spy_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    const maxSpies = Math.max(1, Math.floor(players.length / 3));
    if (spyCount > maxSpies && players.length > 0) {
      setSpyCount(maxSpies);
    }
  }, [players.length]);

  const addPlayer = () => {
    playClick();
    if (newPlayerName.trim() && players.length < 12) {
      setPlayers([
        ...players,
        {
          id: Math.random().toString(36).substr(2, 9),
          name: newPlayerName.trim(),
          role: 'citizen',
          word: '',
          isEliminated: false,
        },
      ]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (id: string) => {
    playClick();
    setPlayers(players.filter((p) => p.id !== id));
  };

  const toggleCategory = (id: string) => {
    playClick();
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const startGame = () => {
    playClick();
    if (selectedCategoryIds.length === 0) return;
    
    const combinedWords = categories
      .filter(c => selectedCategoryIds.includes(c.id))
      .flatMap(c => c.words);
      
    if (combinedWords.length === 0) return;

    const wordObj = combinedWords[Math.floor(Math.random() * combinedWords.length)];
    setCurrentWord(wordObj);

    // Assign roles
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const spyIds = shuffled.slice(0, spyCount).map(p => p.id);
    
    const updatedPlayers = players.map((p) => {
      const isSpy = spyIds.includes(p.id);
      return { 
        ...p, 
        role: isSpy ? 'spy' : 'citizen', 
        word: isSpy ? 'أنت الجاسوس' : wordObj.text,
        isEliminated: false 
      };
    });

    setPlayers(updatedPlayers);
    setPhase('role-reveal');
    setRevealIndex(0);
    setIsWordVisible(false);
  };

  const startQuestionPhase = (currentPlayers: Player[]) => {
    const active = currentPlayers.filter(p => !p.isEliminated);
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    const pairs = shuffled.map((p, i) => ({
      asker: p,
      answerer: shuffled[(i + 1) % shuffled.length]
    }));
    setQuestionPairs(pairs);
    setCurrentQuestionIndex(0);
    setPhase('describe');
  };

  const nextReveal = () => {
    if (revealIndex < players.length - 1) {
      setRevealIndex(revealIndex + 1);
      setIsWordVisible(false);
    } else {
      if (discussionMode === 'directed') {
        startQuestionPhase(players);
      } else {
        setPhase('describe');
      }
    }
  };

  const toggleSelection = (suspectId: string) => {
    setCurrentVoterSelections(prev => 
      prev.includes(suspectId) 
        ? prev.filter(id => id !== suspectId)
        : prev.length < spyCount 
          ? [...prev, suspectId] 
          : prev
    );
  };

  const confirmVote = () => {
    const activePlayers = players.filter(p => !p.isEliminated);
    const currentVoter = activePlayers[currentVoterIndex];
    
    const newVotes = { ...votes, [currentVoter.id]: currentVoterSelections };
    setVotes(newVotes);
    setCurrentVoterSelections([]);

    if (currentVoterIndex < activePlayers.length - 1) {
      setCurrentVoterIndex(currentVoterIndex + 1);
      setShowVoterPrompt(true);
    } else {
      resolveVotesInline(newVotes);
    }
  };

  const resolveVotesInline = (finalVotes: Record<string, string[]>) => {
    const tally: Record<string, number> = {};
    Object.values(finalVotes).flat().forEach(votedId => {
      tally[votedId] = (tally[votedId] || 0) + 1;
    });

    const sortedCandidates = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const thresholdVoteCount = sortedCandidates[Math.min(spyCount, sortedCandidates.length) - 1]?.[1] || 0;
    
    const eliminatedIds = sortedCandidates
      .filter(([id, count]) => count >= thresholdVoteCount)
      .map(([id]) => id);

    const accused = players.filter(p => eliminatedIds.includes(p.id));
    setAccusedPlayers(accused);
    
    const allSpies = players.filter(p => p.role === 'spy');
    setSpiesToGuess(allSpies);
    
    setPhase('reveal-spies');
  };

  const resetGame = () => {
    setPhase('setup');
    setWinner(null);
    setPlayers(players.map(p => ({ ...p, isEliminated: false })));
    setAccusedPlayers([]);
    setSpiesToGuess([]);
    setCurrentWord(null);
    setRevealIndex(0);
    setIsWordVisible(false);
    setQuestionPairs([]);
    setCurrentQuestionIndex(0);
    setVotes({});
    setCurrentVoterSelections([]);
    setCurrentVoterIndex(0);
    setShowVoterPrompt(true);
    setGuessingSpy(null);
    setSelectedPunishment(null);
  };

  // Category Management Logic
  const addNewCategory = () => {
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'تصنيف جديد',
      words: [],
      isCustom: true
    };
    setCategories([...categories, newCat]);
    setEditingCategory(newCat);
  };

  const updateCategoryName = (name: string) => {
    if (!editingCategory) return;
    const updated = { ...editingCategory, name };
    setEditingCategory(updated);
    setCategories(categories.map(c => c.id === updated.id ? updated : c));
  };

  const addWord = () => {
    if (!editingCategory || !newWordText.trim()) return;
    const newWord: Word = {
      id: Math.random().toString(36).substr(2, 9),
      text: newWordText.trim()
    };
    const updated = { ...editingCategory, words: [...editingCategory.words, newWord] };
    setEditingCategory(updated);
    setCategories(categories.map(c => c.id === updated.id ? updated : c));
    setNewWordText('');
  };

  const deleteWord = (wordId: string) => {
    if (!editingCategory) return;
    const updatedWords = editingCategory.words.filter(w => w.id !== wordId);
    const updated = { ...editingCategory, words: updatedWords };
    setEditingCategory(updated);
    setCategories(categories.map(c => c.id === updated.id ? updated : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    if (editingCategory?.id === id) setEditingCategory(null);
  };

  const addPunishment = () => {
    if (!newPunishmentText.trim()) return;
    const newPunishment: Punishment = {
      id: Math.random().toString(36).substr(2, 9),
      text: newPunishmentText.trim(),
      isCustom: true
    };
    setPunishments([...punishments, newPunishment]);
    setNewPunishmentText('');
  };

  const deletePunishment = (id: string) => {
    setPunishments(punishments.filter(p => p.id !== id));
  };

  const startSpyGuessPhase = (spyPlayer: Player) => {
    const possibleWords = categories
      .filter(c => selectedCategoryIds.includes(c.id))
      .flatMap(c => c.words);
    
    let options = [...possibleWords];
    if (options.length > 5) {
        const others = options.filter(w => w.id !== currentWord?.id).sort(() => Math.random() - 0.5).slice(0, 4);
        options = [currentWord!, ...others].sort(() => Math.random() - 0.5);
    } else {
        options = options.sort(() => Math.random() - 0.5);
    }
    
    setGuessingSpy(spyPlayer);
    setSpyGuessOptions(options);
    setPhase('spy-guess');
  };

  const handleSpyGuess = (wordId: string) => {
    setSpiesToGuess(prev => prev.filter(s => s.id !== guessingSpy?.id));
    if (wordId === currentWord?.id) {
      playFail(); // Spy wins
      setWinner('spy');
      setPhase('result');
    } else {
      startPunishmentPhase();
    }
  };

  const startPunishmentPhase = () => {
    if (punishmentMode === 'random' && punishments.length > 0) {
      const randomPunishment = punishments[Math.floor(Math.random() * punishments.length)];
      setSelectedPunishment(randomPunishment);
    } else {
      setSelectedPunishment(null);
    }
    setPhase('punishment');
    playFail();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 dir-rtl font-sans" dir="rtl">
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div 
                className="inline-block mb-2"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
              >
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="الجاسوس" className="w-64 h-auto mx-auto drop-shadow-2xl" />
              </motion.div>
              <p className="text-slate-500 font-bold text-lg">لعبة الأصحاب واللمة الحلوة</p>
            </div>

            <div className="card-chunky space-y-6">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                  placeholder="اسم اللاعب..."
                  className="input-chunky w-full pr-4 pl-16 py-4 text-lg"
                />
                <button 
                  onClick={addPlayer} 
                  className="absolute left-2 w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-400 active:scale-95 transition-all shadow-sm"
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              </div>

              {players.length >= 4 && (
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                  <span className="font-bold text-slate-700">عدد الجواسيس:</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSpyCount(Math.max(1, spyCount - 1))}
                      className="w-10 h-10 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-600 active:scale-95"
                    >
                      <Minus size={20} strokeWidth={3} />
                    </button>
                    <span className="font-black text-xl w-4 text-center">{spyCount}</span>
                    <button 
                      onClick={() => setSpyCount(Math.min(Math.max(1, Math.floor(players.length / 3)), spyCount + 1))}
                      className="w-10 h-10 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-slate-600 active:scale-95"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={20} strokeWidth={3} />
                      </div>
                      <span className="font-black text-lg text-slate-700">{player.name}</span>
                    </div>
                    <button onClick={() => removePlayer(player.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                      <Trash2 size={20} strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ))}
                {players.length === 0 && (
                  <div className="text-center py-8 text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    ضيف 3 لاعبين على الأقل عشان نبدأ
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  disabled={players.length < 3}
                  onClick={() => setPhase('category-select')}
                  className={cn(
                    "flex-1 py-4 text-xl",
                    players.length >= 3 ? "btn-chunky btn-primary" : "btn-chunky bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  )}
                >
                  <Play size={24} fill="currentColor" />
                  اختار التصنيف
                </button>
                <button 
                  onClick={() => setPhase('manage-categories')}
                  className="btn-chunky btn-secondary px-5"
                >
                  <Settings size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'category-select' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md space-y-6 pb-24"
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setPhase('setup')} className="btn-chunky btn-secondary p-3">
                <ChevronLeft size={24} strokeWidth={3} />
              </button>
              <h2 className="text-3xl font-black text-slate-900 flex items-center justify-center gap-2">
                اختار التصنيفات <Tags className="text-indigo-500" size={32} />
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    disabled={cat.words.length === 0}
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "card-chunky p-6 text-right group transition-all flex items-center justify-between active:scale-[0.98]",
                      cat.words.length === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      isSelected ? "border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-500/20" : "hover:border-indigo-300"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="text-2xl font-black text-slate-800">{cat.name}</div>
                      <div className="text-base font-bold text-slate-500">{cat.words.length} كلمة</div>
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-300"
                    )}>
                      {isSelected && <Check size={24} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-amber-50 via-amber-50 to-transparent pb-6 z-10">
              <div className="max-w-md mx-auto">
                <button
                  disabled={selectedCategoryIds.length === 0}
                  onClick={startGame}
                  className={cn(
                    "w-full py-5 text-2xl shadow-xl",
                    selectedCategoryIds.length > 0 ? "btn-chunky btn-primary" : "btn-chunky bg-slate-200 text-slate-400 shadow-none opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="flex items-center justify-center gap-2">يلا نبدأ! <Rocket size={24} /></span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'manage-categories' && (
          <motion.div
            key="manage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => { setPhase('setup'); setEditingCategory(null); }} className="btn-chunky btn-secondary p-3">
                  <ChevronLeft size={24} strokeWidth={3} />
                </button>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">الإعدادات <Settings className="text-slate-500" size={24} /></h2>
              </div>
              {settingsTab === 'categories' && !editingCategory && (
                <button onClick={addNewCategory} className="btn-chunky btn-primary px-4 py-2 text-sm">
                  <Plus size={20} strokeWidth={3} /> تصنيف جديد
                </button>
              )}
            </div>

            {!editingCategory ? (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pb-8">
                <div className="card-chunky p-5 space-y-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Settings size={24} className="text-indigo-500"/> إعدادات اللعبة
                  </h3>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-400 uppercase">طريقة النقاش</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setDiscussionMode('directed'); localStorage.setItem('spy_discussion_mode', 'directed'); }}
                        className={cn("flex-1 py-3 rounded-xl font-bold border-2 transition-all", discussionMode === 'directed' ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}
                      >
                        أسئلة موجهة
                      </button>
                      <button 
                        onClick={() => { setDiscussionMode('open'); localStorage.setItem('spy_discussion_mode', 'open'); }}
                        className={cn("flex-1 py-3 rounded-xl font-bold border-2 transition-all", discussionMode === 'open' ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}
                      >
                        نقاش مفتوح
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <label className="text-sm font-black text-slate-400 uppercase">طريقة الحكم على الجاسوس</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setPunishmentMode('random'); localStorage.setItem('spy_punishment_mode', 'random'); }}
                        className={cn("flex-1 py-3 rounded-xl font-bold border-2 transition-all", punishmentMode === 'random' ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}
                      >
                        عشوائي
                      </button>
                      <button 
                        onClick={() => { setPunishmentMode('players'); localStorage.setItem('spy_punishment_mode', 'players'); }}
                        className={cn("flex-1 py-3 rounded-xl font-bold border-2 transition-all", punishmentMode === 'players' ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}
                      >
                        تصويت اللاعبين
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setSettingsTab('categories')}
                    className={cn("flex-1 py-3 rounded-xl font-black transition-all", settingsTab === 'categories' ? "bg-slate-800 text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                  >
                    التصنيفات
                  </button>
                  <button 
                    onClick={() => setSettingsTab('punishments')}
                    className={cn("flex-1 py-3 rounded-xl font-black transition-all", settingsTab === 'punishments' ? "bg-slate-800 text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                  >
                    الأحكام
                  </button>
                </div>

                {settingsTab === 'categories' && (
                  <div className="space-y-3">
                    {categories.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => setEditingCategory(cat)}
                      className="card-chunky p-5 cursor-pointer hover:border-indigo-300 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-black text-xl text-slate-800">{cat.name}</div>
                        <div className="text-sm font-bold text-slate-400">{cat.words.length} كلمة</div>
                      </div>
                      {cat.isCustom && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={20} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                    ))}
                  </div>
                )}

                {settingsTab === 'punishments' && (
                  <div className="space-y-3">
                    <div className="relative flex items-center mb-4">
                      <input 
                        placeholder="ضيف حكم جديد..."
                        value={newPunishmentText}
                        onChange={(e) => setNewPunishmentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addPunishment()}
                        className="input-chunky w-full pr-4 pl-14 py-3 text-base"
                      />
                      <button 
                        onClick={addPunishment} 
                        className="absolute left-2 w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-400 active:scale-95 transition-all shadow-sm"
                      >
                        <Plus size={24} strokeWidth={3} />
                      </button>
                    </div>
                    {punishments.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm">
                        <span className="font-bold text-lg text-slate-700 leading-tight">{p.text}</span>
                        {p.isCustom && (
                          <button onClick={() => deletePunishment(p.id)} className="text-slate-300 hover:text-rose-500 p-2 shrink-0">
                            <Trash2 size={20} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-chunky space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setEditingCategory(null)} className="btn-chunky btn-secondary p-2">
                    <ChevronLeft size={20} strokeWidth={3} />
                  </button>
                  <h3 className="text-xl font-black text-slate-800">تعديل التصنيف</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-400 uppercase">اسم التصنيف</label>
                  <input 
                    type="text" 
                    value={editingCategory.name}
                    onChange={(e) => updateCategoryName(e.target.value)}
                    className="input-chunky w-full text-xl"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-400 uppercase">الكلمات</label>
                  
                  <div className="relative flex items-center mb-4">
                    <input 
                      placeholder="ضيف كلمة جديدة..."
                      value={newWordText}
                      onChange={(e) => setNewWordText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addWord()}
                      className="input-chunky w-full pr-4 pl-14 py-3 text-base"
                    />
                    <button 
                      onClick={addWord} 
                      className="absolute left-2 w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-400 active:scale-95 transition-all shadow-sm"
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                    {editingCategory.words.map(word => (
                      <div key={word.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                        <span className="font-bold text-lg text-slate-700">{word.text}</span>
                        <button onClick={() => deleteWord(word.id)} className="text-slate-300 hover:text-rose-500 p-2">
                          <X size={20} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                    {editingCategory.words.length === 0 && (
                      <div className="text-center py-8 text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        مفيش كلمات لسه
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'role-reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900">دورك يا <span className="text-indigo-600">{players[revealIndex].name}</span></h2>
              <p className="text-slate-500 font-bold text-lg">دوس عشان تشوف كلمتك، وخبيها عن الباقي!</p>
            </div>

            <div 
              onClick={() => setIsWordVisible(!isWordVisible)}
              className="aspect-square card-chunky flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group border-4 border-dashed border-indigo-200 hover:border-indigo-400 transition-colors"
            >
              <AnimatePresence mode="wait">
                {!isWordVisible ? (
                  <motion.div
                    key="hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <EyeOff size={48} className="text-indigo-400" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-black text-indigo-500">اضغط للكشف</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6 p-4 w-full"
                  >
                    <div className="space-y-3 w-full">
                      <span className="text-slate-400 text-sm uppercase tracking-widest font-black">الكلمة</span>
                      <div className={cn(
                        "text-4xl sm:text-5xl font-black leading-tight break-words",
                        players[revealIndex].role === 'spy' ? "text-rose-500" : "text-indigo-600"
                      )}>
                        {players[revealIndex].word}
                      </div>
                    </div>
                    <div className="bg-slate-100 text-slate-500 px-6 py-2 rounded-2xl text-sm font-black border-2 border-slate-200">
                      الكلمة السرية
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              disabled={!isWordVisible}
              onClick={nextReveal}
              className={cn(
                "w-full py-5 text-2xl",
                isWordVisible ? "btn-chunky btn-primary" : "btn-chunky bg-slate-200 text-slate-400 shadow-none opacity-50"
              )}
            >
              فهمت، اللي بعده
              <ChevronRight size={28} strokeWidth={3} />
            </button>
          </motion.div>
        )}

        {phase === 'describe' && (
          <motion.div
            key="describe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-md space-y-8"
          >
            {discussionMode === 'directed' && questionPairs.length > 0 ? (
              <>
                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-2">وقت الأسئلة! <MessageCircle className="text-indigo-500" size={36} /></h2>
                  <p className="text-slate-500 font-bold text-lg">اسألوا بعض عشان تكشفوا الجواسيس</p>
                </div>

                <div className="card-chunky p-8 flex flex-col items-center gap-6 text-center">
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <User size={32} strokeWidth={2.5} />
                      </div>
                      <span className="font-black text-xl text-slate-800">{questionPairs[currentQuestionIndex].asker.name}</span>
                      <span className="text-sm font-bold text-slate-400">يسأل</span>
                    </div>
                    
                    <div className="text-slate-300">
                      <ChevronLeft size={40} strokeWidth={3} />
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <User size={32} strokeWidth={2.5} />
                      </div>
                      <span className="font-black text-xl text-slate-800">{questionPairs[currentQuestionIndex].answerer.name}</span>
                      <span className="text-sm font-bold text-slate-400">يُسأل</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (currentQuestionIndex < questionPairs.length - 1) {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    } else {
                      setPhase('vote');
                      setVotes({});
                      setCurrentVoterIndex(0);
                      setShowVoterPrompt(true);
                      setCurrentVoterSelections([]);
                    }
                  }}
                  className="btn-chunky btn-primary w-full py-5 text-2xl"
                >
                  {currentQuestionIndex < questionPairs.length - 1 ? 'السؤال اللي بعده' : <span className="flex items-center justify-center gap-2">خلصنا؟ يلا نصوت! <CheckSquare size={24} /></span>}
                </button>
              </>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-2">نقاش مفتوح! <MessageCircle className="text-indigo-500" size={36} /></h2>
                  <p className="text-slate-500 font-bold text-lg">اتكلموا مع بعض وحاولوا تكتشفوا الجواسيس</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {players.filter(p => !p.isEliminated).map((player) => (
                    <div
                      key={player.id}
                      className="card-chunky p-5 flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <User size={32} strokeWidth={2.5} />
                      </div>
                      <span className="font-black text-xl truncate w-full text-center text-slate-800">{player.name}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setPhase('vote');
                    setVotes({});
                    setCurrentVoterIndex(0);
                    setShowVoterPrompt(true);
                    setCurrentVoterSelections([]);
                  }}
                  className="btn-chunky btn-primary w-full py-5 text-2xl"
                >
                  <span className="flex items-center justify-center gap-2">خلصنا نقاش؟ يلا نصوت! <CheckSquare size={24} /></span>
                </button>
              </>
            )}
          </motion.div>
        )}

        {phase === 'vote' && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-8"
          >
            {showVoterPrompt ? (
              <div className="text-center space-y-8">
                <div className="space-y-3">
                  <h2 className="text-4xl font-black text-slate-900">دور <span className="text-indigo-600">{players.filter(p => !p.isEliminated)[currentVoterIndex]?.name}</span></h2>
                  <p className="text-slate-500 font-bold text-lg">ادي الموبايل لـ {players.filter(p => !p.isEliminated)[currentVoterIndex]?.name} عشان يصوت في السر</p>
                </div>
                <div className="card-chunky p-8 flex justify-center border-4 border-dashed border-indigo-200">
                  <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center">
                    <EyeOff size={48} className="text-indigo-400" strokeWidth={2.5} />
                  </div>
                </div>
                <button
                  onClick={() => setShowVoterPrompt(false)}
                  className="btn-chunky btn-primary w-full py-5 text-2xl"
                >
                  أنا {players.filter(p => !p.isEliminated)[currentVoterIndex]?.name}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl font-black text-slate-900 flex items-center justify-center gap-2">شاكك في مين؟ <HelpCircle className="text-indigo-500" size={32} /></h2>
                  <p className="text-slate-500 font-bold">اختار {spyCount} لاعبين حاسس إنهم جواسيس</p>
                  <p className="text-indigo-500 font-black text-sm bg-indigo-50 inline-block px-4 py-1 rounded-full">
                    اخترت {currentVoterSelections.length} من {spyCount}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {players.filter(p => !p.isEliminated && p.id !== players.filter(active => !active.isEliminated)[currentVoterIndex]?.id).map((player) => {
                    const isSelected = currentVoterSelections.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => toggleSelection(player.id)}
                        className={cn(
                          "card-chunky p-5 flex items-center justify-between transition-all text-right active:scale-[0.98] cursor-pointer",
                          isSelected ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20" : "hover:border-rose-300 group"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                            isSelected ? "bg-indigo-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500"
                          )}>
                            {isSelected ? <Check size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={2.5} />}
                          </div>
                          <span className="text-xl font-black text-slate-800">{player.name}</span>
                        </div>
                        <div className={cn(
                          "font-black transition-colors",
                          isSelected ? "text-indigo-600" : "text-slate-300 group-hover:text-rose-500"
                        )}>
                          {isSelected ? 'تم الاختيار' : 'صوّت ضده'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentVoterSelections.length !== spyCount}
                  onClick={confirmVote}
                  className={cn(
                    "w-full py-5 text-2xl mt-4 transition-all",
                    currentVoterSelections.length === spyCount ? "btn-chunky btn-primary" : "btn-chunky bg-slate-200 text-slate-400 shadow-none opacity-50 cursor-not-allowed"
                  )}
                >
                  تأكيد التصويت
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'reveal-spies' && (
          <motion.div
            key="reveal-spies"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-2">انتهى التصويت! <CheckSquare className="text-indigo-500" size={36} /></h2>
              <p className="text-xl text-slate-500 font-bold leading-relaxed">
                اللاعبين اختاروا: {accusedPlayers.length > 0 ? accusedPlayers.map(p => p.name).join(' و ') : 'محدش'}
              </p>
            </div>

            <div className="card-chunky p-6 space-y-6 bg-rose-50 border-rose-200">
              <h3 className="text-2xl font-black text-rose-600 text-center">الجواسيس الحقيقيين هما:</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {players.filter(p => p.role === 'spy').map(spy => (
                  <span key={spy.id} className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-xl">
                    {spy.name}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const nextSpy = spiesToGuess[0];
                if (nextSpy) {
                  startSpyGuessPhase(nextSpy);
                } else {
                  setWinner('citizens');
                  setPhase('result');
                }
              }}
              className="btn-chunky btn-primary w-full py-5 text-2xl"
            >
              <span className="flex items-center justify-center gap-2">الجواسيس يخمنوا الكلمة <Search size={24} /></span>
            </button>
          </motion.div>
        )}

        {phase === 'spy-guess' && (
          <motion.div
            key="spy-guess"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center space-y-4">
              <motion.div 
                className="inline-block p-6 rounded-[2.5rem] bg-rose-100 text-rose-500 mb-2 shadow-sm"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Ghost size={64} strokeWidth={2.5} />
              </motion.div>
              <h2 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-2">دور الجاسوس! <Search className="text-indigo-500" size={36} /></h2>
              <p className="text-xl text-slate-500 font-bold leading-relaxed">
                يا <span className="text-rose-600">{guessingSpy?.name}</span>، قدامك فرصة أخيرة.. إيه هي الكلمة؟
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-2">
              {spyGuessOptions.map((word) => (
                <button
                  key={word.id}
                  onClick={() => handleSpyGuess(word.id)}
                  className="card-chunky p-4 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-95"
                >
                  <span className="font-black text-lg text-slate-800">{word.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'punishment' && (
          <motion.div
            key="punishment"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-8 text-center"
          >
            <div className="space-y-4">
              <motion.div 
                className="inline-block p-6 rounded-[2.5rem] bg-rose-100 text-rose-600 mb-4 shadow-sm border-4 border-rose-200"
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <AlertCircle size={80} strokeWidth={2.5} />
              </motion.div>
              <h2 className="text-5xl font-black text-slate-900 leading-tight flex items-center justify-center gap-2">إجابة غلط! <XCircle className="text-rose-500" size={48} /></h2>
              <p className="text-xl text-slate-500 font-bold">
                الجاسوس معرفش الكلمة.. وقت العقاب!
              </p>
            </div>

            <div className="card-chunky p-8 space-y-6 bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200">
              <h3 className="text-sm font-black text-rose-400 uppercase tracking-[0.2em]">الحكم التنفيذي</h3>
              
              {punishmentMode === 'random' && selectedPunishment ? (
                <div className="text-3xl font-black text-slate-800 leading-relaxed">
                  "{selectedPunishment.text}"
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-2xl font-black text-slate-800 leading-relaxed">
                    اللاعبين هيختاروا الحكم بالأغلبية!
                  </div>
                  <div className="text-slate-500 font-bold">
                    <span className="flex items-center justify-center gap-2">اتفقوا على حكم ونفذوه في الجاسوس <Skull size={20} /></span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (spiesToGuess.length > 0) {
                  startSpyGuessPhase(spiesToGuess[0]);
                } else {
                  const accusedSpies = accusedPlayers.filter(p => p.role === 'spy');
                  const citizensWon = accusedSpies.length === spyCount && accusedPlayers.length === spyCount;
                  
                  if (citizensWon) {
                    setWinner('citizens');
                    playSuccess();
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                  } else {
                    setWinner('spy');
                    playFail();
                  }
                  setPhase('result');
                }
              }}
              className="btn-chunky btn-primary w-full py-5 text-2xl"
            >
              {spiesToGuess.length > 0 ? <span className="flex items-center justify-center gap-2">الجاسوس اللي بعده <ArrowRight size={24} /></span> : <span className="flex items-center justify-center gap-2">النتيجة النهائية <Trophy size={24} /></span>}
            </button>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center space-y-8"
          >
            <div className="space-y-4">
              <motion.div 
                className="inline-block p-6 rounded-[2.5rem] bg-amber-100 text-amber-500 mb-4 shadow-sm border-4 border-amber-200"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy size={80} strokeWidth={2} />
              </motion.div>
              <h2 className="text-5xl font-black text-slate-900 leading-tight">
                {winner === 'citizens' ? <span className="flex items-center justify-center gap-2">المواطنين كسبوا! <PartyPopper size={40} className="text-amber-500" /></span> : (spyCount > 1 ? <span className="flex items-center justify-center gap-2">الجواسيس خلعوا! <Search size={40} className="text-slate-700" /></span> : <span className="flex items-center justify-center gap-2">الجاسوس خلع! <Search size={40} className="text-slate-700" /></span>)}
              </h2>
              <p className="text-xl text-slate-500 font-bold">
                {winner === 'citizens' 
                  ? 'قدرتوا تمسكوا الجواسيس وتكشفوا ألاعيبهم' 
                  : 'الجواسيس ضحكوا عليكم وطلعوا أذكى منكم!'}
              </p>
            </div>

            <div className="card-chunky p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">كشف المستور</h3>
              <div className="space-y-3">
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                    <span className="font-black text-xl text-slate-800">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-sm px-3 py-1 rounded-xl font-black",
                        p.role === 'spy' ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
                      )}>
                        {p.role === 'spy' ? 'جاسوس' : 'مواطن'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t-2 border-slate-100">
                <div className="text-slate-500 font-bold mb-1">الكلمة كانت:</div>
                <div className="text-3xl font-black text-indigo-600">{currentWord?.text}</div>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="btn-chunky btn-primary w-full py-5 text-2xl"
            >
              <RotateCcw size={28} strokeWidth={3} />
              نلعب تاني؟
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[5%] left-[5%] w-64 h-64 bg-indigo-200 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[5%] w-80 h-80 bg-rose-200 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[10%] w-48 h-48 bg-amber-200 rounded-full blur-[80px]" />
      </div>
    </div>
  );
}
