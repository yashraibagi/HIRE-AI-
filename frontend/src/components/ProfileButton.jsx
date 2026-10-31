import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpenText,
  ChevronDown,
  CircleHelp,
  LogOut,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getCompanyLogo,
  getProfileAvatar,
  getUserProfile,
  updateUserPreferences,
} from '../services/profile';
import ProfileModal from './ProfileModal';

const getInitials = (name, email) => {
  const source = name || email?.split('@')[0] || 'User';
  return source.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

export default function ProfileButton() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [avatarSrc, setAvatarSrc] = useState('');
  const [companyLogoSrc, setCompanyLogoSrc] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalTab, setModalTab] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [blindSaving, setBlindSaving] = useState(false);
  const [menuError, setMenuError] = useState('');
  const menuRef = useRef(null);

  const accountRole = profile?.role || role || 'student';
  const isRecruiter = accountRole === 'recruiter';
  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = profile?.email || user?.email || '';
  const initials = getInitials(displayName, email);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    getUserProfile()
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((loadError) => { if (!cancelled) setMenuError(loadError.response?.data?.detail || 'Could not load profile details.'); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!profile?.profile_avatar_url) {
      setAvatarSrc('');
      return undefined;
    }
    let cancelled = false;
    let objectUrl = '';
    getProfileAvatar()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setAvatarSrc(objectUrl);
      })
      .catch(() => setAvatarSrc(''));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?.profile_avatar_url]);

  useEffect(() => {
    if (!profile?.company_logo_url) {
      setCompanyLogoSrc('');
      return undefined;
    }
    let cancelled = false;
    let objectUrl = '';
    getCompanyLogo()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCompanyLogoSrc(objectUrl);
      })
      .catch(() => setCompanyLogoSrc(''));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?.company_logo_url]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setHelpOpen(false);
        setConfirmLogout(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        if (modalTab) setModalTab(null);
        else setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [modalTab]);

  const openProfileModal = (tab) => {
    setMenuOpen(false);
    setHelpOpen(false);
    setModalTab(tab);
  };

  const toggleBlindScreening = async () => {
    setBlindSaving(true);
    setMenuError('');
    try {
      const updated = await updateUserPreferences({ blind_screening: !profile?.preferences?.blind_screening });
      setProfile(updated);
    } catch (saveError) {
      setMenuError(saveError.response?.data?.detail || 'Could not update blind screening.');
    } finally {
      setBlindSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => { setMenuOpen((current) => !current); setMenuError(''); }}
        className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200">
          {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" /> : initials}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="min-w-0 flex-1 max-md:hidden">
          <span className="block truncate text-sm font-semibold text-slate-900">{displayName}</span>
          <span className="mt-0.5 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-indigo-700">{accountRole}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform max-md:hidden ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-full right-0 z-60 mb-3 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" /> : initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{email}</p>
                <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-indigo-700">{accountRole}</span>
              </div>
            </div>

            <div className="space-y-1 p-2">
              <button type="button" role="menuitem" onClick={() => openProfileModal('personal')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><UserRound size={17} className="text-slate-500" />View / edit profile</button>
              {isRecruiter ? (
                <button type="button" role="switch" aria-checked={Boolean(profile?.preferences?.blind_screening)} disabled={blindSaving} onClick={toggleBlindScreening} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  <span className="flex items-center gap-3"><ShieldCheck size={17} className="text-slate-500" />Blind screening</span>
                  <span className={`relative h-5 w-9 rounded-full transition ${profile?.preferences?.blind_screening ? 'bg-indigo-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${profile?.preferences?.blind_screening ? 'left-4.5' : 'left-0.5'}`} /></span>
                </button>
              ) : (
                <button type="button" role="menuitem" onClick={() => openProfileModal('preferences')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><BookOpenText size={17} className="text-slate-500" />Default resume manager</button>
              )}
              <button type="button" role="menuitem" onClick={() => openProfileModal('security')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><Settings2 size={17} className="text-slate-500" />Account settings & security</button>
              <button type="button" role="menuitem" aria-expanded={helpOpen} onClick={() => setHelpOpen((current) => !current)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><CircleHelp size={17} className="text-slate-500" />Help & documentation</button>
              {helpOpen && <div className="mx-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">{isRecruiter ? 'Recruiter access and organization details are managed by your workspace administrator. Use Jobs & Applicants to manage openings and review candidates.' : 'Keep your profile resume current in Preferences. Use Applied Jobs to follow status changes and Interview Prep to practice.'}</div>}
              {menuError && <p role="alert" className="mx-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{menuError}</p>}
            </div>

            <div className="border-t border-slate-100 p-2">
              {confirmLogout ? (
                <div className="rounded-lg bg-rose-50 p-3">
                  <p className="text-sm font-medium text-slate-800">Sign out of HireAI?</p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => setConfirmLogout(false)} className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white">Cancel</button>
                    <button type="button" onClick={handleLogout} className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Sign out</button>
                  </div>
                </div>
              ) : (
                <button type="button" role="menuitem" onClick={() => setConfirmLogout(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"><LogOut size={17} />Sign out</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal
        open={modalTab !== null}
        initialTab={modalTab || 'personal'}
        profile={profile}
        role={accountRole}
        authUser={user}
        avatarSrc={avatarSrc}
        companyLogoSrc={companyLogoSrc}
        onClose={() => setModalTab(null)}
        onProfileUpdated={setProfile}
      />
    </div>
  );
}