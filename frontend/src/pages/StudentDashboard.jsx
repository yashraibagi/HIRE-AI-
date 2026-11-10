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
import { analyzeResume } from '../services/api'; // Ensure you export a fetch function for dashboard data here too
import { useAuth } from '../context/AuthContext';
import StudentJobs from '../components/StudentJobs';
import StudentProfile from '../components/StudentProfile';
import InterviewPrep from '../components/InterviewPrep';
import ProfileButton from '../components/ProfileButton';

export default function StudentDashboard() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  // Navigation State
  const [activeNav, setActiveNav] = useState('dashboard');
  
  // Resume Analyzer State
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Global State
  const [toast, setToast] = useState(null);

  // --- NEW: Dashboard Data State ---
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: { applications: 0, matches: 0, interviews: 0, offers: 0 },
    recommendedJobs: [],
    schedule: [],
    actions: []
  });

  // Fetch real data when the Dashboard tab is active
  useEffect(() => {
    if (activeNav === 'dashboard' && user) {
      const fetchDashboardData = async () => {
        setLoadingDashboard(true);
        try {
          // Replace this fetch block with your actual api.js function (e.g., await getStudentDashboard(user.uid))
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/student/dashboard/${user.uid}`, {
            headers: { 'Authorization': `Bearer ${user.accessToken}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setDashboardData(data);
          }
        } catch (error) {
          console.error('Failed to fetch dashboard data:', error);
        } finally {
          setLoadingDashboard(false);
        }
      };

      fetchDashboardData();
    }
  }, [activeNav, user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyzer', label: 'Resume Analyzer', icon: FileText },
    { id: 'matches', label: 'Browse Jobs', icon: Briefcase },
    { id: 'applied-jobs', label: 'Applied Jobs', icon: FileText },
    { id: 'prep', label: 'Interview Prep', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  // ... (Keep existing drag/drop, analyzeResume, and getGradeBadge functions here) ...
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      if (files[0].type === 'application/pdf') setResumeFile(files[0]);
      else setToast({ type: 'error', message: 'Only PDF files are accepted' });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].type === 'application/pdf') setResumeFile(e.target.files[0]);
      else setToast({ type: 'error', message: 'Only PDF files are accepted' });
    }
  };

  const getGradeBadge = (score) => {
    const s = Number(score) || 0;
    if (s >= 70) return { grade: 'A', color: 'bg-green-50 border border-green-200 text-green-700' };
    if (s >= 50) return { grade: 'B', color: 'bg-yellow-50 border border-yellow-200 text-yellow-700' };
    return { grade: 'C', color: 'bg-red-50 border border-red-200 text-red-700' };
  };

  const ScoreRing = ({ score = 0, size = 64, stroke = 6 }) => {
    const pct = Math.max(0, Math.min(100, Number(score) || 0));
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <div className="relative inline-block" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#6366f1" strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
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
      const rawMissingSkills = data.missing_skills ?? data.missingSkills ?? data.skills_missing ?? data.skillsMissing ?? [];
      const rawRecommendations = data.recommendations ?? data.recs ?? data.suggestions ?? [];
      const rawConfidence = Number(data.confidence ?? data.role_confidence ?? data.confidence_percent ?? 0);

      const normalized = {
        ats_score: data.ats_score ?? data.atsScore ?? data.atsScoreValue ?? data.ats_score_value ?? 0,
        match_percent: data.match_score ?? data.match_percent ?? data.matchPercent ?? data.match_percentage ?? data.matchPercentage ?? 0,
        matched_skills: data.matched_skills ?? data.matchedSkills ?? data.skills_matched ?? data.skillsMatched ?? [],
        missing_skills: Array.isArray(rawMissingSkills) ? rawMissingSkills.map((skill) => typeof skill === 'string' ? { skill, resource: '' } : { skill: String(skill?.skill ?? skill?.name ?? 'Unspecified skill'), resource: typeof skill?.resource === 'string' ? skill.resource : '' }) : [],
        predicted_role: data.predicted_role ?? data.predictedRole ?? data.role ?? 'N/A',
        confidence: Math.max(0, Math.min(100, rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)),
        recommendations: Array.isArray(rawRecommendations) ? rawRecommendations.map((recommendation) => typeof recommendation === 'string' ? { title: recommendation, detail: '', action: '' } : { title: String(recommendation?.title ?? 'Recommendation'), detail: String(recommendation?.detail ?? ''), action: String(recommendation?.action ?? '') }) : [],
        raw: data,
      };
      setResults(normalized);
    } catch (err) {
      console.error('Error analyzing resume:', err);
      setToast({ type: 'error', message: (err && err.message) || 'Failed to analyze resume. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] text-gray-800 font-sans">
      
      {/* SIDEBAR */}
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
                  isActive ? 'bg-[#2b2b40] text-white' : 'hover:bg-[#232333] hover:text-white'
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

      {/* MAIN CONTENT AREA */}
      <main className="relative min-w-0 flex-1 overflow-auto bg-[#f4f7fe]">
        
        {/* HEADER */}
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

        {/* TOAST ALERTS */}
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
            
            {/* 1. REAL DYNAMIC DASHBOARD VIEW */}
            {activeNav === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="max-w-[1400px] mx-auto"
              >
                {loadingDashboard ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left & Center Column */}
                    <div className="xl:col-span-2 space-y-6">
                      
                      {/* DYNAMIC STATS ROW */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Applications" value={dashboardData.stats.applications || 0} trend="Real-time" icon={<Briefcase size={20} className="text-indigo-400"/>} />
                        <StatCard title="Profile Matches" value={dashboardData.stats.matches || 0} trend="Updated" icon={<Users size={20} className="text-blue-400"/>} />
                        <StatCard title="Interviews" value={dashboardData.stats.interviews || 0} trend="Pending" icon={<Calendar size={20} className="text-purple-400"/>} />
                        <StatCard title="Offers" value={dashboardData.stats.offers || 0} trend="Total" icon={<CheckCircle size={20} className="text-green-400"/>} />
                      </div>

                      {/* Quick Actions (Static Routing) */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <ActionCard icon={<Search className="text-blue-500" size={20}/>} title="Find Jobs" desc="Browse matches" onClick={() => setActiveNav('matches')}/>
                          <ActionCard icon={<FileText className="text-indigo-500" size={20}/>} title="Analyze CV" desc="Update resume" onClick={() => setActiveNav('analyzer')}/>
                          <ActionCard icon={<MessageSquare className="text-purple-500" size={20}/>} title="Mock Interview" desc="Practice now" onClick={() => setActiveNav('prep')}/>
                          <ActionCard icon={<TrendingUp className="text-green-500" size={20}/>} title="Skill Gaps" desc="View analysis" onClick={() => setActiveNav('analyzer')}/>
                        </div>
                      </div>

                      {/* DYNAMIC RECOMMENDED POSITIONS */}
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
                              {dashboardData.recommendedJobs?.length > 0 ? (
                                dashboardData.recommendedJobs.map((job, idx) => (
                                  <JobRow key={idx} role={job.title} company={job.company} match={`${job.match_score}%`} status="Apply Now" />
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                    No recommended positions found yet. Analyze your resume to get matches!
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      
                      {/* DYNAMIC SCHEDULE WIDGET */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex justify-between items-center">
                          Schedule
                          <MoreVertical size={16} className="text-gray-400"/>
                        </h2>
                        
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
                          {dashboardData.schedule?.length > 0 ? (
                            dashboardData.schedule.map((event, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className={`w-1 h-10 rounded-full mt-1 ${idx % 2 === 0 ? 'bg-indigo-500' : 'bg-purple-500'}`}></div>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm">{event.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{event.company} • {event.time}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-md font-bold border ${idx % 2 === 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                  {event.type}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No events scheduled for today.</p>
                          )}
                        </div>
                      </div>

                      {/* DYNAMIC ACTION REQUIRED WIDGET */}
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex justify-between items-center">
                          Action Required
                          <MoreVertical size={16} className="text-gray-400"/>
                        </h2>
                        
                        <div className="space-y-3">
                          {dashboardData.actions?.length > 0 ? (
                            dashboardData.actions.map((action, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 border border-orange-100 bg-orange-50/50 rounded-xl">
                                <div>
                                  <p className="font-bold text-sm text-gray-900">{action.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                                </div>
                                <button className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200">
                                  <Plus size={16} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">You're all caught up!</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. RESUME ANALYZER VIEW */}
            {activeNav === 'analyzer' && (
              <motion.div key="analyzer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="max-w-6xl mx-auto">
                 {/* (Your existing Resume Analyzer JSX code from previous response goes here) */}
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

/* HELPER COMPONENTS */

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
    <div onClick={onClick} className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center bg-gray-50/50 hover:bg-white">
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
          {match}
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