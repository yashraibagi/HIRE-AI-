import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Briefcase,
  MessageSquare,
  User,
  Upload,
  CheckCircle,
  XCircle,
  TrendingUp,
  BookOpen,
  Search,
  Bell
} from 'lucide-react';
import { analyzeResume } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StudentJobs from '../components/StudentJobs';
import StudentProfile from '../components/StudentProfile';
import InterviewPrep from '../components/InterviewPrep';
import ProfileButton from '../components/ProfileButton';

export default function StudentDashboard() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [activeNav, setActiveNav] = useState('analyzer');
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const navItems = [
    { id: 'analyzer', label: 'Resume Analyzer', icon: FileText },
    { id: 'matches', label: 'Browse Jobs', icon: Briefcase },
    { id: 'applied-jobs', label: 'Applied Jobs', icon: FileText },
    { id: 'prep', label: 'Interview Prep', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setResumeFile(file);
      } else {
        setToast({ type: 'error', message: 'Only PDF files are accepted' });
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setResumeFile(file);
      } else {
        setToast({ type: 'error', message: 'Only PDF files are accepted' });
      }
    }
  };

  const getGradeBadge = (score) => {
    const s = Number(score) || 0;
    if (s >= 70) {
      return { grade: 'A', color: 'bg-green-50 text-green-700 border-green-200' };
    } else if (s >= 50) {
      return { grade: 'B', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    } else {
      return { grade: 'C', color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const ScoreRing = ({ score = 0, size = 64, stroke = 6 }) => {
    const pct = Math.max(0, Math.min(100, Number(score) || 0));
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <div className="relative inline-block" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#4f46e5"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm font-bold text-gray-800">{`${Math.round(pct)}%`}</div>
        </div>
      </div>
    );
  };

  const handleAnalyze = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      setToast({ type: 'error', message: 'Please upload a resume and paste a job description' });
      return;
    }

    setLoading(true);
    try {
      const data = await analyzeResume(resumeFile, jobDescription);
      const rawMissingSkills =
        data.missing_skills ?? data.missingSkills ?? data.skills_missing ?? data.skillsMissing ?? [];
      const rawRecommendations = data.recommendations ?? data.recs ?? data.suggestions ?? [];
      const rawConfidence = Number(
        data.confidence ?? data.role_confidence ?? data.confidence_percent ?? 0
      );

      const normalized = {
        ats_score:
          data.ats_score ??
          data.atsScore ??
          data.atsScoreValue ??
          data.ats_score_value ??
          0,
        match_percent:
          data.match_score ??
          data.match_percent ??
          data.matchPercent ??
          data.match_percentage ??
          data.matchPercentage ??
          0,
        matched_skills:
          data.matched_skills ??
          data.matchedSkills ??
          data.skills_matched ??
          data.skillsMatched ??
          [],
        missing_skills: Array.isArray(rawMissingSkills)
          ? rawMissingSkills.map((skill) =>
              typeof skill === 'string'
                ? { skill, resource: '' }
                : {
                    skill: String(skill?.skill ?? skill?.name ?? 'Unspecified skill'),
                    resource: typeof skill?.resource === 'string' ? skill.resource : '',
                  }
            )
          : [],
        predicted_role:
          data.predicted_role ??
          data.predictedRole ??
          data.role ??
          'N/A',
        confidence: Math.max(0, Math.min(100, rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)),
        recommendations: Array.isArray(rawRecommendations)
          ? rawRecommendations.map((recommendation) =>
              typeof recommendation === 'string'
                ? { title: recommendation, detail: '', action: '' }
                : {
                    title: String(recommendation?.title ?? 'Recommendation'),
                    detail: String(recommendation?.detail ?? ''),
                    action: String(recommendation?.action ?? ''),
                  }
            )
          : [],
        raw: data,
      };

      setResults(normalized);
    } catch (err) {
      console.error('Error analyzing resume:', err);
      const msg = (err && err.message) || 'Failed to analyze resume. Please try again.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

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

        <nav aria-label="Student dashboard" className="flex-1 py-6 flex flex-col gap-2 px-3">
          <p className="hidden lg:block mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Workspace
          </p>
          {navItems?.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                aria-current={activeNav === item.id ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors w-full ${
                  activeNav === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                    : 'hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={activeNav === item.id ? 'text-white' : 'text-gray-400'} />
                <span className="hidden lg:block text-sm font-medium text-left">{item.label}</span>
              </button>
            );
          })}
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
              Good Morning, {user?.displayName?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="text-sm text-gray-500">Here's what's happening with your job hunt today</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search jobs, skills..." 
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
        <div className="relative flex-1 overflow-auto bg-gray-50 p-6 md:p-8 xl:p-10">
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed top-6 right-6 z-50 max-w-xs w-full rounded-xl shadow-lg p-4 text-sm font-medium bg-gray-800 text-white border border-gray-700"
              >
                <div>{toast.message}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeNav === 'analyzer' && (
              <motion.div
                key="analyzer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-6xl mx-auto"
              >
                {/* Header */}
                <div className="mb-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">AI Diagnostics</p>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-800 mb-2">
                    Resume Analyzer
                  </h2>
                  <p className="text-sm text-gray-500">
                    Upload your resume and paste a job description to get instant analysis
                  </p>
                </div>

                {!results ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                          dragActive
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50 shadow-sm'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          hidden
                        />
                        <Upload
                          size={32}
                          className={`mx-auto mb-3 ${
                            dragActive ? 'text-indigo-600' : 'text-gray-400'
                          }`}
                        />
                        <p className="text-sm font-semibold text-gray-800">
                          {resumeFile
                            ? `Selected: ${resumeFile.name}`
                            : 'Drop your resume here or click to browse'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PDF format only
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Job Description
                        </label>
                        <textarea
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          placeholder="Paste job description here..."
                          className="w-full h-64 p-4 border border-gray-200 bg-white text-gray-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none placeholder:text-gray-400 text-sm shadow-sm transition-all"
                        />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-md disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Analyzing...
                          </div>
                        ) : (
                          'Analyze Resume'
                        )}
                      </motion.button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit"
                    >
                      <h3 className="text-base font-bold text-gray-800 mb-6">
                        How it works
                      </h3>
                      <div className="space-y-6">
                        {[
                          { step: '1', title: 'Upload PDF Resume', desc: 'Share your resume in PDF format' },
                          { step: '2', title: 'Paste Job Description', desc: 'Add the job posting you are applying for' },
                          { step: '3', title: 'Get AI Analysis', desc: 'Receive instant insights and recommendations' },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex gap-4"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {item.step}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                            ATS Score
                          </p>
                          <p className="text-xs text-gray-500 max-w-[120px]">How well your resume passes automated filters</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <ScoreRing score={results.ats_score} />
                          <div className="mt-2 text-center flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Grade</span>
                            <div
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded border ${
                                getGradeBadge(results.ats_score).color
                              } font-bold text-xs`}
                            >
                              {getGradeBadge(results.ats_score).grade}
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
                      >
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                          Match %
                        </p>
                        <div className="flex items-end justify-between">
                          <p className="text-4xl font-bold tracking-tight text-gray-800">
                            {`${results.match_percent}%`}
                          </p>
                          <TrendingUp size={28} className="text-indigo-500 mb-1" />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
                      >
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                          Skills Matched
                        </p>
                        <p className="text-4xl font-bold tracking-tight text-gray-800">
                          {results.matched_skills?.length ?? 0}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
                      >
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                          Skills Missing
                        </p>
                        <p className="text-4xl font-bold tracking-tight text-gray-800">
                          {results.missing_skills?.length ?? 0}
                        </p>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                      >
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <CheckCircle size={20} className="text-green-500" />
                          Your Strengths
                        </h3>
                        <ul className="space-y-3">
                          {(results.matched_skills || []).map((strength, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-start gap-3 text-sm text-gray-600"
                            >
                              <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="font-medium">{strength}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                      >
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <XCircle size={20} className="text-red-500" />
                          Skill Gaps
                        </h3>
                        <ul className="space-y-3">
                          {(results.missing_skills || []).map((skill, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                            >
                              <div className="flex items-center gap-3 text-gray-600">
                                <XCircle size={16} className="text-red-400 flex-shrink-0" />
                                <span className="font-medium">{skill.skill}</span>
                              </div>
                              {skill.resource ? (
                                <motion.a
                                  whileHover={{ scale: 1.02 }}
                                  href={skill.resource}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  Learn <BookOpen size={14} />
                                </motion.a>
                              ) : null}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setResults(null);
                        setResumeFile(null);
                        setJobDescription('');
                      }}
                      className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-bold rounded-xl transition shadow-sm"
                    >
                      Analyze Another Resume
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeNav === 'matches' && (
              <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <StudentJobs user={user} view="browse" />
              </motion.div>
            )}

            {activeNav === 'applied-jobs' && (
              <motion.div key="applied-jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <StudentJobs user={user} view="applied" />
              </motion.div>
            )}

            {activeNav === 'prep' && (
              <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <InterviewPrep />
              </motion.div>
            )}

            {activeNav === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <StudentProfile user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}