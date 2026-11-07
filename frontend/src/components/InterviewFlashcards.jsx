import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Search,
  Shuffle,
} from 'lucide-react';
import { api } from '../services/api';

const MASTERED_STORAGE_KEY = 'hireai-mastered-flashcards';
const difficulties = ['All levels', 'Easy', 'Medium', 'Hard'];

const difficultyStyles = {
  Easy: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
  Medium: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
  Hard: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
};

const readMasteredIds = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(MASTERED_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
};

export default function InterviewFlashcards() {
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [category, setCategory] = useState('All topics');
  const [subCategory, setSubCategory] = useState('');
  const [difficulty, setDifficulty] = useState('All levels');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetailedAnswer, setShowDetailedAnswer] = useState(false);
  const [masteredIds, setMasteredIds] = useState(readMasteredIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/interview/categories')
      .then(({ data }) => { if (active) setCategories(data); })
      .catch(() => { if (active) setError('Could not load interview categories. Please check that the backend is running.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (category !== 'All topics') params.category = category;
        if (subCategory) params.sub_category = subCategory;
        if (difficulty !== 'All levels') params.difficulty = difficulty;
        if (search.trim()) params.search = search.trim();
        const { data } = await api.get('/interview/flashcards', { params });
        if (active) {
          setCards(data);
          setCurrentIndex(0);
          setIsFlipped(false);
          setShowDetailedAnswer(false);
        }
      } catch {
        if (active) setError('Could not load interview flashcards. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [category, subCategory, difficulty, search]);

  const availableSubCategories = useMemo(() => {
    const selectedCategories = category === 'All topics'
      ? categories
      : categories.filter((item) => item.category === category);
    return selectedCategories
      .flatMap((item) => item.sub_categories.map((subcategory) => subcategory.sub_category))
      .sort((a, b) => a.localeCompare(b));
  }, [categories, category]);

  const currentCard = cards[currentIndex];
  const isMastered = currentCard ? masteredIds.has(currentCard.id) : false;

  const changeCard = (nextIndex) => {
    if (!cards.length) return;
    setCurrentIndex((nextIndex + cards.length) % cards.length);
    setIsFlipped(false);
    setShowDetailedAnswer(false);
  };

  const shuffleCard = () => {
    if (cards.length < 2) return;
    const offset = 1 + Math.floor(Math.random() * (cards.length - 1));
    changeCard(currentIndex + offset);
  };

  const toggleMastered = () => {
    if (!currentCard) return;
    const next = new Set(masteredIds);
    if (next.has(currentCard.id)) next.delete(currentCard.id);
    else next.add(currentCard.id);
    setMasteredIds(next);
    localStorage.setItem(MASTERED_STORAGE_KEY, JSON.stringify([...next]));
  };

  const chooseCategory = (nextCategory) => {
    setCategory(nextCategory);
    setSubCategory('');
  };

  return (
    <section className="min-h-full space-y-6 p-5 text-left sm:p-8 bg-zinc-950 text-zinc-100">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Interview preparation</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">Practice, recall, succeed</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Review high-yield questions across computer science, professional roles, and behavioral interviews.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm font-medium text-zinc-300 backdrop-blur-md shadow-sm">
          <BookOpenCheck size={18} className="text-zinc-300" />
          <span><strong className="text-zinc-100">{masteredIds.size}</strong> mastered</span>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-md shadow-sm sm:p-5">
        <div className="relative max-w-xl">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions, topics, or answers"
            aria-label="Search interview questions"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-3 pl-10 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Question bank</p>
          <div className="flex flex-wrap gap-2" aria-label="Filter by category">
            {['All topics', ...categories.map((item) => item.category)].map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => chooseCategory(item)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${category === item ? 'bg-zinc-100 text-zinc-950 shadow-sm font-medium' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
              >{item}</button>
            ))}
          </div>
        </div>

        {category !== 'All topics' && (
          <div className="flex flex-col gap-4 border-t border-zinc-800/80 pt-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={!subCategory} onClick={() => setSubCategory('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${!subCategory ? 'bg-zinc-100 text-zinc-950 font-medium' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}>All</button>
                {availableSubCategories.map((item) => (
                  <button key={item} type="button" aria-pressed={subCategory === item} onClick={() => setSubCategory(subCategory === item ? '' : item)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${subCategory === item ? 'bg-zinc-100 text-zinc-950 font-medium' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}>{item}</button>
                ))}
              </div>
            </div>
            <div className="shrink-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((item) => (
                  <button key={item} type="button" aria-pressed={difficulty === item} onClick={() => setDifficulty(item)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${difficulty === item ? 'bg-zinc-100 text-zinc-950 font-medium' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}>{item}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 backdrop-blur-md">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-16 text-center text-sm text-zinc-400 backdrop-blur-md shadow-sm">Loading interview questions…</div>
      ) : currentCard ? (
        <>
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>Question <strong className="text-zinc-100">{currentIndex + 1}</strong> of <strong className="text-zinc-100">{cards.length}</strong></span>
            <span>{currentCard.sub_category} <span className="px-1 text-zinc-600">/</span> {currentCard.topic}</span>
          </div>

          <div className="[perspective:1400px]">
            <div className={`relative min-h-[410px] w-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                aria-label="Show answer"
                className="absolute inset-0 flex min-h-[410px] flex-col items-start justify-between overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 text-left shadow-[0_18px_55px_-34px_rgba(0,0,0,0.8)] backdrop-blur-md [backface-visibility:hidden] sm:p-9"
              >
                <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/[0.02]" />
                <span className="relative flex w-full items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 border border-zinc-700/50"><CircleHelp size={15} />{currentCard.category}</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${difficultyStyles[currentCard.difficulty]}`}>{currentCard.difficulty}</span>
                </span>
                <span className="relative my-8 block max-w-4xl text-2xl font-bold leading-tight tracking-tight text-zinc-100 sm:text-3xl">{currentCard.question}</span>
                <span className="relative flex w-full items-center justify-between border-t border-zinc-800/80 pt-5 text-sm text-zinc-400">
                  <span>Think it through, then reveal your answer</span>
                  <span className="inline-flex items-center gap-2 font-semibold text-zinc-200">Reveal answer <ArrowRight size={16} /></span>
                </span>
              </button>

              <div
                aria-label="Flashcard answer"
                className="absolute inset-0 min-h-[410px] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.8)] backdrop-blur-md [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Key idea</p>
                    <h2 className="mt-2 text-lg font-semibold leading-snug text-zinc-100">{currentCard.topic}</h2>
                  </div>
                  <button type="button" onClick={() => setIsFlipped(false)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100">Back to question</button>
                </div>
                <p className="mt-5 rounded-xl bg-zinc-800/40 border border-zinc-800 p-4 text-sm leading-6 text-zinc-300">{currentCard.summary_answer}</p>
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Key takeaways</p>
                  <ul className="mt-3 space-y-2">
                    {currentCard.key_takeaways.map((takeaway) => <li key={takeaway} className="flex gap-2.5 text-sm leading-5 text-zinc-300"><Check size={16} className="mt-0.5 shrink-0 text-zinc-300" />{takeaway}</li>)}
                  </ul>
                </div>
                {showDetailedAnswer && <p className="mt-5 border-l-2 border-zinc-700 pl-4 text-sm leading-6 text-zinc-400">{currentCard.detailed_answer}</p>}
                <button type="button" onClick={() => setShowDetailedAnswer(!showDetailedAnswer)} className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-zinc-200 hover:text-zinc-100">
                  {showDetailedAnswer ? 'Hide detailed answer' : 'Read detailed answer'}
                  {showDetailedAnswer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 backdrop-blur-md shadow-sm sm:p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => changeCard(currentIndex - 1)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100"><ArrowLeft size={16} />Previous</button>
              <button type="button" onClick={shuffleCard} disabled={cards.length < 2} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"><Shuffle size={16} />Shuffle</button>
              <button type="button" onClick={() => changeCard(currentIndex + 1)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100">Next<ArrowRight size={16} /></button>
            </div>
            <button type="button" onClick={toggleMastered} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${isMastered ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' : 'bg-zinc-100 text-zinc-950 hover:bg-white font-medium shadow-sm'}`}>
              <Check size={16} />{isMastered ? 'Mastered' : 'Mark as mastered'}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center backdrop-blur-md">
          <Search size={28} className="mx-auto mb-3 text-zinc-500" />
          <h2 className="text-lg font-semibold text-zinc-100">No questions match these filters</h2>
          <p className="mt-2 text-sm text-zinc-400">Try another category, difficulty, or search term.</p>
        </div>
      )}
    </section>
  );
}