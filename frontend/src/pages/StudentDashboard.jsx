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
      return { grade: 'A', color: 'bg-zinc-800 border border-zinc-700' };
    } else if (s >= 50) {
      return { grade: 'B', color: 'bg-zinc-800 border border-zinc-700' };
    } else {
      return { grade: 'C', color: 'bg-zinc-800 border border-zinc-700' };
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
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ffffff"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm font-semibold text-zinc-100">{`${Math.round(pct)}%`}</div>
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
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.08] bg-zinc-950 backdrop-blur-xl shadow-2xl max-md:w-[72px]"
      >
        {/* Logo */}
        <div className="border-b border-white/[0.08] px-6 py-5 max-md:px-3">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 max-md:text-center max-md:text-base">
            HireAI
          </h1>
        </div>

        {/* Nav Links */}
        <nav aria-label="Student dashboard" className="flex-1 space-y-1.5 p-3 max-md:px-2">
          {navItems?.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 2 }}
                onClick={() => setActiveNav(item.id)}
                aria-current={activeNav === item.id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-all duration-200 max-md:justify-center max-md:px-2 ${
                  activeNav === item.id
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm font-medium'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <Icon size={18} className={activeNav === item.id ? 'text-zinc-100' : 'text-zinc-300'} />
                <span className="text-sm font-medium max-md:hidden">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Fixed bottom profile component wrapper to ensure complete visibility */}
        <div className="border-t border-white/[0.08] p-4 max-md:px-2 bg-zinc-950">
          <ProfileButton />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="relative min-w-0 flex-1 overflow-auto bg-zinc-950">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-6 right-6 z-50 max-w-xs w-full rounded-xl shadow-xl p-3 text-sm font-medium bg-zinc-900 border border-zinc-700 text-zinc-100 backdrop-blur-md"
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
              className="p-8 max-w-6xl mx-auto"
            >
              {/* Header */}
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 mb-2">AI Diagnostics</p>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100 mb-2">
                  Resume Analyzer
                </h1>
                <p className="text-sm font-light text-zinc-300">
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
                      className={`border border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 backdrop-blur-md ${
                        dragActive
                          ? 'border-zinc-300 bg-zinc-900'
                          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60 shadow-sm'
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
                          dragActive ? 'text-zinc-100' : 'text-zinc-300'
                        }`}
                      />
                      <p className="text-sm font-medium text-zinc-100">
                        {resumeFile
                          ? `Selected: ${resumeFile.name}`
                          : 'Drop your resume here or click to browse'}
                      </p>
                      <p className="text-xs font-light text-zinc-400 mt-1">
                        PDF format only
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-2">
                        Job Description
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste job description here..."
                        className="w-full h-64 p-4 border border-zinc-800 bg-zinc-900/50 text-zinc-100 rounded-2xl focus:outline-none focus:border-zinc-600 resize-none placeholder:text-zinc-500 text-sm font-light shadow-sm"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full py-3.5 bg-zinc-100 text-zinc-950 font-medium rounded-xl hover:bg-white transition-all duration-200 shadow-sm disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
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
                    className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md h-fit"
                  >
                    <h3 className="text-base font-semibold text-zinc-100 mb-4">
                      How it works
                    </h3>
                    <div className="space-y-4">
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
                          className="flex gap-3"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <span className="text-xs font-semibold text-zinc-100">
                              {item.step}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-100">
                              {item.title}
                            </p>
                            <p className="text-xs font-light text-zinc-300">{item.desc}</p>
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
                      className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                          ATS Score
                        </p>
                        <p className="text-xs font-light text-zinc-300 mb-2">How well your resume passes automated filters</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <ScoreRing score={results.ats_score} />
                        <div className="mt-2 text-center">
                          <span className="text-[10px] uppercase font-semibold text-zinc-400">Grade</span>
                          <div
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ml-1.5 ${
                              getGradeBadge(results.ats_score).color
                            } text-zinc-100 font-semibold text-xs`}
                          >
                            {getGradeBadge(results.ats_score).grade}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md flex flex-col justify-between"
                    >
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                        Match %
                      </p>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-bold tracking-tight text-zinc-100">
                          {`${results.match_percent}%`}
                        </p>
                        <TrendingUp size={24} className="text-zinc-300" />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md flex flex-col justify-between"
                    >
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                        Skills Matched
                      </p>
                      <p className="text-3xl font-bold tracking-tight text-zinc-100">
                        {results.matched_skills?.length ?? 0}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md flex flex-col justify-between"
                    >
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                        Skills Missing
                      </p>
                      <p className="text-3xl font-bold tracking-tight text-zinc-300">
                        {results.missing_skills?.length ?? 0}
                      </p>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md"
                    >
                      <h3 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                        <CheckCircle size={18} className="text-zinc-200" />
                        Your Strengths
                      </h3>
                      <ul className="space-y-3">
                        {(results.matched_skills || []).map((strength, idx) => (
                          <motion.li
                            key={idx}
                            className="flex items-start gap-2.5 text-sm font-light text-zinc-200"
                          >
                            <CheckCircle size={16} className="text-zinc-300 flex-shrink-0 mt-0.5" />
                            <span>{strength}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-900/40 rounded-2xl p-6 shadow-sm border border-zinc-800 backdrop-blur-md"
                    >
                      <h3 className="text-base font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                        <XCircle size={18} className="text-zinc-300" />
                        Skill Gaps
                      </h3>
                      <ul className="space-y-3">
                        {(results.missing_skills || []).map((skill, idx) => (
                          <motion.li
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2.5 font-light text-zinc-200">
                              <XCircle size={16} className="text-zinc-400 flex-shrink-0" />
                              <span>{skill.skill}</span>
                            </div>
                            {skill.resource ? (
                              <motion.a
                                whileHover={{ scale: 1.02 }}
                                href={skill.resource}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-100 hover:text-white font-medium text-xs flex items-center gap-1 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700 transition-colors"
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
                    className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 font-medium rounded-xl transition shadow-sm"
                  >
                    Analyze Another Resume
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeNav === 'matches' && (
            <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentJobs user={user} view="browse" />
            </motion.div>
          )}

          {activeNav === 'applied-jobs' && (
            <motion.div key="applied-jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentJobs user={user} view="applied" />
            </motion.div>
          )}

          {activeNav === 'prep' && (
            <motion.div key="prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InterviewPrep />
            </motion.div>
          )}

          {activeNav === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentProfile user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}