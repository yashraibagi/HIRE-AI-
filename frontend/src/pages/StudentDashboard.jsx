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
  Bell,
  LayoutDashboard,
  Calendar,
  MoreVertical,
  MapPin,
  Clock,
  Plus
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
  const [activeNav, setActiveNav] = useState('dashboard'); // Default to the new Dashboard view
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

  // Added Dashboard to Nav Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
      return { grade: 'A', color: 'bg-green-50 border border-green-200 text-green-700' };
    } else if (s >= 50) {
      return { grade: 'B', color: 'bg-yellow-50 border border-yellow-200 text-yellow-700' };
    } else {
      return { grade: 'C', color: 'bg-red-50 border border-red-200 text-red-700' };
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
            stroke="#e2e8f0"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#6366f1" // Indigo-500
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm font-bold text-gray-900">{`${Math.round(pct)}%`}</div>
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
    <div className="flex min-h-screen bg-[#f3f4f6] text-gray-800 font-sans">
      
      {/* LEFT SIDEBAR (Dark Theme exactly matching image 1) */}
      <motion.aside
        initial={{ x: -240 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 flex h-screen w-20 lg:w-64 bg-[#1b1b28] text-gray-400 flex-col transition-all duration-300 shrink-0 z-20 shadow-xl"
      >
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            H
          </div>
          <span className="hidden lg:block ml-3 text-white text-xl font-bold tracking-tight">HIRE-AI</span>
        </div>

        <nav aria-label="Student dashboard" className="flex-1 py-4 flex flex-col gap-1.5 px-4 mt-4">
          {navItems?.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all w-full ${
                  isActive
                    ? 'bg-[#2b2b40] text-white'
                    : 'hover:bg-[#232333] hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
                <span className="hidden lg:block text-sm font-medium text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4">
          <ProfileButton />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="relative min-w-0 flex-1 overflow-auto bg-[#f4f7fe]">
        
        {/* TOP NAVBAR */}
        <header className="h-20 bg-white px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Good Morning, {user?.displayName?.split(' ')[0] || 'Yash'}! 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">Here's what's happening with your job hunt today</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">Ctrl + K</span>
            </div>

            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-gray-600 relative transition-colors">
                <MessageSquare size={20} />
              </button>
              <button className="text-gray-400 hover:text-gray-600 relative transition-colors">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-6 right-6 z-50 max-w-xs w-full rounded-xl shadow-xl p-3 text-sm font-medium bg-gray-800 border border-gray-700 text-white backdrop-blur-md"
            >
              <div>{toast.message}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. THE MAIN DASHBOARD VIEW (Matches the Image perfectly) */}
            {activeNav === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6"
              >
                {/* Left & Center Column */}
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Applications" value="24" trend="+3 this week" icon={<Briefcase size={20} className="text-indigo-400"/>} />
                    <StatCard title="Profile Matches" value="156" trend="+12 today" icon={<Users size={20} className="text-blue-400"/>} />
                    <StatCard title="Interviews" value="4" trend="+1 this week" icon={<Calendar size={20} className="text-purple-400"/>} />
                    <StatCard title="Offers" value="1" trend="Recent" icon={<CheckCircle size={20} className="text-green-400"/>} />
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ActionCard icon={<Search className="text-blue-500" size={20}/>} title="Find Jobs" desc="Browse matches" onClick={() => setActiveNav('matches')}/>
                      <ActionCard icon={<FileText className="text-indigo-500" size={20}/>} title="Analyze CV" desc="Update resume" onClick={() => setActiveNav('analyzer')}/>
                      <ActionCard icon={<MessageSquare className="text-purple-500" size={20}/>} title="Mock Interview" desc="Practice now" onClick={() => setActiveNav('prep')}/>
                      <ActionCard icon={<TrendingUp className="text-green-500" size={20}/>} title="Skill Gaps" desc="View analysis" onClick={() => setActiveNav('analyzer')}/>
                    </div>
                  </div>

                  {/* Recommended Positions Table */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm overflow-hidden">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Recommended Positions</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                          <tr>
                            <th className="px-4 py-3 font-medium rounded-l-lg">Role</th>
                            <th className="px-4 py-3 font-medium">Company</th>
                            <th className="px-4 py-3 font-medium">Match</th>
                            <th className="px-4 py-3 font-medium rounded-r-lg">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <JobRow role="Senior Full Stack Developer" company="Google" match="92%" status="Apply Now" />
                          <JobRow role="Python Backend Engineer" company="Amazon" match="88%" status="Apply Now" />
                          <JobRow role="Machine Learning Intern" company="Microsoft" match="85%" status="Saved" />
                          <JobRow role="React Frontend Developer" company="Atlassian" match="79%" status="Apply Now" />
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  
                  {/* Schedule Widget */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex justify-between items-center">
                      Schedule
                      <MoreVertical size={16} className="text-gray-400"/>
                    </h2>
                    
                    {/* Date Picker Row */}
                    <div className="flex justify-between items-center mb-6">
                      {['Thu 26', 'Fri 27', 'Sat 28', 'Sun 29', 'Mon 30'].map((date, i) => (
                        <div key={i} className={`flex flex-col items-center p-2 rounded-xl cursor-pointer ${i === 0 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                          <span className="text-xs">{date.split(' ')[0]}</span>
                          <span className="font-bold text-lg">{date.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 mb-4">Today's Schedule</h3>
                    
                    <div className="space-y-4">
                      {/* Timeline Item 1 */}
                      <div className="flex items-start gap-3">
                        <div className="w-1 bg-indigo-500 h-10 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">Technical Interview</p>
                          <p className="text-xs text-gray-500 mt-0.5">Google • 10:00 AM</p>
                        </div>
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-md font-bold border border-indigo-100">Interview</span>
                      </div>

                      {/* Timeline Item 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-1 bg-purple-500 h-10 rounded-full mt-1"></div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">HR Round</p>
                          <p className="text-xs text-gray-500 mt-0.5">Amazon • 2:30 PM</p>
                        </div>
                        <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-md font-bold border border-purple-100">Call</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Required Widget */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex justify-between items-center">
                      Action Required
                      <MoreVertical size={16} className="text-gray-400"/>
                    </h2>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-orange-100 bg-orange-50/50 rounded-xl">
                        <div>
                          <p className="font-bold text-sm text-gray-900">Upload Resume</p>
                          <p className="text-xs text-gray-500 mt-0.5">Profile completion 80%</p>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200">
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-green-100 bg-green-50/50 rounded-xl">
                        <div>
                          <p className="font-bold text-sm text-gray-900">Offer Received</p>
                          <p className="text-xs text-gray-500 mt-0.5">Microsoft • 2h ago</p>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200">
                          <CheckCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* 2. RESUME ANALYZER VIEW */}
            {activeNav === 'analyzer' && (
              <motion.div
                key="analyzer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-6xl mx-auto"
              >
                <div className="mb-8">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600 mb-2">AI Diagnostics</p>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                    Resume Analyzer
                  </h1>
                  <p className="text-sm font-medium text-gray-500">
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
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 shadow-sm'
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
                            dragActive ? 'text-indigo-500' : 'text-gray-400'
                          }`}
                        />
                        <p className="text-sm font-bold text-gray-900">
                          {resumeFile
                            ? `Selected: ${resumeFile.name}`
                            : 'Drop your resume here or click to browse'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF format only
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
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
                      <h3 className="text-base font-bold text-gray-900 mb-6">
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
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-indigo-600">
                                {item.step}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
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
                          <p className="text-xs text-gray-400 max-w-[120px]">How well your resume passes automated filters</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <ScoreRing score={results.ats_score} />
                          <div className="mt-2 text-center flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Grade</span>
                            <div
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded ${
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
                          <p className="text-4xl font-bold tracking-tight text-gray-900">
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
                        <p className="text-4xl font-bold tracking-tight text-gray-900">
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
                        <p className="text-4xl font-bold tracking-tight text-gray-900">
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
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
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

            {/* OTHER TABS */}
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

/* HELPER COMPONENTS FOR DASHBOARD VIEW */

function StatCard({ title, value, trend, icon }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="text-gray-400 mb-3 flex justify-between items-start">
        <span className="text-xs font-bold text-gray-500">{title}</span>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <div>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        <p className="text-xs text-green-600 font-bold mt-2 bg-green-50 w-max px-2 py-1 rounded-md border border-green-100">{trend}</p>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center bg-gray-50/50 hover:bg-white"
    >
      <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

function JobRow({ role, company, match, status }) {
  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors">
      <td className="px-4 py-4">
        <p className="font-bold text-gray-900 text-sm">{role}</p>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
          <Briefcase size={12}/> Full-time
        </p>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {company.charAt(0)}
          </div>
          <span className="text-sm text-gray-700 font-bold">{company}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-md text-xs font-bold border border-green-100">
          {match} Match
        </span>
      </td>
      <td className="px-4 py-4">
        <span className={`px-3 py-1.5 rounded-md text-xs font-bold ${status === 'Saved' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 cursor-pointer hover:bg-indigo-100'}`}>
          {status}
        </span>
      </td>
    </tr>
  );
}