import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Briefcase, Search, Bell, MessageSquare } from 'lucide-react';
import RecruiterAnalytics from '../components/RecruiterAnalytics';
import RecruiterJobs from '../components/RecruiterJobs';
import ProfileButton from '../components/ProfileButton';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'jobs', label: 'Jobs & Applicants', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function HRDashboard() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('jobs');

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      {/* LEFT SIDEBAR (Dark Theme) */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-20 lg:w-64 bg-[#1e1e2d] text-gray-400 flex flex-col transition-all duration-300 shrink-0 z-20"
      >
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-800">
          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            H
          </div>
          <span className="hidden lg:block ml-3 text-white text-xl font-semibold tracking-tight">HIRE-AI</span>
        </div>

        <nav aria-label="Recruiter dashboard" className="flex-1 py-6 flex flex-col gap-2 px-3">
          <p className="hidden lg:block mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Workspace
          </p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveNav(id)}
              aria-current={activeNav === id ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors w-full ${
                activeNav === id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={activeNav === id ? 'text-white' : 'text-gray-400'} />
              <span className="hidden lg:block text-sm font-medium text-left">{label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <ProfileButton />
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP NAVBAR */}
        <header className="h-20 bg-white px-8 flex items-center justify-between border-b border-gray-100 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Good Morning, {user?.displayName?.split(' ')[0] || 'Recruiter'}! 👋
            </h1>
            <p className="text-sm text-gray-500">Here's what's happening with your hiring pipeline today</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-16 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">Ctrl + K</span>
            </div>

            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-gray-600 relative transition-colors">
                <MessageSquare size={20} />
              </button>
              <button className="text-gray-400 hover:text-gray-600 relative transition-colors">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8 xl:p-10">
          <AnimatePresence mode="wait">
            {activeNav === 'analytics' ? (
              <motion.div 
                key="analytics" 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -8 }} 
                className="h-full"
              >
                <RecruiterAnalytics />
              </motion.div>
            ) : (
              <motion.div 
                key="jobs" 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -8 }} 
                className="h-full"
              >
                <RecruiterJobs user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}