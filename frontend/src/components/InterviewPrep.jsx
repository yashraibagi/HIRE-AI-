import { useState } from 'react';
import { BookOpenCheck, BrainCircuit, MessageSquareText } from 'lucide-react';
import InterviewFlashcards from './InterviewFlashcards';
import LearningHub from './LearningHub';
import MockInterviewChat from './MockInterviewChat';

const modules = [
  { id: 'flashcards', label: 'Q&A flashcards', icon: BookOpenCheck },
  { id: 'learning-hub', label: 'Learning Hub', icon: BrainCircuit },
  { id: 'mock', label: 'AI mock interview', icon: MessageSquareText },
];

export default function InterviewPrep() {
  const [activeModule, setActiveModule] = useState('flashcards');
  return (
    <div>
      <nav aria-label="Interview preparation modules" className="flex flex-wrap gap-2 border-b border-slate-200 px-5 pt-5 sm:px-8">
        {modules.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveModule(id)}
            aria-current={activeModule === id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold transition ${activeModule === id ? 'border-indigo-600 bg-white text-indigo-700' : 'border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-900'}`}
          >
            <Icon size={17} />{label}
          </button>
        ))}
      </nav>
      {activeModule === 'flashcards' ? (
        <InterviewFlashcards />
      ) : activeModule === 'learning-hub' ? (
        <LearningHub />
      ) : (
        <MockInterviewChat />
      )}
    </div>
  );
}
