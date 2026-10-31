import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, ChevronDown, ChevronUp, MapPin, Upload, X } from 'lucide-react';
import {
  getMyProfile,
  listMyApplications,
  listOpenJobs,
  saveProfileResume,
  submitApplication,
} from '../services/jobs';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
};
const isPdfFile = (file) =>
  file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');

export default function StudentJobs({ user, view = 'browse' }) {
  const profileInputRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState(() => new Set());
  const [profile, setProfile] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeChoice, setResumeChoice] = useState('profile');
  const [newResume, setNewResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const profileData = await getMyProfile();
      const [openJobs, myApplications] = await Promise.all([
        listOpenJobs(),
        listMyApplications(),
      ]);
      setProfile(profileData);
      setJobs(openJobs);
      setApplications(myApplications);
      setError('');
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Could not load jobs and applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const applicationFor = (jobId) => applications.find((application) => application.job_id === jobId);

  const toggleDescription = (jobId) => {
    setExpandedDescriptions((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const openApplyModal = (job) => {
    setSelectedJob(job);
    setResumeChoice(profile?.profile_resume_url ? 'profile' : 'new');
    setNewResume(null);
    setError('');
  };

  const handleProfileResume = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isPdfFile(file)) {
      setError('Please choose a PDF resume.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('Saving your profile resume…');
    try {
      setProfile(await saveProfileResume(file));
      setNotice('Profile resume saved. You can reuse it for future applications.');
    } catch (saveError) {
      setError(saveError.response?.data?.detail || saveError.message || 'Could not save your profile resume.');
      setNotice('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (event) => {
    event.preventDefault();
    if (resumeChoice === 'new' && !isPdfFile(newResume)) {
      setError('Select a PDF resume to continue.');
      return;
    }
    if (resumeChoice === 'profile' && !profile?.profile_resume_url) {
      setError('Upload a profile resume first, or choose a new PDF.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitApplication(selectedJob, user, {
        pdfFile: resumeChoice === 'new' ? newResume : null,
        useProfileResume: resumeChoice === 'profile',
      });
      setSelectedJob(null);
      setNewResume(null);
      setNotice(`Application submitted for ${selectedJob.title}. Your resume was scored automatically.`);
      await loadData();
    } catch (applyError) {
      setError(applyError.response?.data?.detail || applyError.message || 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 p-5 text-left sm:p-6 lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">Find your next opportunity</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{view === 'applied' ? 'Applied jobs' : 'Browse jobs'}</h1>
        <p className="mt-2 text-slate-600">{view === 'applied' ? 'Track your applications and their latest review status.' : 'Explore active openings and apply with a saved or job-specific PDF resume.'}</p>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{notice}</div>}

      {view === 'browse' && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div><p className="font-semibold text-slate-900">Profile resume</p><p className="mt-1 text-sm text-slate-500">{profile?.profile_resume_name || 'Save a resume to reuse it when applying.'}</p></div>
          <input ref={profileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleProfileResume} />
          <button disabled={submitting} onClick={() => profileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"><Upload size={16} />{profile?.profile_resume_url ? 'Replace resume' : 'Upload profile resume'}</button>
        </div>
      )}

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading…</div> : view === 'applied' ? (
        applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><BriefcaseBusiness className="mx-auto mb-3 text-slate-400" size={36} /><p className="font-semibold text-slate-800">No applications yet</p><p className="mt-1 text-sm text-slate-500">Browse open jobs and submit an application to see it here.</p></div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <article key={application.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div><h2 className="font-bold text-slate-900">{application.job_title}</h2><p className="mt-1 text-sm text-slate-500">Applied {formatDate(application.applied_at)} · {application.resume_name}</p><p className="mt-2 text-xs text-slate-500">{application.match_score == null ? (application.scoring_error ? 'Score pending review' : 'Scoring pending') : `${application.match_score}% match · ${application.ats_score ?? '—'}% ATS`}</p>{application.summary && <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-600">{application.summary}</p>}</div>
                <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${application.status === 'Shortlisted' ? 'bg-emerald-100 text-emerald-700' : application.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : application.status === 'Under Review' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{application.status}</span>
              </article>
            ))}
          </div>
        )
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><BriefcaseBusiness className="mx-auto mb-3 text-slate-400" size={36} /><p className="font-semibold text-slate-800">No open jobs right now</p><p className="mt-1 text-sm text-slate-500">Check back later for new opportunities.</p></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {jobs.map((job) => {
            const application = applicationFor(job.id);
            return (
              <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">{job.title}</h2><p className="mt-1 text-sm text-slate-600">{job.recruiter_name} · {job.department}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{job.job_type}</span></div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={15} />{job.location}</span><span>{job.experience_level}</span></div>
                <p id={`job-description-${job.id}`} className={`mt-4 whitespace-pre-line text-left text-sm leading-6 text-slate-700 ${expandedDescriptions.has(job.id) ? '' : 'line-clamp-4'}`}>{job.description}</p>
                {job.description?.length > 220 && <button type="button" aria-expanded={expandedDescriptions.has(job.id)} aria-controls={`job-description-${job.id}`} onClick={() => toggleDescription(job.id)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800">{expandedDescriptions.has(job.id) ? <>Show less <ChevronUp size={16} /></> : <>Read full description <ChevronDown size={16} /></>}</button>}
                <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p><div className="mt-2 flex flex-wrap gap-2">{(job.required_skills || []).map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{skill}</span>)}</div></div>
                {job.minimum_threshold_score != null && <p className="mt-3 text-xs text-slate-500">Suggested minimum match: {job.minimum_threshold_score}%</p>}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  {application ? (
                    <div className="flex items-center justify-between gap-2"><div><p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Applied · {application.status}</p><p className="mt-1 text-xs text-slate-500">{application.match_score == null ? 'Score pending' : `${application.match_score}% match · ${application.ats_score ?? '—'}% ATS`}</p></div></div>
                  ) : (
                    <button disabled={submitting} onClick={() => openApplyModal(job)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"><Upload size={17} />Apply Now</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setSelectedJob(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="apply-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><h2 id="apply-title" className="text-xl font-bold text-slate-900">Apply to {selectedJob.title}</h2><p className="mt-1 text-sm text-slate-500">Choose which PDF resume to include with this application.</p></div><button aria-label="Close application dialog" disabled={submitting} onClick={() => setSelectedJob(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
            <form onSubmit={handleApply} className="mt-5 space-y-3">
              {profile?.profile_resume_url ? (
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${resumeChoice === 'profile' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><input type="radio" name="resumeChoice" value="profile" checked={resumeChoice === 'profile'} onChange={() => setResumeChoice('profile')} className="mt-1 accent-indigo-600" /><span><span className="block font-semibold text-slate-900">Use saved profile resume</span><span className="mt-1 block text-sm text-slate-500">{profile.profile_resume_name}</span></span></label>
              ) : (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You have no saved profile resume yet. Upload one below, or save one on the Browse Jobs page first.</div>
              )}
              <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${resumeChoice === 'new' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><input type="radio" name="resumeChoice" value="new" checked={resumeChoice === 'new'} onChange={() => setResumeChoice('new')} className="mt-1 accent-indigo-600" /><span className="block w-full"><span className="block font-semibold text-slate-900">Upload a different PDF for this job</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => setNewResume(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-medium" /></span></label>
              {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <button disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit application'}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
