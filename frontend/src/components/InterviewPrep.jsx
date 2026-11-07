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
    <div className="bg-zinc-950 min-h-full text-zinc-100">
      <nav aria-label="Interview preparation modules" className="flex flex-wrap gap-2 border-b border-zinc-800 px-5 pt-5 sm:px-8 bg-zinc-950">
        {modules.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveModule(id)}
            aria-current={activeModule === id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-medium transition ${activeModule === id ? 'border-zinc-100 bg-zinc-900/80 text-zinc-100 shadow-sm' : 'border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'}`}
          >
            <Icon size={17} className={activeModule === id ? 'text-zinc-100' : 'text-zinc-400'} />
            {label}
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