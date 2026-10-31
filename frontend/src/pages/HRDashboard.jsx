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
    <div className="flex min-h-screen bg-slate-50">
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-sm max-md:w-[72px]"
      >
        <div className="border-b border-slate-100 px-6 py-5 max-md:px-3">
          <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent max-md:text-center max-md:text-lg">HireAI</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Recruiter workspace</p>
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
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium max-md:hidden">{label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <ProfileButton />
        </div>
      </motion.aside>

      <main className="min-w-0 flex-1 overflow-auto bg-slate-50">
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
