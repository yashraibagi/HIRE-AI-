import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  Check,
  FileText,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { openResume } from '../services/api';
import { saveProfileResume } from '../services/jobs';
import {
  updateUserPreferences,
  updateUserProfile,
  uploadCompanyLogo,
  uploadProfileAvatar,
} from '../services/profile';

const tabs = [
  { id: 'personal', label: 'Personal details', icon: UserRound },
  { id: 'preferences', label: 'Preferences', icon: BriefcaseBusiness },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

const jobTypes = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];

const joinItems = (items) => Array.isArray(items) ? items.join(', ') : '';
const splitItems = (value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];

const dateLabel = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
      />
    </label>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', ...props }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        {...props}
      />
    </label>
  );
}

export default function ProfileModal({
  open,
  initialTab = 'personal',
  profile,
  role,
  authUser,
  avatarSrc,
  companyLogoSrc,
  onClose,
  onProfileUpdated,
}) {
  const isRecruiter = (profile?.role || role) === 'recruiter';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profileForm, setProfileForm] = useState({});
  const [preferences, setPreferences] = useState({});
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [companyLogoSaving, setCompanyLogoSaving] = useState(false);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const avatarInput = useRef(null);
  const companyLogoInput = useRef(null);
  const resumeInput = useRef(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
    setProfileForm({
      name: profile?.name || authUser?.displayName || '',
      phone: profile?.phone || '',
      professional_title: profile?.professional_title || '',
      company: profile?.company || '',
      company_bio: profile?.company_bio || '',
      college: profile?.college || '',
      degree: profile?.degree || '',
      graduation_year: profile?.graduation_year || '',
      linkedin_url: profile?.linkedin_url || '',
      github_url: profile?.github_url || '',
      portfolio_url: profile?.portfolio_url || '',
    });
    const saved = profile?.preferences || {};
    setPreferences({
      email_new_applicant_alerts: saved.email_new_applicant_alerts ?? true,
      email_shortlist_updates: saved.email_shortlist_updates ?? true,
      blind_screening: saved.blind_screening ?? false,
      default_ats_threshold: saved.default_ats_threshold ?? 70,
      shortlist_email_template: saved.shortlist_email_template || '',
      target_job_roles: joinItems(saved.target_job_roles),
      preferred_job_types: saved.preferred_job_types || [],
      primary_skills: joinItems(saved.primary_skills),
    });
    setNotice('');
    setError('');
    setPasswordForm({ current: '', next: '', confirm: '' });
  }, [open, initialTab, profile, authUser]);

  const changeProfile = (field, value) => setProfileForm((current) => ({ ...current, [field]: value }));
  const changePreference = (field, value) => setPreferences((current) => ({ ...current, [field]: value }));

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateUserProfile({
        ...profileForm,
        graduation_year: profileForm.graduation_year ? Number(profileForm.graduation_year) : null,
      });
      let displayNameSynced = true;
      if (authUser && authUser.displayName !== updated.name) {
        try {
          await updateProfile(authUser, { displayName: updated.name });
        } catch {
          displayNameSynced = false;
        }
      }
      onProfileUpdated(updated);
      setNotice(displayNameSynced
        ? 'Profile details saved.'
        : 'Profile saved, but your sign-in provider did not allow the display name to sync.');
    } catch (saveError) {
      setError(saveError.response?.data?.detail || saveError.message || 'Could not save profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const values = isRecruiter
      ? {
          email_new_applicant_alerts: preferences.email_new_applicant_alerts,
          blind_screening: preferences.blind_screening,
          default_ats_threshold: Number(preferences.default_ats_threshold),
          shortlist_email_template: preferences.shortlist_email_template,
        }
      : {
          email_shortlist_updates: preferences.email_shortlist_updates,
          target_job_roles: splitItems(preferences.target_job_roles || ''),
          preferred_job_types: preferences.preferred_job_types,
          primary_skills: splitItems(preferences.primary_skills || ''),
        };
    try {
      const updated = await updateUserPreferences(values);
      onProfileUpdated(updated);
      setNotice('Preferences saved.');
    } catch (saveError) {
      setError(saveError.response?.data?.detail || saveError.message || 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.type) || image.size > 2 * 1024 * 1024) {
      setError('Choose a PNG, JPEG, or WebP image under 2 MB.');
      return;
    }
    setAvatarSaving(true);
    setError('');
    try {
      onProfileUpdated(await uploadProfileAvatar(image));
      setNotice('Profile photo updated.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.detail || uploadError.message || 'Could not upload profile photo.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleCompanyLogoChange = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.type) || image.size > 2 * 1024 * 1024) {
      setError('Choose a PNG, JPEG, or WebP logo under 2 MB.');
      return;
    }
    setCompanyLogoSaving(true);
    setError('');
    try {
      onProfileUpdated(await uploadCompanyLogo(image));
      setNotice('Company logo updated.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.detail || uploadError.message || 'Could not upload company logo.');
    } finally {
      setCompanyLogoSaving(false);
    }
  };

  const handleResumeChange = async (event) => {
    const resume = event.target.files?.[0];
    event.target.value = '';
    if (!resume) return;
    if (resume.type !== 'application/pdf' && !resume.name.toLowerCase().endsWith('.pdf')) {
      setError('Choose a PDF resume.');
      return;
    }
    setResumeSaving(true);
    setError('');
    try {
      const updated = await saveProfileResume(resume);
      onProfileUpdated({ ...profile, ...updated, profile_resume_updated_at: new Date().toISOString() });
      setNotice('Master resume updated.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.detail || uploadError.message || 'Could not upload resume.');
    } finally {
      setResumeSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (passwordForm.next.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(authUser.email, passwordForm.current);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      setNotice('Password updated.');
    } catch (passwordError) {
      setError(passwordError.code === 'auth/wrong-password' || passwordError.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : passwordError.message || 'Could not update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const toggleJobType = (jobType) => {
    const selected = preferences.preferred_job_types || [];
    changePreference(
      'preferred_job_types',
      selected.includes(jobType) ? selected.filter((item) => item !== jobType) : [...selected, jobType],
    );
  };

  const handleResumePreview = async () => {
    try {
      await openResume(profile.profile_resume_url);
    } catch (previewError) {
      setError(previewError.response?.data?.detail || previewError.message || 'Could not preview the resume.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-80 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Account</p>
                <h2 id="profile-dialog-title" className="mt-1 text-xl font-bold text-slate-950">Profile & settings</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close profile settings" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"><X size={19} /></button>
            </header>

            <nav aria-label="Profile settings" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-2 sm:px-6">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={activeTab === id ? 'page' : undefined}
                  onClick={() => { setActiveTab(id); setNotice(''); setError(''); }}
                  className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${activeTab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  <Icon size={16} />{label}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
              {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

              {activeTab === 'personal' && (
                <form onSubmit={handleProfileSave} className="space-y-5">
                  <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700">
                      {avatarSrc ? <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" /> : (profileForm.name || profile?.email || 'U').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">Profile photo</p>
                      <p className="mt-1 text-xs text-slate-500">PNG, JPEG, or WebP · up to 2 MB</p>
                    </div>
                    <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarChange} />
                    <button type="button" disabled={avatarSaving} onClick={() => avatarInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {avatarSaving ? <LoaderCircle size={15} className="animate-spin" /> : <ImagePlus size={15} />} Change
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" value={profileForm.name} onChange={(value) => changeProfile('name', value)} required />
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">Contact email
                      <div className="relative"><Mail size={15} className="absolute left-3 top-3 text-slate-400" /><input readOnly value={profile?.email || authUser?.email || ''} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 font-normal text-slate-500" /></div>
                    </label>
                    <Field label="Professional title" value={profileForm.professional_title} onChange={(value) => changeProfile('professional_title', value)} placeholder={isRecruiter ? 'Talent Acquisition Manager' : 'Software Engineering Student'} />
                    <Field label="Phone" type="tel" value={profileForm.phone} onChange={(value) => changeProfile('phone', value)} placeholder="Add a contact number" />
                    {isRecruiter ? (
                      <Field label="Company / organization" value={profileForm.company} onChange={(value) => changeProfile('company', value)} />
                    ) : (
                      <>
                        <Field label="College / university" value={profileForm.college} onChange={(value) => changeProfile('college', value)} />
                        <Field label="Degree" value={profileForm.degree} onChange={(value) => changeProfile('degree', value)} />
                        <Field label="Graduation year" type="number" min="1950" max="2100" value={profileForm.graduation_year} onChange={(value) => changeProfile('graduation_year', value)} />
                      </>
                    )}
                    <Field label="LinkedIn URL" type="url" value={profileForm.linkedin_url} onChange={(value) => changeProfile('linkedin_url', value)} placeholder="https://linkedin.com/in/..." />
                    <Field label="GitHub URL" type="url" value={profileForm.github_url} onChange={(value) => changeProfile('github_url', value)} placeholder="https://github.com/..." />
                    <Field label="Portfolio URL" type="url" value={profileForm.portfolio_url} onChange={(value) => changeProfile('portfolio_url', value)} placeholder="https://..." />
                  </div>
                  {isRecruiter && (
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">Company bio
                      <textarea rows={3} maxLength={2000} value={profileForm.company_bio} onChange={(event) => changeProfile('company_bio', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                    </label>
                  )}
                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                      {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Save details
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'preferences' && (
                <form onSubmit={handlePreferencesSave} className="space-y-5">
                  {isRecruiter ? (
                    <>
                      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 p-4">
                        <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-400">
                          {companyLogoSrc ? <img src={companyLogoSrc} alt="Company logo" className="h-full w-full object-contain p-1" /> : 'No logo'}
                        </div>
                        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-900">Company branding</h3><p className="mt-1 text-xs text-slate-500">Upload a logo used for your recruiter profile. PNG, JPEG, or WebP up to 2 MB.</p></div>
                        <input ref={companyLogoInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleCompanyLogoChange} />
                        <button type="button" disabled={companyLogoSaving} onClick={() => companyLogoInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{companyLogoSaving ? <LoaderCircle size={15} className="animate-spin" /> : <ImagePlus size={15} />}{profile?.company_logo_url ? 'Replace logo' : 'Upload logo'}</button>
                      </section>
                      <Field label="Default ATS threshold for new jobs (%)" type="number" min="0" max="100" value={preferences.default_ats_threshold} onChange={(value) => changePreference('default_ats_threshold', value)} />
                      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Automated shortlist email template
                        <textarea rows={7} maxLength={6000} value={preferences.shortlist_email_template} onChange={(event) => changePreference('shortlist_email_template', event.target.value)} placeholder={'Hi {candidate_name},\n\nYour application for {role} has been shortlisted.\n\nBest,\n{recruiter_name}'} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm font-normal leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                        <span className="block text-xs font-normal text-slate-500">Available placeholders: {'{candidate_name}'}, {'{role}'}, {'{recruiter_name}'}, {'{match_score}'}</span>
                      </label>
                      <Toggle checked={preferences.blind_screening} onChange={(value) => changePreference('blind_screening', value)} label="Blind screening" description="Hide candidate names, email addresses, and resume filenames until shortlisted." />
                    </>
                  ) : (
                    <>
                      <Field label="Target job roles" value={preferences.target_job_roles} onChange={(value) => changePreference('target_job_roles', value)} placeholder="Frontend Developer, Data Analyst" />
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-medium text-slate-700">Preferred job types</legend>
                        <div className="flex flex-wrap gap-2">
                          {jobTypes.map((jobType) => {
                            const checked = preferences.preferred_job_types?.includes(jobType);
                            return <label key={jobType} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}><input type="checkbox" checked={checked} onChange={() => toggleJobType(jobType)} className="accent-indigo-600" />{jobType}</label>;
                          })}
                        </div>
                      </fieldset>
                      <Field label="Primary skills (comma-separated)" value={preferences.primary_skills} onChange={(value) => changePreference('primary_skills', value)} placeholder="Python, React, SQL" />
                      <section className="space-y-3 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3"><FileText size={19} className="mt-0.5 text-indigo-600" /><div><h3 className="text-sm font-semibold text-slate-900">Master resume</h3><p className="mt-1 text-xs text-slate-500">Use this PDF as your default when applying.</p></div></div>
                        {profile?.profile_resume_url ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"><div><p className="max-w-xs truncate text-sm font-medium text-slate-800">{profile.profile_resume_name}</p><p className="mt-1 text-xs text-slate-500">Last uploaded {dateLabel(profile.profile_resume_updated_at)}</p></div><button type="button" onClick={handleResumePreview} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">Preview</button></div>
                        ) : <p className="text-sm text-slate-500">No master resume uploaded.</p>}
                        <input ref={resumeInput} type="file" accept="application/pdf,.pdf" hidden onChange={handleResumeChange} />
                        <button type="button" disabled={resumeSaving} onClick={() => resumeInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{resumeSaving ? <LoaderCircle size={15} className="animate-spin" /> : <FileText size={15} />}{profile?.profile_resume_url ? 'Replace master resume' : 'Upload master resume'}</button>
                      </section>
                    </>
                  )}
                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Save preferences</button>
                  </div>
                </form>
              )}

              {activeTab === 'security' && (
                <div className="space-y-5">
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    {isRecruiter ? (
                      <Toggle checked={preferences.email_new_applicant_alerts} onChange={(value) => changePreference('email_new_applicant_alerts', value)} label="New applicant alerts" description="Email me when someone applies to one of my jobs." />
                    ) : (
                      <Toggle checked={preferences.email_shortlist_updates} onChange={(value) => changePreference('email_shortlist_updates', value)} label="Application status updates" description="Email me when a recruiter shortlists my application." />
                    )}
                    <button type="button" disabled={saving} onClick={handlePreferencesSave} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Save notification settings</button>
                  </section>

                  <section className="space-y-3 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-2"><LockKeyhole size={17} className="text-indigo-600" /><h3 className="text-sm font-semibold text-slate-900">Password</h3></div>
                    {authUser?.providerData?.some((provider) => provider.providerId === 'password') ? (
                      <form onSubmit={handlePasswordChange} className="space-y-3">
                        <Field label="Current password" type="password" autoComplete="current-password" value={passwordForm.current} onChange={(value) => setPasswordForm((current) => ({ ...current, current: value }))} required />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="New password" type="password" autoComplete="new-password" minLength={8} value={passwordForm.next} onChange={(value) => setPasswordForm((current) => ({ ...current, next: value }))} required />
                          <Field label="Confirm new password" type="password" autoComplete="new-password" minLength={8} value={passwordForm.confirm} onChange={(value) => setPasswordForm((current) => ({ ...current, confirm: value }))} required />
                        </div>
                        <button type="submit" disabled={passwordSaving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{passwordSaving ? <LoaderCircle size={15} className="animate-spin" /> : <LockKeyhole size={15} />} Update password</button>
                      </form>
                    ) : <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">This account signs in with an external provider. Manage its password with that provider.</p>}
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Current session</h3>
                    <p className="mt-2 text-sm text-slate-600">Signed in with {authUser?.providerData?.[0]?.providerId || 'Firebase Authentication'}</p>
                    <p className="mt-1 text-xs text-slate-500">Last sign-in: {dateLabel(authUser?.metadata?.lastSignInTime)}</p>
                  </section>
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}