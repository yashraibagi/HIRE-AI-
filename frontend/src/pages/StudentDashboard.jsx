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
  const [toast, setToast] = useState(null); // { type: 'error'|'success', message: string }

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
      return { grade: 'A', color: 'bg-green-500', textColor: 'text-green-600' };
    } else if (s >= 50) {
      return { grade: 'B', color: 'bg-amber-500', textColor: 'text-amber-600' };
    } else {
      return { grade: 'C', color: 'bg-red-500', textColor: 'text-red-600' };
    }
  };

  // Circular progress for ATS score
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
            stroke="#e6e7ee"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#6366f1"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm font-bold text-slate-900">{`${Math.round(pct)}%`}</div>
        </div>
      </div>
    );
  };

  // Analyze button handler with required logic
  const handleAnalyze = async () => {
    // Validation
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

      // Normalize/ensure fields exist, but keep backend keys as requested
      const normalized = {
        // prefer backend-provided snake_case keys, but also fall back to camelCase where applicable
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
        raw: data, // keep raw in case you want to inspect additional fields later
      };

      setResults(normalized);
    } catch (err) {
      console.error('Error analyzing resume:', err);
      // Prefer meaningful message if returned by service
      const msg = (err && err.message) || 'Failed to analyze resume. Please try again.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
      // Animate into results by switching activeNav if needed (results view is in same analyzer)
      // The component renders the results section automatically when results state is set
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-sm max-md:w-[72px]"
      >
        {/* Logo */}
        <div className="border-b border-slate-100 px-6 py-5 max-md:px-3">
          <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent max-md:text-center max-md:text-lg">
            HireAI
          </h1>
        </div>

        {/* Nav Links */}
        <nav aria-label="Student dashboard" className="flex-1 space-y-1.5 p-3 max-md:px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                onClick={() => setActiveNav(item.id)}
                aria-current={activeNav === item.id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors max-md:justify-center max-md:px-2 ${
                  activeNav === item.id
                    ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium max-md:hidden">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 max-md:px-2">
          <ProfileButton />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="relative min-w-0 flex-1 overflow-auto bg-slate-50">
        {/* Toast area */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`fixed top-6 right-6 z-50 max-w-xs w-full rounded-md shadow-lg p-3 ${
                toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
              }`}
            >
              <div className="text-sm font-medium">{toast.message}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeNav === 'analyzer' && (
            <motion.div
              key="analyzer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-8"
            >
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Resume Analyzer
                </h1>
                <p className="text-slate-600">
                  Upload your resume and paste a job description to get instant
                  analysis
                </p>
              </div>

              {!results ? (
                // Input Section
                <div className="grid grid-cols-[55%_45%] gap-8">
                  {/* Left Column */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Resume Upload */}
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-300 hover:border-indigo-400'
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
                          dragActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <p className="text-sm font-semibold text-slate-700">
                        {resumeFile
                          ? `Selected: ${resumeFile.name}`
                          : 'Drop your resume here or click to browse'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF format only
                      </p>
                    </div>

                    {/* Job Description */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Job Description
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste job description here..."
                        className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    {/* Analyze Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-70"
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

                  {/* Right Column */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                  >
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
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
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-indigo-600">
                              {item.step}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <p className="text-sm text-slate-600">{item.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                // Results Section
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Metric Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                          ATS Score
                        </p>
                        <p className="text-sm text-slate-500 mb-2">How well your resume passes automated filters</p>
                      </div>
                      <div>
                        <ScoreRing score={results.ats_score} />
                        <div className="mt-2 text-right">
                          <div className="text-xs text-slate-500">Grade</div>
                          <div
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full mt-1 ${
                              getGradeBadge(results.ats_score).color
                            } text-white font-bold text-sm`}
                          >
                            {getGradeBadge(results.ats_score).grade}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                    >
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                        Match %
                      </p>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold text-slate-900">
                          {`${results.match_percent}%`}
                        </p>
                        <TrendingUp size={28} className="text-indigo-600" />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                    >
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                        Skills Matched
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {results.matched_skills?.length ?? 0}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                    >
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                        Skills Missing
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {results.missing_skills?.length ?? 0}
                      </p>
                    </motion.div>
                  </div>

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Your Strengths */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                    >
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-600" />
                        Your Strengths
                      </h3>
                      <ul className="space-y-2">
                        {(results.matched_skills || []).map((strength, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <CheckCircle
                              size={16}
                              className="text-green-600 flex-shrink-0 mt-0.5"
                            />
                            <span>{strength}</span>
                          </motion.li>
                        ))}
                        {(!results.matched_skills || results.matched_skills.length === 0) && (
                          <p className="text-sm text-slate-500">No matched skills detected.</p>
                        )}
                      </ul>
                    </motion.div>

                    {/* Skill Gaps */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                    >
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <XCircle size={20} className="text-red-600" />
                        Skill Gaps
                      </h3>
                      <ul className="space-y-3">
                        {(results.missing_skills || []).map((skill, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <XCircle size={16} className="text-red-600" />
                              <span className="text-slate-700">{skill.skill}</span>
                            </div>
                            {skill.resource ? (
                              <motion.a
                                whileHover={{ scale: 1.05 }}
                                href={skill.resource}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 font-semibold text-xs flex items-center gap-1"
                              >
                                Learn <BookOpen size={14} />
                              </motion.a>
                            ) : null}
                          </motion.li>
                        ))}
                        {(!results.missing_skills || results.missing_skills.length === 0) && (
                          <p className="text-sm text-slate-500">No missing skills detected.</p>
                        )}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Predicted Role and Recommendations */}
                  <div className="grid grid-cols-3 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="col-span-2 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-lg p-6 shadow-lg text-white"
                    >
                      <p className="text-sm font-semibold opacity-90 mb-2">
                        Predicted Role
                      </p>
                      <h2 className="text-3xl font-bold mb-4">
                        {results.predicted_role}
                      </h2>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold">
                            Confidence
                          </span>
                          <span className="text-sm font-bold">
                            {results.confidence ?? 0}%
                          </span>
                        </div>
                        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${results.confidence ?? 0}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="bg-white rounded-full h-2"
                          />
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg p-6 shadow-sm border border-slate-200"
                    >
                      <h3 className="text-lg font-bold text-slate-900 mb-4">
                        Recommendations
                      </h3>
                      <div className="space-y-3 max-h-48 overflow-auto">
                        {(results.recommendations || []).map((rec, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="p-3 rounded-md border border-slate-100 bg-slate-50"
                          >
                            <h4 className="text-sm font-semibold text-slate-800">{rec.title}</h4>
                            {rec.detail && <p className="mt-1 text-sm text-slate-700">{rec.detail}</p>}
                            {rec.action && <p className="mt-2 text-xs leading-5 text-slate-500">{rec.action}</p>}
                          </motion.div>
                        ))}
                        {(!results.recommendations || results.recommendations.length === 0) && (
                          <p className="text-sm text-slate-500">No recommendations available.</p>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Back Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setResults(null);
                      setResumeFile(null);
                      setJobDescription('');
                    }}
                    className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition"
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
            <motion.div
              key="prep"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
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