import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Briefcase, Search, Bell } from 'lucide-react';
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
    <div className="flex min-h-screen bg-[#f1f5f9] text-gray-800 font-sans">
      
      {/* LEFT SIDEBAR (Dark Slate Theme) */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 flex h-screen w-20 lg:w-64 bg-[#1c2434] text-[#8a99af] flex-col transition-all duration-300 shrink-0 z-20"
      >
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-[#2e3a47]">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
          <span className="hidden lg:block ml-3 text-white text-xl font-semibold tracking-tight">HIRE-AI</span>
        </div>

        <nav aria-label="Recruiter dashboard" className="flex-1 py-6 flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors w-full ${
                  isActive
                    ? 'bg-[#333a48] text-white'
                    : 'hover:bg-[#333a48] hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-teal-400' : 'text-[#8a99af]'} />
                <span className="hidden lg:block text-sm font-medium text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2e3a47]">
          <ProfileButton />
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="relative min-w-0 flex-1 overflow-auto bg-[#f1f5f9]">
        
        {/* TOP NAVBAR */}
        <header className="h-20 bg-[#f1f5f9] px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Good Morning, {user?.displayName?.split(' ')[0] || 'Recruiter'}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search" 
                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-72 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-gray-600 relative transition-colors bg-white p-2 rounded-full shadow-sm border border-gray-100">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              <img 
                src={user?.photoURL || "https://ui-avatars.com/api/?name=Recruiter&background=0D8ABC&color=fff"} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-gray-200 object-cover shadow-sm"
              />
            </div>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div className="p-6 md:p-8">
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