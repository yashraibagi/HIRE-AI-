import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, FileText, Mail, RefreshCw, ShieldCheck, Upload, UserRound } from 'lucide-react';
import { getMyProfile, listMyApplications, saveProfileResume } from '../services/jobs';
import { openResume } from '../services/api';

const isPdf = (file) =>
  file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');

const dateLabel = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const statusClass = (status) => ({
  Shortlisted: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  Rejected: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  'Under Review': 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  Applied: 'border-indigo-400/20 bg-indigo-400/10 text-indigo-300',
}[status] || 'border-slate-700 bg-slate-800 text-slate-300');

export default function StudentProfile({ user }) {
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingResume, setSavingResume] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileData, myApplications] = await Promise.all([
        getMyProfile(),
        listMyApplications(),
      ]);
      setProfile(profileData);
      setApplications(myApplications);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isPdf(file)) {
      setError('Please select a PDF resume.');
      setMessage(null);
      return;
    }
    setSavingResume(true);
    setError('');
    setMessage(null);
    try {
      setProfile(await saveProfileResume(file));
      setMessage('Profile resume saved. You can choose it when applying to jobs.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.detail || uploadError.message || 'Could not upload your resume.');
    } finally {
      setSavingResume(false);
    }
  };

  const handlePreviewResume = async () => {
    try {
      await openResume(profile.profile_resume_url);
    } catch (previewError) {
      setError(previewError.response?.data?.detail || previewError.message || 'Could not preview your resume.');
    }
  };

  const shortlistedCount = applications.filter((application) => application.status === 'Shortlisted').length;
  const scoredCount = applications.filter((application) => application.match_score != null).length;

  return (
    <section className="mx-auto max-w-5xl space-y-7 p-6 md:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Your HireAI account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">My Profile</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your account details, reusable resume, and application activity.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading profile…</div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-6 md:p-8">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-200">
                <UserRound size={30} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-slate-950">{profile?.name || user?.displayName || 'Student'}</h2>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600"><Mail size={14} />{profile?.email || user?.email || 'No email available'}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-indigo-700"><ShieldCheck size={14} />{profile?.role || 'student'} account</span>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3 md:p-8">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applications</p><p className="mt-2 text-2xl font-bold text-slate-950">{applications.length}</p><p className="mt-1 text-xs text-slate-500">Jobs you have applied to</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shortlisted</p><p className="mt-2 text-2xl font-bold text-emerald-600">{shortlistedCount}</p><p className="mt-1 text-xs text-slate-500">Applications shortlisted by recruiters</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scored applications</p><p className="mt-2 text-2xl font-bold text-indigo-600">{scoredCount}</p><p className="mt-1 text-xs text-slate-500">Applications with a completed resume match</p></div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><FileText size={22} /></span>
                <div><h2 className="font-semibold text-slate-950">Profile resume</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Keep a resume on your profile to apply faster. You can still choose a different PDF for any individual job.</p></div>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleResumeUpload} />
              <button type="button" disabled={savingResume} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"><Upload size={16} />{savingResume ? 'Uploading…' : profile?.profile_resume_url ? 'Replace resume' : 'Upload resume'}</button>
            </div>
            {profile?.profile_resume_url ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex min-w-0 items-center gap-3"><CheckCircle2 size={19} className="shrink-0 text-emerald-600" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{profile.profile_resume_name || 'Saved resume.pdf'}</p><p className="mt-0.5 text-xs text-emerald-700">Saved to your profile · PDF</p></div></div>
                <button type="button" onClick={handlePreviewResume} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Preview resume</button>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No profile resume uploaded yet. Upload a PDF to make future applications quicker.</div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6 md:px-8"><div><h2 className="font-semibold text-slate-950">Recent applications</h2><p className="mt-1 text-sm text-slate-500">Your latest job application updates</p></div><BriefcaseBusiness size={20} className="text-slate-400" /></div>
            {applications.length ? (
              <div className="divide-y divide-slate-100">
                {applications.slice(0, 5).map((application) => (
                  <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 md:px-8">
                    <div><p className="font-medium text-slate-900">{application.job_title}</p><p className="mt-1 text-xs text-slate-500">Applied {dateLabel(application.applied_at)}{application.match_score != null ? ` · ${application.match_score}% match` : ''}</p></div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(application.status)}`}>{application.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">No applications yet. Browse open jobs to get started.</div>
            )}
          </section>

          <div className="flex justify-end"><button type="button" onClick={loadProfile} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700"><RefreshCw size={14} />Refresh profile</button></div>
        </>
      )}
    </section>
  );
}
