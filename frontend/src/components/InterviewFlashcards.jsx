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
  Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  Hard: 'bg-rose-50 text-rose-700 ring-rose-200',
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
    <section className="min-h-full space-y-6 p-5 text-left sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Interview preparation</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Practice, recall, succeed</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review high-yield questions across computer science, professional roles, and behavioral interviews.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
          <BookOpenCheck size={18} className="text-indigo-600" />
          <span><strong className="text-slate-900">{masteredIds.size}</strong> mastered</span>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="relative max-w-xl">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions, topics, or answers"
            aria-label="Search interview questions"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Question bank</p>
          <div className="flex flex-wrap gap-2" aria-label="Filter by category">
            {['All topics', ...categories.map((item) => item.category)].map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => chooseCategory(item)}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${category === item ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
              >{item}</button>
            ))}
          </div>
        </div>

        {category !== 'All topics' && (
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={!subCategory} onClick={() => setSubCategory('')} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${!subCategory ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
                {availableSubCategories.map((item) => (
                  <button key={item} type="button" aria-pressed={subCategory === item} onClick={() => setSubCategory(subCategory === item ? '' : item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${subCategory === item ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>
                ))}
              </div>
            </div>
            <div className="shrink-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((item) => (
                  <button key={item} type="button" aria-pressed={difficulty === item} onClick={() => setDifficulty(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${difficulty === item ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-500 shadow-sm">Loading interview questions…</div>
      ) : currentCard ? (
        <>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Question <strong className="text-slate-900">{currentIndex + 1}</strong> of <strong className="text-slate-900">{cards.length}</strong></span>
            <span>{currentCard.sub_category} <span className="px-1 text-slate-300">/</span> {currentCard.topic}</span>
          </div>

          <div className="[perspective:1400px]">
            <div className={`relative min-h-[410px] w-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                aria-label="Show answer"
                className="absolute inset-0 flex min-h-[410px] flex-col items-start justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-[0_18px_55px_-34px_rgba(15,23,42,0.4)] [backface-visibility:hidden] sm:p-9"
              >
                <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-50" />
                <span className="relative flex w-full items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700"><CircleHelp size={15} />{currentCard.category}</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${difficultyStyles[currentCard.difficulty]}`}>{currentCard.difficulty}</span>
                </span>
                <span className="relative my-8 block max-w-4xl text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">{currentCard.question}</span>
                <span className="relative flex w-full items-center justify-between border-t border-slate-100 pt-5 text-sm text-slate-500">
                  <span>Think it through, then reveal your answer</span>
                  <span className="inline-flex items-center gap-2 font-semibold text-indigo-600">Reveal answer <ArrowRight size={16} /></span>
                </span>
              </button>

              <div
                aria-label="Flashcard answer"
                className="absolute inset-0 min-h-[410px] overflow-y-auto rounded-3xl border border-indigo-100 bg-white p-6 shadow-[0_18px_55px_-34px_rgba(15,23,42,0.4)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Key idea</p>
                    <h2 className="mt-2 text-lg font-bold leading-snug text-slate-950">{currentCard.topic}</h2>
                  </div>
                  <button type="button" onClick={() => setIsFlipped(false)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">Back to question</button>
                </div>
                <p className="mt-5 rounded-xl bg-indigo-50/70 p-4 text-sm leading-6 text-slate-800">{currentCard.summary_answer}</p>
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Key takeaways</p>
                  <ul className="mt-3 space-y-2">
                    {currentCard.key_takeaways.map((takeaway) => <li key={takeaway} className="flex gap-2.5 text-sm leading-5 text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{takeaway}</li>)}
                  </ul>
                </div>
                {showDetailedAnswer && <p className="mt-5 border-l-2 border-indigo-200 pl-4 text-sm leading-6 text-slate-600">{currentCard.detailed_answer}</p>}
                <button type="button" onClick={() => setShowDetailedAnswer(!showDetailedAnswer)} className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                  {showDetailedAnswer ? 'Hide detailed answer' : 'Read detailed answer'}
                  {showDetailedAnswer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => changeCard(currentIndex - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><ArrowLeft size={16} />Previous</button>
              <button type="button" onClick={shuffleCard} disabled={cards.length < 2} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Shuffle size={16} />Shuffle</button>
              <button type="button" onClick={() => changeCard(currentIndex + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Next<ArrowRight size={16} /></button>
            </div>
            <button type="button" onClick={toggleMastered} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${isMastered ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
              <Check size={16} />{isMastered ? 'Mastered' : 'Mark as mastered'}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Search size={28} className="mx-auto mb-3 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">No questions match these filters</h2>
          <p className="mt-2 text-sm text-slate-500">Try another category, difficulty, or search term.</p>
        </div>
      )}
    </section>
  );
}
