import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, Brain, FileSearch, GraduationCap, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { setRole } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const handleStudentClick = () => {
    setRole('student');
    navigate('/auth', { state: { role: 'student' } });
  };

  const handleRecruiterClick = () => {
    setRole('recruiter');
    navigate('/auth', { state: { role: 'recruiter' } });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-36 h-96 w-96 rounded-full bg-indigo-900/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-zinc-900/40 blur-3xl" />
      <AnimatePresence>
        <motion.div
          className="relative w-full max-w-5xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/40 px-4 py-2 shadow-sm backdrop-blur-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200"><Brain size={16} /></span>
              <span className="text-sm font-bold tracking-tight text-zinc-100">HireAI</span>
              <span className="h-4 w-px bg-zinc-800" />
              <span className="text-xs font-medium text-zinc-400">Career platform</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-400">Welcome to your next step</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">Choose your workspace</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-zinc-400">Sign in to a focused workspace built to help you move forward with confidence.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {/* Student Card */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="group h-full"
            >
              <div className="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-7 shadow-[0_18px_55px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 group-hover:border-white/10 group-hover:bg-zinc-900/60 group-hover:shadow-[0_24px_70px_-32px_rgba(99,102,241,0.2)] sm:p-8">
                <div aria-hidden="true" className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-indigo-500/5 transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex flex-1 flex-col">
                  <div className="mb-7 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-indigo-400 ring-1 ring-inset ring-white/10">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <span className="rounded-full border border-white/5 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">Candidate workspace</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">I’m looking for a job</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">Make your next move with clear, practical tools for your job search.</p>
                  <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                    <li className="flex items-center gap-3"><FileSearch size={17} className="shrink-0 text-indigo-400" />Analyze and strengthen your resume</li>
                    <li className="flex items-center gap-3"><Target size={17} className="shrink-0 text-indigo-400" />Discover relevant job matches</li>
                    <li className="flex items-center gap-3"><TrendingUp size={17} className="shrink-0 text-indigo-400" />Track applications and skill gaps</li>
                  </ul>
                </div>
                <motion.button
                  onClick={handleStudentClick}
                  whileTap={{ scale: 0.98 }}
                  className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 py-3.5 font-semibold text-zinc-950 shadow-lg shadow-white/5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Continue as a candidate <ArrowRight size={17} />
                </motion.button>
              </div>
            </motion.div>

            {/* Recruiter Card */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="group h-full"
            >
              <div className="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-7 text-zinc-100 shadow-[0_18px_55px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 group-hover:border-white/10 group-hover:bg-zinc-900/60 group-hover:shadow-[0_24px_70px_-32px_rgba(99,102,241,0.2)] sm:p-8">
                <div aria-hidden="true" className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-indigo-500/5 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex flex-1 flex-col">
                  <div className="mb-7 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/80 text-indigo-400 ring-1 ring-inset ring-white/10">
                      <BriefcaseBusiness className="h-7 w-7" />
                    </div>
                    <span className="rounded-full border border-white/5 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">Recruiter workspace</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">I’m hiring talent</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">Bring structure and insight to every stage of your hiring process.</p>
                  <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                    <li className="flex items-center gap-3"><FileSearch size={17} className="shrink-0 text-indigo-400" />Review and compare candidates</li>
                    <li className="flex items-center gap-3"><TrendingUp size={17} className="shrink-0 text-indigo-400" />Evaluate resume-to-role fit</li>
                    <li className="flex items-center gap-3"><ShieldCheck size={17} className="shrink-0 text-indigo-400" />Manage applicants in one pipeline</li>
                  </ul>
                </div>
                <motion.button
                  onClick={handleRecruiterClick}
                  whileTap={{ scale: 0.98 }}
                  className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-6 py-3.5 font-semibold text-zinc-100 border border-white/10 shadow-lg transition hover:bg-zinc-700 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Continue as a recruiter <ArrowRight size={17} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}