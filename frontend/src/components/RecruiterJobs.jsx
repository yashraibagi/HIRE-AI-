import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Copy,
  ExternalLink,
  LoaderCircle,
  Mail,
  MailCheck,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import {
  createJob,
  emailCandidate,
  evaluateJobApplications,
  listApplications,
  listRecruiterJobs,
  shortlistApplication,
  updateApplicationStatus,
  updateJob,
} from '../services/jobs';
import { openResume } from '../services/api';
import JobSlideOver from './JobSlideOver';

const statuses = ['Applied', 'Under Review', 'Shortlisted', 'Rejected'];

const displayDate = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleDateString();
};

export default function RecruiterJobs({ user }) {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All statuses');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const [notice, setNotice] = useState('');
  const [menuJobId, setMenuJobId] = useState(null);
  const [shortlistingId, setShortlistingId] = useState(null);
  const [emailDraftApplication, setEmailDraftApplication] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailUseMailClient, setEmailUseMailClient] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState(() => new Set());

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const recruiterJobs = await listRecruiterJobs();
      setJobs(
        recruiterJobs.map((job) => ({
          ...job,
          applicant_count: Number(job.applicant_count ?? 0),
          shortlisted_count: Number(job.shortlisted_count ?? 0),
        }))
      );
      setError('');
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Could not load your jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadApplications = async (job) => {
    setSelectedJob(job);
    setFilterStatus('All statuses');
    setApplications([]);
    setLoading(true);
    setError('');
    try {
      setApplications(await listApplications(job.id));
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Could not load applicants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const filteredApplications = useMemo(() => applications
    .filter((application) => filterStatus === 'All statuses' || application.status === filterStatus)
    .sort((a, b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0)), [applications, filterStatus]);

  const toggleDescription = (jobId) => {
    setExpandedDescriptions((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const openCreateDrawer = () => {
    setEditingJob(null);
    setDrawerError('');
    setDrawerOpen(true);
  };

  const openEditDrawer = (job) => {
    setEditingJob(job);
    setDrawerError('');
    setMenuJobId(null);
    setDrawerOpen(true);
  };

  const handleSaveJob = async (values) => {
    setBusy(true);
    setDrawerError('');
    try {
      if (editingJob) {
        await updateJob(editingJob.id, values);
        setNotice('Job changes saved.');
      } else {
        await createJob(user, values);
        setNotice('Job published. Candidates can now apply.');
      }
      setDrawerOpen(false);
      setEditingJob(null);
      await loadJobs();
    } catch (saveError) {
      setDrawerError(saveError.response?.data?.detail || saveError.message || 'Could not save this job.');
    } finally {
      setBusy(false);
    }
  };

  const toggleJobStatus = async (job) => {
    setMenuJobId(null);
    setError('');
    try {
      await updateJob(job.id, { is_active: !job.is_active });
      setNotice(job.is_active ? 'Job closed. Applicants can no longer apply.' : 'Job reopened. Candidates can apply again.');
      await loadJobs();
    } catch (statusError) {
      setError(statusError.response?.data?.detail || statusError.message || 'Could not update this job.');
    }
  };

  const shareJob = async (job) => {
    setMenuJobId(null);
    const shareText = `${job.title} — ${job.location || 'Location not specified'}\nApply through HireAI: ${window.location.origin}/student`;
    try {
      if (navigator.share) await navigator.share({ title: job.title, text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setNotice('Job link copied to clipboard.');
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setError('Could not share this job from the current browser.');
    }
  };

  const handleStatus = async (application, status) => {
    try {
      if (status === 'Shortlisted') {
        await handleShortlist(application);
        return;
      }
      await updateApplicationStatus(application.id, status);
      setApplications((current) => current.map((entry) => entry.id === application.id ? { ...entry, status } : entry));
      await loadJobs();
    } catch (statusError) {
      setError(statusError.response?.data?.detail || statusError.message || 'Could not update applicant status.');
    }
  };

  const handleShortlist = async (application) => {
    setShortlistingId(application.id);
    setError('');
    setNotice('');
    try {
      const result = await shortlistApplication(application.id);
      setApplications(await listApplications(selectedJob.id));
      setNotice(result.message);
      await loadJobs();
    } catch (shortlistError) {
      setError(shortlistError.response?.data?.detail || shortlistError.message || 'Could not shortlist this applicant.');
    } finally {
      setShortlistingId(null);
    }
  };

  const openEmailDraft = (application) => {
    const roleTitle = selectedJob?.title || 'the role';
    const recruiterName = user?.displayName || selectedJob?.recruiter_name || 'Hiring Team';
    const roleDetails = [
      `Role: ${roleTitle}`,
      selectedJob?.department && `Department: ${selectedJob.department}`,
      selectedJob?.job_type && `Employment type: ${selectedJob.job_type}`,
      selectedJob?.location && `Location: ${selectedJob.location}`,
      selectedJob?.experience_level && `Experience level: ${selectedJob.experience_level}`,
    ].filter(Boolean).join('\n');
    const matchedSkills = application.matched_skills?.slice(0, 5) || [];
    const strengthsParagraph = matchedSkills.length
      ? `Your experience with ${matchedSkills.join(', ')} stood out in our review.\n\n`
      : '';
    setEmailDraftApplication(application);
    setEmailSubject(`Shortlisted: ${roleTitle} | next steps`);
    setEmailBody(
      `Hi ${application.student_name || 'there'},\n\n` +
      `Thank you for applying for the ${roleTitle} position at HireAI. We are pleased to let you know that your application has been shortlisted.\n\n` +
      `${strengthsParagraph}` +
      `Role details:\n${roleDetails}\n\n` +
      'We would like to continue the conversation. If you remain interested, please reply with a few times that work for an initial discussion. We will coordinate a time and share the meeting details.\n\n' +
      'Please reply to this email if you have any questions.\n\n' +
      `Best regards,\n${recruiterName}\n${roleTitle} Hiring Team\nHireAI`
    );
    setEmailError('');
    setEmailUseMailClient(false);
    setEmailCopied(false);
  };

  const handleCopyEmailMessage = async () => {
    try {
      await navigator.clipboard.writeText(emailBody);
      setEmailCopied(true);
      setEmailError('');
    } catch {
      setEmailError('Could not copy the message. Select and copy it from the message field.');
    }
  };

  const handleSendCandidateEmail = async (event) => {
    event.preventDefault();
    if (!emailDraftApplication) return;
    setEmailSending(true);
    setEmailError('');
    try {
      const result = await emailCandidate(emailDraftApplication.id, {
        subject: emailSubject,
        body: emailBody,
      });
      setNotice(result.message);
      setEmailDraftApplication(null);
    } catch (sendError) {
      if (sendError.response?.status === 503) {
        setEmailUseMailClient(true);
        setEmailError('');
      } else {
        setEmailError(sendError.response?.data?.detail || sendError.message || 'Could not send this email.');
      }
    } finally {
      setEmailSending(false);
    }
  };

  const handleBatchScore = async () => {
    if (!selectedJob || !applications.length) return;
    setBusy(true);
    setError('');
    setNotice('Scoring applicant resumes…');
    try {
      const result = await evaluateJobApplications(selectedJob.id);
      setApplications(await listApplications(selectedJob.id));
      setNotice(`Batch evaluation complete: ${result.evaluated} evaluated${result.failed ? `, ${result.failed} failed` : ''}${result.emails_queued ? `, ${result.emails_queued} threshold email(s) queued` : ''}.`);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Could not evaluate pending applicants.');
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async (application) => {
    try {
      await openResume(application.resume_file_url);
    } catch (resumeError) {
      setError(resumeError.message || 'Could not open the stored resume.');
    }
  };

  return (
    <section className="space-y-6 text-zinc-100 bg-zinc-950 min-h-full">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Recruiting workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-100">{selectedJob ? selectedJob.title : 'Jobs & applicants'}</h1>
          <p className="mt-1 text-sm font-light text-zinc-400">{selectedJob ? 'Review candidate fit and manage your hiring pipeline.' : 'Create openings, track applicant activity, and manage your hiring pipeline.'}</p>
        </div>
        {selectedJob ? (
          <button type="button" onClick={() => { setSelectedJob(null); setError(''); setNotice(''); loadJobs(); }} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100">
            <ArrowLeft size={16} /> All jobs
          </button>
        ) : (
          <button type="button" onClick={openCreateDrawer} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-white">
            <Plus size={18} /> Post New Job
          </button>
        )}
      </header>

      {error && <div role="alert" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{notice}</div>}

      {selectedJob ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-md shadow-sm">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-light text-zinc-300">
              <span>{selectedJob.department}</span><span>{selectedJob.location}</span><span>{selectedJob.job_type}</span><span>{selectedJob.experience_level}</span>
              {selectedJob.minimum_threshold_score != null && <span>Minimum match: {selectedJob.minimum_threshold_score}%</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Filter applicants by status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600 focus:bg-zinc-900">
                <option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <button type="button" disabled={busy || applications.length === 0} onClick={handleBatchScore} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 shadow-sm">
                {busy ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} Score pending resumes
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-sm backdrop-blur-md">
            {loading ? <div className="p-10 text-center text-sm font-light text-zinc-400">Loading applicants…</div> : applications.length === 0 ? (
              <div className="p-14 text-center"><Users className="mx-auto mb-3 text-zinc-500" size={34} /><p className="font-semibold text-zinc-100">No applicants yet</p><p className="mt-1 text-sm font-light text-zinc-400">Applications for this opening will appear here.</p></div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-400"><tr>
                  <th className="px-4 py-3 font-medium">Candidate</th><th className="px-4 py-3 font-medium">Applied</th><th className="px-4 py-3 font-medium">ATS / match</th><th className="px-4 py-3 font-medium">Matched skills</th><th className="px-4 py-3 font-medium">Missing skills</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Resume</th><th className="px-4 py-3 font-medium">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="align-top transition hover:bg-zinc-900/40">
                      <td className="px-4 py-4"><p className="font-medium text-zinc-100">{application.student_name}</p>{application.student_email ? <a href={`mailto:${application.student_email}?subject=${encodeURIComponent(`Regarding your application for ${selectedJob.title}`)}`} className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white transition-colors"><Mail size={12} />{application.student_email}</a> : <p className="mt-1 text-xs font-light text-zinc-500">Details hidden during blind screening</p>}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-zinc-300 font-light">{displayDate(application.applied_at)}</td>
                      <td className="max-w-64 px-4 py-4"><p className="whitespace-nowrap font-semibold text-zinc-100">{application.ats_score == null ? '—' : `${application.ats_score}% ATS`}</p><p className="mt-1 whitespace-nowrap text-xs font-light text-zinc-400">{application.match_score == null ? (application.scoring_error ? 'Scoring failed' : 'Not scored') : `${application.match_score}% match`}</p>{application.summary && <p className="mt-2 line-clamp-3 text-xs leading-5 font-light text-zinc-400" title={application.summary}>{application.summary}</p>}</td>
                      <td className="max-w-48 px-4 py-4 text-xs font-light text-zinc-300">{application.matched_skills?.length ? application.matched_skills.join(', ') : '—'}</td>
                      <td className="max-w-48 px-4 py-4 text-xs font-light text-zinc-400">{application.missing_skills?.length ? application.missing_skills.join(', ') : '—'}</td>
                      <td className="px-4 py-4"><select aria-label={`Status for ${application.student_name}`} value={application.status || 'Applied'} onChange={(event) => handleStatus(application, event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 outline-none">{statuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                      <td className="px-4 py-4">{application.resume_file_url ? <><button type="button" onClick={() => handleResume(application)} className="inline-flex items-center gap-1.5 whitespace-nowrap text-zinc-300 hover:text-white transition-colors text-xs font-medium"><ExternalLink size={15} /> Preview PDF</button><p className="mt-1 max-w-36 truncate text-xs font-light text-zinc-500" title={application.resume_name}>{application.resume_name}</p></> : <span className="text-xs font-light text-zinc-500">Masked</span>}</td>
                      <td className="px-4 py-4">{application.status === 'Shortlisted' ? <div className="flex flex-col items-start gap-2"><span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-zinc-200"><MailCheck size={15} /> Shortlisted</span><button type="button" onClick={() => openEmailDraft(application)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"><Mail size={14} /> Email candidate</button></div> : <button type="button" disabled={shortlistingId === application.id} onClick={() => handleShortlist(application)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-950 transition hover:bg-white disabled:opacity-60 shadow-sm">{shortlistingId === application.id ? <LoaderCircle size={14} className="animate-spin" /> : <MailCheck size={14} />} Shortlist & Notify</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
          <p className="text-xs font-light text-zinc-500">Applicants are sorted by match percentage, highest fit first. ATS score is shown separately.</p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-zinc-100">Your posted jobs</h2><p className="mt-1 text-sm font-light text-zinc-400">Manage openings and jump directly into applicant review.</p></div><span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300">{jobs.length} {jobs.length === 1 ? 'opening' : 'openings'}</span></div>
          {loading ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-sm font-light text-zinc-400 backdrop-blur-md">Loading your jobs…</div> : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center sm:p-16 backdrop-blur-md"><BriefcaseBusiness className="mx-auto mb-4 text-zinc-500" size={38} /><h3 className="text-lg font-semibold text-zinc-100">No job openings yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 font-light text-zinc-400">Post your first role to publish it to students and start receiving scored applications.</p><button type="button" onClick={openCreateDrawer} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-white shadow-sm"><Plus size={17} /> Post New Job</button></div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm transition hover:border-zinc-700 sm:p-6 backdrop-blur-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5"><h3 className="text-lg font-semibold tracking-tight text-zinc-100">{job.title}</h3><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${job.is_active ? 'border-zinc-700 bg-zinc-800 text-zinc-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>{job.is_active ? 'Open' : 'Closed'}</span><span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300">{job.job_type}</span></div>
                      <p className="mt-1.5 text-sm font-light text-zinc-400">{job.department || 'General'} <span className="px-1 text-zinc-600">·</span> {job.location || 'Location flexible'} <span className="px-1 text-zinc-600">·</span> {job.experience_level}</p>
                    </div>
                    <div className="relative">
                      <button type="button" aria-label={`More options for ${job.title}`} aria-expanded={menuJobId === job.id} onClick={() => setMenuJobId((current) => current === job.id ? null : job.id)} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"><MoreHorizontal size={18} /></button>
                      {menuJobId === job.id && <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl backdrop-blur-xl"><button type="button" onClick={() => openEditDrawer(job)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-light text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition-colors">Edit job</button><button type="button" onClick={() => shareJob(job)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-light text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition-colors">Share job</button><button type="button" onClick={() => toggleJobStatus(job)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-light text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100 transition-colors">{job.is_active ? 'Close job' : 'Reopen job'}</button></div>}
                    </div>
                  </div>
                  <p id={`recruiter-job-description-${job.id}`} className={`mt-4 max-w-5xl whitespace-pre-line text-left text-sm leading-6 font-light text-zinc-300 ${expandedDescriptions.has(job.id) ? '' : 'line-clamp-3'}`}>{job.description}</p>
                  {job.description?.length > 260 && <button type="button" aria-expanded={expandedDescriptions.has(job.id)} aria-controls={`recruiter-job-description-${job.id}`} onClick={() => toggleDescription(job.id)} className="mt-2 text-sm font-medium text-zinc-200 hover:text-white transition-colors">{expandedDescriptions.has(job.id) ? 'Show less' : 'Read full description'}</button>}
                  <div className="mt-4 flex flex-wrap gap-2">{(job.required_skills || []).map((skill) => <span key={skill} className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs font-light text-zinc-300">{skill}</span>)}</div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-4">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-light text-zinc-400"><span className="inline-flex items-center gap-1.5"><Users size={15} />{job.applicant_count} applicants</span><span className="inline-flex items-center gap-1.5"><MailCheck size={15} className="text-zinc-300" />{job.shortlisted_count} shortlisted</span>{job.minimum_threshold_score != null && <span>Minimum match {job.minimum_threshold_score}%</span>}</div>
                    <button type="button" onClick={() => loadApplications(job)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white shadow-sm"><Users size={16} /> Review Applicants</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {emailDraftApplication && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-zinc-950/80 backdrop-blur-sm p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-email-title"
            onSubmit={handleSendCandidateEmail}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl text-zinc-100 sm:p-6 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="candidate-email-title" className="text-lg font-semibold text-zinc-100">Email candidate</h2>
                <p className="mt-1 text-sm font-light text-zinc-400">To: {emailDraftApplication.student_name} &lt;{emailDraftApplication.student_email}&gt;</p>
                <p className="text-sm font-light text-zinc-400">Role: {selectedJob?.title}</p>
              </div>
              <button type="button" aria-label="Close email draft" onClick={() => setEmailDraftApplication(null)} disabled={emailSending} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-50"><X size={18} /></button>
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-zinc-200">
              Subject
              <input required maxLength={200} value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 font-normal text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-zinc-200">
              Message
              <textarea required maxLength={10000} rows={6} value={emailBody} onChange={(event) => setEmailBody(event.target.value)} className="h-48 max-h-[32vh] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 font-normal leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-700" />
            </label>
            {emailCopied && <p role="status" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">Message copied. Paste it into the email body.</p>}
            {emailError && <p role="alert" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">{emailError}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-4">
              <button type="button" onClick={() => setEmailDraftApplication(null)} disabled={emailSending} className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleCopyEmailMessage} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"><Copy size={16} /> Copy message</button>
              {emailUseMailClient ? (
                <a href={`mailto:${emailDraftApplication.student_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white shadow-sm"><Mail size={16} /> Open email app</a>
              ) : (
                <button type="submit" disabled={emailSending || !emailSubject.trim() || !emailBody.trim()} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 shadow-sm">
                  {emailSending ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
                  {emailSending ? 'Sending…' : 'Send email'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <JobSlideOver
        open={drawerOpen}
        job={editingJob}
        submitting={busy}
        error={drawerError}
        onClose={() => { if (!busy) { setDrawerOpen(false); setEditingJob(null); setDrawerError(''); } }}
        onSubmit={handleSaveJob}
      />
    </section>
  );
}