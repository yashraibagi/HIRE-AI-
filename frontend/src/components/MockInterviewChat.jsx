import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { api } from '../services/api';

const roles = [
  'Python Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Product Manager',
];
const TOTAL_QUESTIONS = 5;
const MAX_ANSWER_LENGTH = 6000;

const scoreTone = (score) => score >= 8
  ? 'border-zinc-700 bg-zinc-900 text-zinc-100'
  : score >= 6
    ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400';

function FeedbackCard({ feedback }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-zinc-800/40">
        <span className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreTone(feedback.score)}`}><Star size={13} />{feedback.score}/10</span>
          <span className="truncate text-sm font-medium text-zinc-100">AI feedback</span>
        </span>
        {expanded ? <ChevronUp size={17} className="shrink-0 text-zinc-400" /> : <ChevronDown size={17} className="shrink-0 text-zinc-400" />}
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-zinc-800 p-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Strengths</h4>
            <ul className="mt-2 space-y-1.5">{feedback.strengths.map((strength) => <li key={strength} className="flex gap-2 text-sm leading-5 font-light text-zinc-300"><Check size={15} className="mt-0.5 shrink-0 text-zinc-300" />{strength}</li>)}</ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Areas to improve</h4>
            <ul className="mt-2 space-y-1.5">{feedback.areas_for_improvement.map((area) => <li key={area} className="flex gap-2 text-sm leading-5 font-light text-zinc-300"><ArrowRight size={14} className="mt-0.5 shrink-0 text-zinc-400" />{area}</li>)}</ul>
          </div>
          <div className="rounded-xl bg-zinc-950/70 border border-zinc-800 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Example of a strong answer</h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 font-light text-zinc-300">{feedback.ideal_model_answer}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default function MockInterviewChat() {
  const [targetRole, setTargetRole] = useState(roles[0]);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const currentQuestion = messages.at(-1);
  const completedCount = messages.filter((message) => message.feedback).length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, summary]);

  const apiErrorMessage = (requestError) => requestError.response?.data?.detail
    || requestError.message
    || 'Something went wrong. Please try again.';

  const startInterview = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSummary(null);
    setMessages([]);
    try {
      const { data } = await api.post('/interview/mock/start', { target_role: targetRole });
      setSession(data);
      setMessages([{ question_number: data.question_number, question_text: data.question, user_answer: '', feedback: null }]);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (event) => {
    event.preventDefault();
    if (!session || !currentQuestion || !answer.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/interview/mock/submit-answer', {
        session_id: session.session_id,
        user_answer: answer.trim(),
      });
      const evaluated = {
        ...currentQuestion,
        user_answer: data.user_answer,
        feedback: data.feedback,
      };
      if (data.status === 'completed') {
        setMessages((current) => [...current.slice(0, -1), evaluated]);
        const report = await api.get(`/interview/mock/summary/${session.session_id}`);
        setSummary(report.data);
      } else {
        setMessages((current) => [
          ...current.slice(0, -1),
          evaluated,
          {
            question_number: data.next_question_number,
            question_text: data.next_question,
            user_answer: '',
            feedback: null,
          },
        ]);
      }
      setAnswer('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const resetInterview = () => {
    setSession(null);
    setMessages([]);
    setAnswer('');
    setSummary(null);
    setError('');
  };

  if (!session) {
    return (
      <section className="mx-auto max-w-4xl space-y-6 p-5 text-left sm:p-8 bg-zinc-950 text-zinc-100 min-h-full">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">AI mock interview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">Build confidence through practice</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 font-light text-zinc-400">Take a five-question interview tailored to your target role. Get practical feedback after every response.</p>
        </header>
        <form onSubmit={startInterview} className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md">
          <div className="border-b border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-100"><MessageSquareText size={23} /></div>
            <h2 className="mt-5 text-xl font-bold text-zinc-100">Set up your practice session</h2>
            <p className="mt-1 text-sm leading-6 font-light text-zinc-400">Choose the role you’re preparing for. Your AI interviewer will ask one question at a time.</p>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            <label htmlFor="mock-role" className="block text-sm font-medium text-zinc-200">Target role</label>
            <select id="mock-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="-mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700">
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs leading-5 text-zinc-300 backdrop-blur-md">
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-zinc-400" />
              <p className="font-light">Your answers are sent to the configured Gemini AI service for evaluation. Avoid sharing sensitive personal information.</p>
            </div>
            {error && <p role="alert" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{error}</p>}
            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-3.5 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {loading ? <><LoaderCircle size={17} className="animate-spin" />Preparing your interview…</> : <><Sparkles size={17} />Start mock interview</>}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (summary) {
    const score = summary.overall_score ?? 0;
    const badgeTone = score >= 8 ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : score >= 6 ? 'border-zinc-700 bg-zinc-900 text-zinc-300' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400';
    return (
      <section className="mx-auto max-w-5xl space-y-6 p-5 text-left sm:p-8 bg-zinc-950 text-zinc-100 min-h-full">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Interview report card</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">Practice complete</h1><p className="mt-2 text-sm font-light text-zinc-400">{summary.target_role} · {summary.answered_questions} questions answered</p></div>
          <button type="button" onClick={resetInterview} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 shadow-sm hover:bg-zinc-800 hover:text-zinc-100 transition"><RotateCcw size={16} />Start another</button>
        </header>
        <section className="flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:p-8">
          <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[6px] border-zinc-800 bg-zinc-900 text-center"><div><p className="text-3xl font-bold text-zinc-100">{score.toFixed(1)}</p><p className="text-xs font-medium text-zinc-400">out of 10</p></div></div>
          <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone}`}>{summary.performance_badge}</span><h2 className="mt-3 text-xl font-bold text-zinc-100">Your overall performance</h2><ul className="mt-3 space-y-2">{summary.recommendations.map((recommendation) => <li key={recommendation} className="flex gap-2 text-sm leading-5 font-light text-zinc-300"><ArrowRight size={15} className="mt-0.5 shrink-0 text-zinc-400" />{recommendation}</li>)}</ul></div>
        </section>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-100">Question-by-question review</h2>
          {summary.messages.filter((message) => message.user_answer).map((message) => (
            <article key={message.question_number} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm backdrop-blur-md">
              <div className="flex items-start justify-between gap-4"><h3 className="font-semibold leading-6 text-zinc-100"><span className="mr-2 text-zinc-400">Q{message.question_number}.</span>{message.question_text}</h3><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreTone(message.score)}`}>{message.score}/10</span></div>
              <p className="mt-3 rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-sm leading-6 font-light text-zinc-300">{message.user_answer}</p>
              {message.ai_feedback && <FeedbackCard feedback={message.ai_feedback} />}
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-2rem)] max-w-5xl flex-col p-4 text-left sm:h-[calc(100vh-4rem)] sm:p-8 bg-zinc-950 text-zinc-100">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">{session.target_role}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-100">AI mock interview</h1></div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300">Question {currentQuestion?.question_number || completedCount + 1} of {TOTAL_QUESTIONS}</span>
          <button type="button" onClick={resetInterview} disabled={loading} className="text-sm font-medium text-zinc-400 hover:text-zinc-100 disabled:opacity-50 transition-colors">Exit</button>
        </div>
      </header>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-800" aria-label={`Question ${currentQuestion?.question_number || TOTAL_QUESTIONS} of ${TOTAL_QUESTIONS}`}>
        <div className="h-full rounded-full bg-zinc-100 transition-all duration-500" style={{ width: `${(completedCount / TOTAL_QUESTIONS) * 100}%` }} />
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-6 backdrop-blur-md">
        {messages.map((message) => (
          <div key={message.question_number} className="space-y-4">
            <div className="flex max-w-[92%] items-start gap-3 sm:max-w-[85%]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100"><Sparkles size={17} /></span>
              <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900/60 backdrop-blur-md p-4 shadow-sm"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Interviewer · Question {message.question_number}</p><p className="text-sm leading-6 font-light text-zinc-200">{message.question_text}</p></div>
            </div>
            {message.user_answer && (
              <div className="ml-auto max-w-[92%] sm:max-w-[85%]">
                <div className="flex items-start justify-end gap-3"><div className="rounded-2xl rounded-tr-sm bg-zinc-800 border border-zinc-700 p-4 text-zinc-100 shadow-sm"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Your answer</p><p className="whitespace-pre-wrap text-sm leading-6 font-light text-zinc-200">{message.user_answer}</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300"><UserRound size={17} /></span></div>
                {message.feedback && <div className="mr-12"><FeedbackCard feedback={message.feedback} /></div>}
              </div>
            )}
          </div>
        ))}
        {loading && session && messages.at(-1)?.user_answer === '' && (
          <div className="flex items-center gap-3 text-sm font-light text-zinc-400"><span className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200"><Sparkles size={17} /></span><LoaderCircle size={16} className="animate-spin text-zinc-400" />The interviewer is preparing your question…</div>
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200">{error}</p>}
      {currentQuestion && !currentQuestion.feedback && (
        <form onSubmit={submitAnswer} className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 shadow-sm sm:p-4 backdrop-blur-md">
          <label htmlFor="mock-answer" className="sr-only">Your answer</label>
          <textarea id="mock-answer" value={answer} onChange={(event) => setAnswer(event.target.value.slice(0, MAX_ANSWER_LENGTH))} placeholder="Type your answer here…" rows={4} disabled={loading} className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700 disabled:opacity-60" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-light text-zinc-500">{answer.length.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()} characters</span><button type="submit" disabled={loading || !answer.trim()} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 shadow-sm">{loading ? <><LoaderCircle size={16} className="animate-spin" />Evaluating…</> : <>Submit answer <Send size={15} /></>}</button></div>
        </form>
      )}
      <button type="button" onClick={resetInterview} className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"><ArrowLeft size={13} />Return to role selection</button>
    </section>
  );
}