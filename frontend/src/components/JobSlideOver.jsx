import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  department: '',
  location: '',
  job_type: 'Full-time',
  experience_level: 'Entry level',
  minimum_threshold_score: '',
  required_skills: [],
  description: '',
};

function TextField({ label, value, onChange, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        {...props}
      />
    </label>
  );
}

export default function JobSlideOver({
  open,
  job = null,
  submitting = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [skillDraft, setSkillDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(job ? {
      title: job.title || '',
      department: job.department || '',
      location: job.location || '',
      job_type: job.job_type || 'Full-time',
      experience_level: job.experience_level || 'Entry level',
      minimum_threshold_score: job.minimum_threshold_score ?? '',
      required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
      description: job.description || '',
    } : EMPTY_FORM);
    setSkillDraft('');
  }, [open, job]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, submitting, onClose]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const addSkills = (value) => {
    const additions = value.split(/[;,]/).map((skill) => skill.trim()).filter(Boolean);
    if (!additions.length) return;
    setForm((current) => ({
      ...current,
      required_skills: [...new Set([...current.required_skills, ...additions])],
    }));
    setSkillDraft('');
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkills(skillDraft);
    } else if (event.key === 'Backspace' && !skillDraft && form.required_skills.length) {
      setForm((current) => ({ ...current, required_skills: current.required_skills.slice(0, -1) }));
    }
  };

  const handleSkillPaste = (event) => {
    const pasted = event.clipboardData.getData('text');
    if (/[;,]/.test(pasted)) {
      event.preventDefault();
      addSkills(pasted);
    }
  };

  const removeSkill = (skillToRemove) => {
    setForm((current) => ({
      ...current,
      required_skills: current.required_skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const skills = [...form.required_skills];
    const draftSkills = skillDraft.split(/[;,]/).map((skill) => skill.trim()).filter(Boolean);
    await onSubmit({
      ...form,
      required_skills: [...new Set([...skills, ...draftSkills])],
      minimum_threshold_score: form.minimum_threshold_score === ''
        ? null
        : Number(form.minimum_threshold_score),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <motion.button
            type="button"
            aria-label="Close job form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="relative flex h-full w-full max-w-3xl flex-col border-l border-slate-700 bg-slate-950 shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between border-b border-slate-800 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Recruiting workspace</p>
                <h2 id="job-drawer-title" className="mt-1 text-2xl font-bold text-white">{job ? 'Edit job opening' : 'Post a new job'}</h2>
                <p className="mt-1 text-sm text-slate-400">Add the details candidates need to decide whether to apply.</p>
              </div>
              <button type="button" disabled={submitting} onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"><X size={20} /></button>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 sm:px-8">
                <section>
                  <div className="mb-4"><h3 className="text-sm font-semibold text-white">Role details</h3><p className="mt-1 text-xs text-slate-500">Basic information about this opening.</p></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Job title" value={form.title} onChange={(value) => updateField('title', value)} required maxLength={200} placeholder="e.g. Senior Backend Engineer" />
                    <TextField label="Department" value={form.department} onChange={(value) => updateField('department', value)} placeholder="e.g. Engineering" />
                    <TextField label="Location" value={form.location} onChange={(value) => updateField('location', value)} placeholder="e.g. Remote or New York" />
                    <label className="block text-sm font-medium text-slate-300">Employment type
                      <select value={form.job_type} onChange={(event) => updateField('job_type', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option><option>Temporary</option></select>
                    </label>
                  </div>
                </section>

                <section>
                  <div className="mb-4"><h3 className="text-sm font-semibold text-white">Experience and match</h3><p className="mt-1 text-xs text-slate-500">Set a level and an optional minimum match score.</p></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-300">Experience level
                      <select value={form.experience_level} onChange={(event) => updateField('experience_level', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"><option>Entry level</option><option>Mid level</option><option>Senior level</option><option>Director</option><option>Any experience</option></select>
                    </label>
                    <TextField label={<span className="inline-flex items-center gap-1.5">Minimum match threshold <HelpCircle size={14} className="text-slate-500" title="Applicants meeting this score can trigger a notification when evaluated." /></span>} value={form.minimum_threshold_score} onChange={(value) => updateField('minimum_threshold_score', value)} type="number" min="0" max="100" placeholder="Optional · e.g. 70%" />
                  </div>
                </section>

                <section>
                  <div className="mb-3"><h3 className="text-sm font-semibold text-white">Required skills</h3><p className="mt-1 text-xs text-slate-500">Type a skill and press Enter or comma to add it.</p></div>
                  <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-2.5 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                    {form.required_skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
                        {skill}<button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`} className="text-indigo-300 hover:text-white">×</button>
                      </span>
                    ))}
                    <input
                      value={skillDraft}
                      onChange={(event) => setSkillDraft(event.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      onPaste={handleSkillPaste}
                      onBlur={() => skillDraft.trim() && addSkills(skillDraft)}
                      placeholder={form.required_skills.length ? 'Add another…' : 'Type a skill, then press Enter'}
                      className="min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-white">Job description</h3><p className="mt-1 text-xs text-slate-500">Describe responsibilities, qualifications, and what success looks like.</p></div><span className="text-xs text-slate-500">{form.description.length} characters</span></div>
                  <textarea required minLength={10} rows={9} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Write the role description…" className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" />
                </section>
                {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
              </div>

              <footer className="sticky bottom-0 flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur sm:px-8">
                <button type="button" disabled={submitting} onClick={onClose} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Saving…' : job ? 'Save changes' : 'Publish job opening'}</button>
              </footer>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
