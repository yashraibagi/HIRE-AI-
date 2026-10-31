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
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : score >= 6
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';

function FeedbackCard({ feedback }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-indigo-50/40">
        <span className="flex min-w-0 items-center gap-3">
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${scoreTone(feedback.score)}`}><Star size={13} />{feedback.score}/10</span>
          <span className="truncate text-sm font-semibold text-slate-800">AI feedback</span>
        </span>
        {expanded ? <ChevronUp size={17} className="shrink-0 text-slate-400" /> : <ChevronDown size={17} className="shrink-0 text-slate-400" />}
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-slate-100 p-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Strengths</h4>
            <ul className="mt-2 space-y-1.5">{feedback.strengths.map((strength) => <li key={strength} className="flex gap-2 text-sm leading-5 text-slate-700"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />{strength}</li>)}</ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">Areas to improve</h4>
            <ul className="mt-2 space-y-1.5">{feedback.areas_for_improvement.map((area) => <li key={area} className="flex gap-2 text-sm leading-5 text-slate-700"><ArrowRight size={14} className="mt-0.5 shrink-0 text-amber-600" />{area}</li>)}</ul>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Example of a strong answer</h4>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{feedback.ideal_model_answer}</p>
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
      <section className="mx-auto max-w-4xl space-y-6 p-5 text-left sm:p-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">AI mock interview</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Build confidence through practice</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Take a five-question interview tailored to your target role. Get practical feedback after every response.</p>
        </header>
        <form onSubmit={startInterview} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><MessageSquareText size={23} /></div>
            <h2 className="mt-5 text-xl font-bold text-slate-950">Set up your practice session</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Choose the role you’re preparing for. Your AI interviewer will ask one question at a time.</p>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            <label htmlFor="mock-role" className="block text-sm font-semibold text-slate-800">Target role</label>
            <select id="mock-role" value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="-mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-xs leading-5 text-amber-900">
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              <p>Your answers are sent to the configured Gemini AI service for evaluation. Avoid sharing sensitive personal information.</p>
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {loading ? <><LoaderCircle size={17} className="animate-spin" />Preparing your interview…</> : <><Sparkles size={17} />Start mock interview</>}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (summary) {
    const score = summary.overall_score ?? 0;
    const badgeTone = score >= 8 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : score >= 6 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800';
    return (
      <section className="mx-auto max-w-5xl space-y-6 p-5 text-left sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Interview report card</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Practice complete</h1><p className="mt-2 text-sm text-slate-600">{summary.target_role} · {summary.answered_questions} questions answered</p></div>
          <button type="button" onClick={resetInterview} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><RotateCcw size={16} />Start another</button>
        </header>
        <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
          <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[6px] border-indigo-100 bg-indigo-50 text-center"><div><p className="text-3xl font-bold text-slate-950">{score.toFixed(1)}</p><p className="text-xs font-semibold text-slate-500">out of 10</p></div></div>
          <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badgeTone}`}>{summary.performance_badge}</span><h2 className="mt-3 text-xl font-bold text-slate-950">Your overall performance</h2><ul className="mt-3 space-y-2">{summary.recommendations.map((recommendation) => <li key={recommendation} className="flex gap-2 text-sm leading-5 text-slate-600"><ArrowRight size={15} className="mt-0.5 shrink-0 text-indigo-600" />{recommendation}</li>)}</ul></div>
        </section>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Question-by-question review</h2>
          {summary.messages.filter((message) => message.user_answer).map((message) => (
            <article key={message.question_number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><h3 className="font-semibold leading-6 text-slate-900"><span className="mr-2 text-indigo-600">Q{message.question_number}.</span>{message.question_text}</h3><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${scoreTone(message.score)}`}>{message.score}/10</span></div>
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{message.user_answer}</p>
              {message.ai_feedback && <FeedbackCard feedback={message.ai_feedback} />}
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex h-[calc(100vh-2rem)] max-w-5xl flex-col p-4 text-left sm:h-[calc(100vh-4rem)] sm:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{session.target_role}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">AI mock interview</h1></div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">Question {currentQuestion?.question_number || completedCount + 1} of {TOTAL_QUESTIONS}</span>
          <button type="button" onClick={resetInterview} disabled={loading} className="text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50">Exit</button>
        </div>
      </header>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`Question ${currentQuestion?.question_number || TOTAL_QUESTIONS} of ${TOTAL_QUESTIONS}`}>
        <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${(completedCount / TOTAL_QUESTIONS) * 100}%` }} />
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-100/70 p-4 sm:p-6">
        {messages.map((message) => (
          <div key={message.question_number} className="space-y-4">
            <div className="flex max-w-[92%] items-start gap-3 sm:max-w-[85%]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles size={17} /></span>
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 shadow-sm"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-600">Interviewer · Question {message.question_number}</p><p className="text-sm leading-6 text-slate-800">{message.question_text}</p></div>
            </div>
            {message.user_answer && (
              <div className="ml-auto max-w-[92%] sm:max-w-[85%]">
                <div className="flex items-start justify-end gap-3"><div className="rounded-2xl rounded-tr-sm bg-indigo-600 p-4 text-white shadow-sm"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-100">Your answer</p><p className="whitespace-pre-wrap text-sm leading-6">{message.user_answer}</p></div><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-300 text-slate-700"><UserRound size={17} /></span></div>
                {message.feedback && <div className="mr-12"><FeedbackCard feedback={message.feedback} /></div>}
              </div>
            )}
          </div>
        ))}
        {loading && session && messages.at(-1)?.user_answer === '' && (
          <div className="flex items-center gap-3 text-sm text-slate-500"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><Sparkles size={17} /></span><LoaderCircle size={16} className="animate-spin" />The interviewer is preparing your question…</div>
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
      {currentQuestion && !currentQuestion.feedback && (
        <form onSubmit={submitAnswer} className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <label htmlFor="mock-answer" className="sr-only">Your answer</label>
          <textarea id="mock-answer" value={answer} onChange={(event) => setAnswer(event.target.value.slice(0, MAX_ANSWER_LENGTH))} placeholder="Type your answer here…" rows={4} disabled={loading} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">{answer.length.toLocaleString()} / {MAX_ANSWER_LENGTH.toLocaleString()} characters</span><button type="submit" disabled={loading || !answer.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><LoaderCircle size={16} className="animate-spin" />Evaluating…</> : <>Submit answer <Send size={15} /></>}</button></div>
        </form>
      )}
      <button type="button" onClick={resetInterview} className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-slate-700"><ArrowLeft size={13} />Return to role selection</button>
    </section>
  );
}
