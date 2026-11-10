import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Plus } from 'lucide-react';
import RecruiterAnalytics from '../components/RecruiterAnalytics';
import RecruiterJobs from '../components/RecruiterJobs';
import ProfileButton from '../components/ProfileButton';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'jobs', label: 'Jobs & Applicants', icon: Plus },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function HRDashboard() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('jobs');

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300 shadow-2xl max-md:w-[72px]"
      >
        <div className="border-b border-zinc-800 px-6 py-5 max-md:px-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 max-md:text-center max-md:text-lg">HireAI</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">Recruiter workspace</p>
        </div>

        <nav aria-label="Recruiter dashboard" className="flex-1 space-y-1.5 p-3 max-md:px-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveNav(id)}
              aria-current={activeNav === id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition max-md:justify-center max-md:px-2 ${
                activeNav === id
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Icon size={20} className={activeNav === id ? 'text-zinc-100' : 'text-zinc-400'} />
              <span className="text-sm font-medium max-md:hidden">{label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-4 bg-zinc-950">
          <ProfileButton />
        </div>
      </motion.aside>

      <main className="min-w-0 flex-1 overflow-auto bg-zinc-950">
        <div className="p-6 md:p-8 xl:p-10">
          <AnimatePresence mode="wait">
            {activeNav === 'analytics' ? (
              <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <RecruiterAnalytics />
              </motion.div>
            ) : (
              <motion.div key="jobs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <RecruiterJobs user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}