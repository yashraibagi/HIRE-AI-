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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-36 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-violet-200/40 blur-3xl" />
      <AnimatePresence>
        <motion.div
          className="relative w-full max-w-5xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Brain size={16} /></span>
              <span className="text-sm font-bold tracking-tight text-slate-900">HireAI</span>
              <span className="h-4 w-px bg-slate-200" />
              <span className="text-xs font-medium text-slate-500">Career platform</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600">Welcome to your next step</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Choose your workspace</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">Sign in to a focused workspace built to help you move forward with confidence.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {/* Student Card */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="group h-full"
            >
              <div className="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white p-7 shadow-[0_18px_55px_-30px_rgba(79,70,229,0.35)] transition-shadow duration-300 group-hover:shadow-[0_24px_70px_-32px_rgba(79,70,229,0.5)] sm:p-8">
                <div aria-hidden="true" className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-indigo-50 transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex flex-1 flex-col">
                  <div className="mb-7 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Candidate workspace</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950">I’m looking for a job</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">Make your next move with clear, practical tools for your job search.</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    <li className="flex items-center gap-3"><FileSearch size={17} className="shrink-0 text-indigo-600" />Analyze and strengthen your resume</li>
                    <li className="flex items-center gap-3"><Target size={17} className="shrink-0 text-indigo-600" />Discover relevant job matches</li>
                    <li className="flex items-center gap-3"><TrendingUp size={17} className="shrink-0 text-indigo-600" />Track applications and skill gaps</li>
                  </ul>
                </div>
                <motion.button
                  onClick={handleStudentClick}
                  whileTap={{ scale: 0.98 }}
                  className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
              <div className="relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 text-white shadow-[0_18px_55px_-30px_rgba(15,23,42,0.65)] transition-shadow duration-300 group-hover:shadow-[0_24px_70px_-32px_rgba(79,70,229,0.55)] sm:p-8">
                <div aria-hidden="true" className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex flex-1 flex-col">
                  <div className="mb-7 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-300/20">
                      <BriefcaseBusiness className="h-7 w-7" />
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">Recruiter workspace</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">I’m hiring talent</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Bring structure and insight to every stage of your hiring process.</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-3"><FileSearch size={17} className="shrink-0 text-indigo-300" />Review and compare candidates</li>
                    <li className="flex items-center gap-3"><TrendingUp size={17} className="shrink-0 text-indigo-300" />Evaluate resume-to-role fit</li>
                    <li className="flex items-center gap-3"><ShieldCheck size={17} className="shrink-0 text-indigo-300" />Manage applicants in one pipeline</li>
                  </ul>
                </div>
                <motion.button
                  onClick={handleRecruiterClick}
                  whileTap={{ scale: 0.98 }}
                  className="relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
