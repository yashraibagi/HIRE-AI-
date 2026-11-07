'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, FileText, Target } from 'lucide-react';

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
      glow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
      iconColor: 'text-indigo-400',
    },
    {
      icon: Target,
      title: 'Job Matching',
      description: 'Intelligent matching algorithm that connects candidates with perfect job opportunities.',
      color: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/30',
      glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Zap,
      title: 'ATS Scoring',
      description: 'Real-time ATS compatibility scoring to ensure your resume passes applicant tracking systems.',
      color: 'from-purple-500/20 to-purple-500/5',
      borderColor: 'border-purple-500/30',
      glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* Animated Background Blobs */}
      <motion.div
        className="absolute top-10 left-10 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        }}
        variants={blobVariants}
        animate="animate"
        custom={0}
      />
      <motion.div
        className="absolute top-1/3 right-10 w-80 h-80 rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
        }}
        variants={blobVariants}
        animate="animate"
        custom={1}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none"
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
            <div className="flex items-center gap-3">
              <img 
                src="favicon.png" 
                alt="HireAI Logo" 
                className="w-40 h-40 object-contain rounded-xl" 
              />
            </div>
          </motion.div>

          {/* Main Heading with Typewriter */}
          <motion.div
            className="mb-4 text-center max-w-4xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h1 className="mb-5 text-center text-5xl font-bold tracking-tight text-zinc-100 text-balance md:text-7xl">
              Explore opportunities for{' '}
              <span className="inline-block min-w-[220px] md:min-w-[340px]">
                <span className="text-zinc-100">
                  {displayText}
                  <span className="animate-pulse font-light text-indigo-500">|</span>
                </span>
              </span>
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            className="mb-12 max-w-2xl text-center text-lg leading-8 text-zinc-400 text-balance md:text-xl font-light"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            AI-powered resume insights and intelligent job matching for candidates and hiring teams.
          </motion.p>
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
            className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl text-zinc-100 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Powerful Features
          </motion.h2>
          <motion.p
            className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-zinc-400 text-center font-light"
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
                  className={`group relative p-8 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md transition-all duration-500 hover:bg-zinc-900/60 hover:border-white/10 ${feature.glow}`}
                >
                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03), transparent 70%)',
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    <motion.div
                      className="mb-6 inline-flex p-3 rounded-xl bg-zinc-800/50 border border-white/5 shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                    </motion.div>

                    <h3 className="text-xl font-medium text-zinc-100 mb-3">{feature.title}</h3>
                    <p className="text-zinc-400 font-light leading-relaxed flex-grow">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          className="py-24 px-4 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.h3
            className="text-2xl md:text-3xl font-semibold text-zinc-100 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
           Transforming How Talent Meets Opportunity
          </motion.h3>

          <motion.button
            onClick={() => navigate('/role-select')}
            className="relative px-8 py-3.5 bg-zinc-100 text-zinc-950 font-medium rounded-full hover:bg-white transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Get Started Now
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage;