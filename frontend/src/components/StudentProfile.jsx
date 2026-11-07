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
  Shortlisted: 'border-zinc-700 bg-zinc-900 text-zinc-100',
  Rejected: 'border-zinc-800 bg-zinc-950/60 text-zinc-400',
  'Under Review': 'border-zinc-700 bg-zinc-900 text-zinc-200',
  Applied: 'border-zinc-800 bg-zinc-900/60 text-zinc-300',
}[status] || 'border-zinc-800 bg-zinc-900 text-zinc-300');

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
    <section className="mx-auto max-w-5xl space-y-7 p-6 md:p-8 bg-zinc-950 text-zinc-100 min-h-full">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Your HireAI account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">My Profile</h1>
        <p className="mt-2 text-sm font-light text-zinc-400">Manage your account details, reusable resume, and application activity.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{message}</div>}

      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm font-light text-zinc-400 backdrop-blur-md">Loading profile…</div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-4 border-b border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-100 shadow-sm">
                <UserRound size={30} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-zinc-100">{profile?.name || user?.displayName || 'Student'}</h2>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-light text-zinc-400"><Mail size={14} />{profile?.email || user?.email || 'No email available'}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold capitalize text-zinc-200"><ShieldCheck size={14} />{profile?.role || 'student'} account</span>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3 md:p-8">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Applications</p><p className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{applications.length}</p><p className="mt-1 text-xs font-light text-zinc-500">Jobs you have applied to</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Shortlisted</p><p className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{shortlistedCount}</p><p className="mt-1 text-xs font-light text-zinc-500">Applications shortlisted by recruiters</p></div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Scored applications</p><p className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{scoredCount}</p><p className="mt-1 text-xs font-light text-zinc-500">Applications with a completed resume match</p></div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm md:p-8 backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-200"><FileText size={22} /></span>
                <div><h2 className="font-semibold text-zinc-100">Profile resume</h2><p className="mt-1 max-w-xl text-sm leading-6 font-light text-zinc-400">Keep a resume on your profile to apply faster. You can still choose a different PDF for any individual job.</p></div>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={handleResumeUpload} />
              <button type="button" disabled={savingResume} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 shadow-sm">{savingResume ? 'Uploading…' : profile?.profile_resume_url ? 'Replace resume' : 'Upload resume'}</button>
            </div>
            {profile?.profile_resume_url ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex min-w-0 items-center gap-3"><CheckCircle2 size={19} className="shrink-0 text-zinc-300" /><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-100">{profile.profile_resume_name || 'Saved resume.pdf'}</p><p className="mt-0.5 text-xs font-light text-zinc-400">Saved to your profile · PDF</p></div></div>
                <button type="button" onClick={handlePreviewResume} className="text-sm font-medium text-zinc-200 hover:text-white transition-colors">Preview resume</button>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-sm font-light text-zinc-400">No profile resume uploaded yet. Upload a PDF to make future applications quicker.</div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 p-6 md:px-8"><div><h2 className="font-semibold text-zinc-100">Recent applications</h2><p className="mt-1 text-sm font-light text-zinc-400">Your latest job application updates</p></div><BriefcaseBusiness size={20} className="text-zinc-500" /></div>
            {applications.length ? (
              <div className="divide-y divide-zinc-800">
                {applications.slice(0, 5).map((application) => (
                  <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 md:px-8 hover:bg-zinc-900/40 transition-colors">
                    <div><p className="font-medium text-zinc-100">{application.job_title}</p><p className="mt-1 text-xs font-light text-zinc-400">Applied {dateLabel(application.applied_at)}{application.match_score != null ? ` · ${application.match_score}% match` : ''}</p></div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(application.status)}`}>{application.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-light text-zinc-400">No applications yet. Browse open jobs to get started.</div>
            )}
          </section>

          <div className="flex justify-end"><button type="button" onClick={loadProfile} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-zinc-100"><RefreshCw size={14} />Refresh profile</button></div>
        </>
      )}
    </section>
  );
}