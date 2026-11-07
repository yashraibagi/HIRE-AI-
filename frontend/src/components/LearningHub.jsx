import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BrainCircuit,
  Code2,
  CirclePlay,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

const tabs = [
  { id: 'aptitude', label: 'Aptitude', icon: BrainCircuit },
  { id: 'dsa', label: 'DSA Practice', icon: ClipboardList },
  { id: 'videos', label: 'Video Tutorials', icon: CirclePlay },
];

const aptitudeCategories = ['All', 'Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'];
const levelOptions = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  const watchPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(watchPattern);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const levelOrder = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

export default function LearningHub() {
  const [activeTab, setActiveTab] = useState('aptitude');
  const [aptitude, setAptitude] = useState([]);
  const [dsa, setDsa] = useState([]);
  const [videos, setVideos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedPattern, setSelectedPattern] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [expandedSolutions, setExpandedSolutions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dsaPatterns = useMemo(() => {
    const uniquePatterns = [...new Set(dsa.map((item) => item.pattern))];
    return ['All', ...uniquePatterns];
  }, [dsa]);

  const videoTopics = useMemo(() => {
    const uniqueTopics = [...new Set(videos.map((item) => item.topic))];
    return ['All', ...uniqueTopics];
  }, [videos]);

  useEffect(() => {
    let isActive = true;

    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [aptitudeResponse, dsaResponse, videoResponse] = await Promise.all([
          api.get('/interview/aptitude', {
            params: {
              ...(selectedCategory !== 'All' ? { category: selectedCategory } : {}),
              ...(selectedLevel !== 'All' ? { level: selectedLevel } : {}),
            },
          }),
          api.get('/interview/dsa', {
            params: {
              ...(selectedLevel !== 'All' ? { level: selectedLevel } : {}),
              ...(selectedPattern !== 'All' ? { pattern: selectedPattern } : {}),
            },
          }),
          api.get('/interview/videos', {
            params: {
              ...(selectedLevel !== 'All' ? { level: selectedLevel } : {}),
              ...(selectedTopic !== 'All' ? { topic: selectedTopic } : {}),
            },
          }),
        ]);

        if (!isActive) return;
        setAptitude((aptitudeResponse.data || []).sort((a, b) => (levelOrder[a.level] || 0) - (levelOrder[b.level] || 0)));
        setDsa((dsaResponse.data || []).sort((a, b) => (levelOrder[a.level] || 0) - (levelOrder[b.level] || 0)));
        setVideos((videoResponse.data || []).sort((a, b) => (levelOrder[a.level] || 0) - (levelOrder[b.level] || 0)));
      } catch (err) {
        if (!isActive) return;
        console.error(err);
        setError('Could not load the learning hub data. Please check that the backend is running.');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      isActive = false;
    };
  }, [selectedCategory, selectedLevel, selectedPattern, selectedTopic]);

  const toggleAnswer = (id) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolution = (id) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderAptitudeTab = () => (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {aptitudeCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${selectedCategory === category ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {levelOptions.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${selectedLevel === level ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          >
            {level}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400 backdrop-blur-md">
          Loading aptitude practice...
        </div>
      ) : aptitude.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400 backdrop-blur-md">
          No aptitude questions match your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {aptitude.map((question) => {
            const isExpanded = !!expandedAnswers[question.id];
            return (
              <div key={question.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      {question.category}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                      {question.level}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAnswer(question.id)}
                    className="text-sm font-medium text-zinc-200 hover:text-white transition-colors"
                  >
                    {isExpanded ? 'Hide answer' : 'Reveal answer'}
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-zinc-100">{question.question}</h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {question.options.map((option) => {
                    const isCorrect = option === question.correct_answer;
                    const shouldHighlight = isExpanded && isCorrect;

                    return (
                      <div
                        key={option}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-light ${
                          shouldHighlight
                            ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
                            : 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                        }`}
                      >
                        {option}
                      </div>
                    );
                  })}
                </div>

                {isExpanded && (
                  <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-sm text-zinc-300">
                    <p className="font-medium text-zinc-100">Correct answer: {question.correct_answer}</p>
                    <p className="mt-2 leading-6 font-light">{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDsaTab = () => (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {levelOptions.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${selectedLevel === level ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {dsaPatterns.map((pattern) => (
          <button
            key={pattern}
            type="button"
            onClick={() => setSelectedPattern(pattern)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${selectedPattern === pattern ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          >
            {pattern}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400 backdrop-blur-md">
          Loading DSA practice problems...
        </div>
      ) : dsa.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400 backdrop-blur-md">
          No DSA problems match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {dsa.map((problem) => {
            const isExpanded = !!expandedSolutions[problem.id];
            return (
              <div key={problem.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">{problem.pattern}</p>
                    <h3 className="mt-1 text-2xl font-bold text-zinc-100">{problem.title}</h3>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-zinc-800/80 border border-zinc-700/50 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {problem.level}
                  </span>
                </div>

                <div className="mt-5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 text-sm leading-7 text-zinc-300 font-light">
                  {problem.statement}
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-zinc-200">Approach</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400 font-light">{problem.approach}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSolution(problem.id)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <Code2 size={16} />
                  {isExpanded ? 'Hide Python Solution' : 'View Python Solution'}
                </button>

                {isExpanded && (
                  <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200 font-mono">
                    <code>{problem.python_solution}</code>
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderVideoTab = () => (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {levelOptions.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${selectedLevel === level ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[ 'All', ...videoTopics.filter((topic) => topic !== 'All') ].map((topic) => (
          <button
            key={topic}
            type="button"
            onClick={() => setSelectedTopic(topic)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${selectedTopic === topic ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          >
            {topic}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400 backdrop-blur-md">
          Loading curated videos...
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-400 backdrop-blur-md">
          No videos found for this topic.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <div key={video.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md">
              <div className="aspect-video overflow-hidden bg-zinc-950">
                <iframe
                  src={getYouTubeEmbedUrl(video.url)}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {video.category}
                  </span>
                  <span className="inline-flex rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                    {video.level}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-zinc-100">{video.title}</h3>
                <p className="mt-2 text-sm font-medium text-zinc-400">{video.topic}</p>
                {video.description && (
                  <p className="mt-3 text-sm leading-6 text-zinc-300 font-light">{video.description}</p>
                )}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center text-sm font-medium text-zinc-200 hover:text-white"
                >
                  Open on YouTube
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-full space-y-5 p-5 text-left sm:p-8 bg-zinc-950 text-zinc-100">
      <header className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/80 p-3 text-zinc-100 shadow-sm">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Comprehensive learning hub</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">Beginner to Advanced interview prep</h2>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/80 px-3.5 py-2 text-sm font-medium text-zinc-300 shadow-sm border border-zinc-800">
          <Sparkles size={16} className="text-zinc-300" />
          Smart fundamentals + interview drills
        </div>
      </header>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2 shadow-sm backdrop-blur-md">
        <nav className="flex flex-wrap gap-2" aria-label="Learning hub navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${activeTab === id ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
            >
              <Icon size={17} className={activeTab === id ? 'text-zinc-100' : 'text-zinc-400'} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 backdrop-blur-md">
          {error}
        </div>
      )}

      {activeTab === 'aptitude' && renderAptitudeTab()}
      {activeTab === 'dsa' && renderDsaTab()}
      {activeTab === 'videos' && renderVideoTab()}
    </div>
  );
}