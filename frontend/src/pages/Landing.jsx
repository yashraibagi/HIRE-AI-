'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, FileText, Target, BriefcaseBusiness } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState('');
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const jobRoles = [
    'Software Engineers',
    'Product Managers',
    'Data Analysts',
    'UX Designers',
    'Frontend Developers',
    'Backend Developers',
    'AI Engineers',
    'HR Professionals',
  ];

  // Typewriter effect
  useEffect(() => {
    const fullText = jobRoles[currentJobIndex];
    let timeout;

    if (!isDeleting && displayText !== fullText) {
      // Typing forward
      timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, 100);
    } else if (!isDeleting && displayText === fullText) {
      // Pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
    } else if (isDeleting && displayText !== '') {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayText(displayText.slice(0, -1));
      }, 50);
    } else if (isDeleting && displayText === '') {
      // Move to next job role
      setIsDeleting(false);
      setCurrentJobIndex((prev) => (prev + 1) % jobRoles.length);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentJobIndex]);

  // Floating blob variants
  const blobVariants = {
    animate: (custom) => ({
      y: [0, -30, 0],
      x: [0, 20, 0],
      rotate: [0, 180, 360],
      transition: {
        duration: 20 + custom * 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    }),
  };

  // Feature card variants
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const features = [
    {
      icon: FileText,
      title: 'Resume Analysis',
      description: 'Advanced parsing and analysis of resumes using AI to extract key skills and experiences.',
      color: 'from-indigo-500/20 to-indigo-500/5',
      borderColor: 'border-indigo-500/30',
    },
    {
      icon: Target,
      title: 'Job Matching',
      description: 'Intelligent matching algorithm that connects candidates with perfect job opportunities.',
      color: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/30',
    },
    {
      icon: Zap,
      title: 'ATS Scoring',
      description: 'Real-time ATS compatibility scoring to ensure your resume passes applicant tracking systems.',
      color: 'from-purple-500/20 to-purple-500/5',
      borderColor: 'border-purple-500/30',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#1a1f3a]">
      {/* Animated Background Blobs */}
      <motion.div
        className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        }}
        variants={blobVariants}
        animate="animate"
        custom={0}
      />
      <motion.div
        className="absolute top-1/3 right-10 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
        }}
        variants={blobVariants}
        animate="animate"
        custom={1}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)',
        }}
        variants={blobVariants}
        animate="animate"
        custom={2}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <motion.div
          className="flex min-h-[88vh] flex-col items-center justify-center px-4 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo/Brand */}
          <motion.div
            className="mb-10 flex items-center gap-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 shadow-sm shadow-black/20">
              <BriefcaseBusiness className="h-7 w-7 text-stone-800" strokeWidth={1.8} />
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">HireAI</span>
          </motion.div>

          {/* Main Heading with Typewriter */}
          <motion.div
            className="mb-4 text-center max-w-4xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h1 className="mb-5 text-center text-5xl font-bold leading-[1.08] tracking-tight text-white text-balance md:text-7xl">
              Explore opportunities for{' '}
              <span className="inline-block min-w-[220px] md:min-w-[340px]">
                <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  {displayText}
                  <span className="animate-pulse">|</span>
                </span>
              </span>
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            className="mb-8 max-w-2xl text-center text-lg leading-8 text-slate-300 text-balance md:text-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            AI-powered resume insights and intelligent job matching for candidates and hiring teams.
          </motion.p>

          <motion.button
            onClick={() => navigate('/role-select')}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Get started
          </motion.button>
        </motion.div>

        {/* Features Section */}
        <motion.div
          className="mx-auto max-w-6xl px-4 py-12 md:py-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.h2
            className="mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl"
            style={{ color: '#ffffff', textAlign: 'center', textShadow: '0 8px 26px rgba(0,0,0,0.65)' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Powerful Features
          </motion.h2>
          <motion.p
            className="text-lg md:text-xl mb-8 max-w-2xl mx-auto"
            style={{ color: '#ffffff', textAlign: 'center' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: true }}
          >
            Everything you need for smarter hiring decisions
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.2 }}
                  className={`group relative p-8 rounded-xl border ${feature.borderColor} backdrop-blur-sm bg-gradient-to-br ${feature.color} hover:border-opacity-100 transition-all duration-300 hover:shadow-2xl hover:shadow-white/10`}
                >
                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
                    style={{
                      background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent)',
                    }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    <motion.div
                      className="mb-6"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <Icon className="w-12 h-12 text-white" />
                    </motion.div>

                    <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{feature.description}</p>

                    {/* Bottom accent bar */}
                    <motion.div
                      className="h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-purple-500 mt-6 rounded-full"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                      viewport={{ once: true }}
                      style={{ originX: 0 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          className="py-20 px-4 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.h3
            className="text-3xl md:text-4xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Ready to Transform Your Hiring?
          </motion.h3>

          <motion.button
            onClick={() => navigate('/role-select')}
            className="relative px-10 py-4 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-bold rounded-lg hover:shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 group overflow-hidden text-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
              initial={false}
            />
            <span className="relative">Get Started Now</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;