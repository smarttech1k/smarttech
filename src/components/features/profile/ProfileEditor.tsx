import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  AtSign,
  Camera,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { BackButton } from '../../ui/BackButton';
import { splitTextWithLinks } from '../../../lib/linkify';
import {
  MAX_AVATAR_BYTES,
  MAX_COVER_BYTES,
  USERNAME_MAX,
  UsernameTakenError,
  checkUsernameAvailable,
  fetchProfile,
  updateProfileDetails,
  uploadProfileImage,
  validateImageFile,
  validateUsername,
  type ProfileRecord,
} from '../../../lib/profiles';

const BIO_MAX = 500;
const COVER_DESCRIPTION_MAX = 240;
const USERNAME_CHECK_DEBOUNCE_MS = 400;

type HandleState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type Draft = {
  fullName: string;
  username: string;
  bio: string;
  coverDescription: string;
  coverPositionX: number;
  coverPositionY: number;
  coverZoom: number;
};

const draftFrom = (profile: ProfileRecord): Draft => ({
  fullName: profile.full_name || '',
  username: profile.username || '',
  bio: profile.bio || '',
  coverDescription: profile.cover_description || '',
  coverPositionX: Number(profile.cover_position_x ?? 50),
  coverPositionY: Number(profile.cover_position_y ?? 50),
  coverZoom: Number(profile.cover_zoom ?? 1),
});

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

export const ProfileEditor: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [handleMessage, setHandleMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        const record = await fetchProfile('me');
        if (!active) return;
        if (!record) throw new Error('Could not find your profile.');
        setProfile(record);
        setDraft(draftFrom(record));
        setBaseline(draftFrom(record));
      } catch (error: unknown) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load your profile.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Object URLs are a real allocation, not a string. Revoked on replacement and on the
  // way out, otherwise choosing five pictures in a row leaks five of them.
  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );
  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview],
  );

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;
    if (avatarFile || coverFile) return true;
    return (Object.keys(baseline) as Array<keyof Draft>).some((key) => draft[key] !== baseline[key]);
  }, [draft, baseline, avatarFile, coverFile]);

  // Covers a tab close or a reload. The in-app confirm below covers our own navigation -
  // useBlocker is not available here, because the app mounts a BrowserRouter rather than
  // a data router.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const handleChanged =
    !!draft && !!baseline && draft.username.trim() !== baseline.username.trim();

  // Named separately so the effect below depends on the handle alone. Depending on the
  // whole draft would restart the debounce and re-check the handle on every keystroke in
  // the bio.
  const usernameDraft = draft?.username ?? '';

  // Format is checked always, availability only when the handle actually changed.
  // Validating only on change left a member whose handle was empty or malformed with an
  // enabled Save button that then refused the write.
  useEffect(() => {
    const formatProblem = validateUsername(usernameDraft);
    if (formatProblem) {
      setHandleState('invalid');
      setHandleMessage(formatProblem);
      return;
    }

    if (!handleChanged) {
      setHandleState('idle');
      setHandleMessage('');
      return;
    }

    setHandleState('checking');
    setHandleMessage('');

    let active = true;
    const timer = window.setTimeout(() => {
      void checkUsernameAvailable(usernameDraft)
        .then((available) => {
          if (!active) return;
          setHandleState(available ? 'available' : 'taken');
          setHandleMessage(available ? 'That handle is free.' : 'That handle is already taken.');
        })
        .catch(() => {
          // The save is still guarded by the unique index, so a failed check is not worth
          // blocking on - it just stops claiming anything.
          if (active) {
            setHandleState('idle');
            setHandleMessage('');
          }
        });
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [usernameDraft, handleChanged]);

  const bioDraft = draft?.bio ?? '';
  const bioLinks = useMemo(
    () =>
      splitTextWithLinks(bioDraft).flatMap((segment) => (segment.kind === 'link' ? [segment] : [])),
    [bioDraft],
  );

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((previous) => (previous ? { ...previous, [key]: value } : previous));

  const pickImage = (kind: 'avatar' | 'cover') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately, so choosing the same file again after an error still fires.
    event.target.value = '';
    if (!file) return;

    const problem = validateImageFile(file, kind);
    if (problem) {
      setErrorMessage(problem);
      return;
    }

    setErrorMessage('');
    const url = URL.createObjectURL(file);
    if (kind === 'avatar') {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(file);
      setAvatarPreview(url);
    } else {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(file);
      setCoverPreview(url);
    }
  };

  const discardCoverPick = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview('');
  };

  const discardAvatarPick = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const handleSave = async () => {
    if (!profile || !draft || saving) return;

    const formatProblem = validateUsername(draft.username);
    if (formatProblem) {
      setHandleState('invalid');
      setHandleMessage(formatProblem);
      setErrorMessage('Fix your handle before saving.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setNoticeMessage('');

      // Uploaded only now, so abandoning the form does not leave orphaned objects in the
      // bucket the way an upload-on-pick would.
      const avatarUrl = avatarFile
        ? await uploadProfileImage(profile.id, 'avatar', avatarFile)
        : undefined;
      const coverUrl = coverFile
        ? await uploadProfileImage(profile.id, 'cover', coverFile)
        : undefined;

      await updateProfileDetails(profile.id, { ...draft, avatarUrl, coverUrl });

      const saved: ProfileRecord = {
        ...profile,
        full_name: draft.fullName.trim() || null,
        username: draft.username.trim() || null,
        bio: draft.bio.trim() || null,
        cover_description: draft.coverDescription.trim() || null,
        cover_position_x: draft.coverPositionX,
        cover_position_y: draft.coverPositionY,
        cover_zoom: draft.coverZoom,
        avatar_url: avatarUrl ?? profile.avatar_url,
        cover_url: coverUrl ?? profile.cover_url,
      };

      setProfile(saved);
      setBaseline(draftFrom(saved));
      discardAvatarPick();
      discardCoverPick();
      setHandleState('idle');
      setHandleMessage('');
      setNoticeMessage('Profile updated.');
    } catch (error: unknown) {
      if (error instanceof UsernameTakenError) {
        // The index is the only authority. The availability check above can be stale by
        // the time the write lands.
        setHandleState('taken');
        setHandleMessage(error.message);
        setErrorMessage('That handle was taken while you were editing. Pick another one.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save your profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (onBack) onBack();
    else navigate('/profile/me');
  };

  const requestLeave = () => {
    if (isDirty) setConfirmLeaveOpen(true);
    else leave();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <div className="h-9 w-24 animate-pulse rounded-full bg-sun-surface-light" />
        <div className="surface-card space-y-5 p-6">
          <div className="h-6 w-40 animate-pulse rounded-lg bg-sun-surface-light" />
          <div className="aspect-[16/7] animate-pulse rounded-2xl bg-sun-surface-light sm:aspect-[820/312]" />
          <div className="h-11 animate-pulse rounded-xl bg-sun-surface-light" />
          <div className="h-11 animate-pulse rounded-xl bg-sun-surface-light" />
          <div className="h-28 animate-pulse rounded-xl bg-sun-surface-light" />
        </div>
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <BackButton onClick={leave} label="Profile" sticky />
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-600">
          {errorMessage || 'Could not load your profile.'}
        </div>
      </div>
    );
  }

  const coverSource = coverPreview || profile.cover_url || '';
  const avatarSource = avatarPreview || profile.avatar_url || '';
  const handleHint = `${draft.username.trim().length}/${USERNAME_MAX} · letters, numbers and underscores`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <BackButton onClick={requestLeave} label="Profile" sticky />

      <header className="space-y-1">
        <h1 className="section-title">Edit profile</h1>
        <p className="section-description">
          Your photo, cover, name and bio - everything people see at the top of your profile, in
          one place.
        </p>
      </header>

      {errorMessage && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-600">
          <p className="min-w-0 wrap-anywhere">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            aria-label="Dismiss error"
            className="shrink-0 rounded-lg p-0.5 hover:bg-red-500/10"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {noticeMessage && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="min-w-0 wrap-anywhere">{noticeMessage}</p>
          <button
            type="button"
            onClick={() => setNoticeMessage('')}
            aria-label="Dismiss message"
            className="shrink-0 rounded-lg p-0.5 hover:bg-emerald-500/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <section className="surface-card space-y-4 p-5 sm:p-6" aria-labelledby="editor-photo">
          <div>
            <h2 id="editor-photo" className="text-sm font-semibold">
              Profile photo
            </h2>
            <p className="mt-0.5 text-xs text-sun-text-muted">
              Square works best. Up to {mb(MAX_AVATAR_BYTES)} MB.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.65rem] border border-sun-border bg-sun-surface-light">
              {avatarSource ? (
                <img src={avatarSource} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-2xl font-semibold text-sun-primary">
                  {(draft.fullName || draft.username || 'K').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Button
                size="sm"
                variant="secondary"
                icon={<ImageIcon size={16} />}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarSource ? 'Choose another' : 'Choose photo'}
              </Button>
              {avatarFile && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 size={16} />}
                  onClick={discardAvatarPick}
                >
                  Undo
                </Button>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pickImage('avatar')}
            />
          </div>
        </section>

        <section className="surface-card space-y-4 p-5 sm:p-6" aria-labelledby="editor-cover">
          <div>
            <h2 id="editor-cover" className="text-sm font-semibold">
              Cover
            </h2>
            <p className="mt-0.5 text-xs text-sun-text-muted">
              Wide and short. Up to {mb(MAX_COVER_BYTES)} MB.
            </p>
          </div>

          {/* The same two ratios the profile renders, so the crop set here is the crop a
              phone gets. The old editor previewed only 820/312 while the profile used
              16/7 below sm - which meant tuning a crop you would never see. */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="group relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-sun-primary/35 bg-sun-primary/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/20 sm:aspect-[820/312]"
          >
            {coverSource ? (
              <>
                <img
                  src={coverSource}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${draft.coverPositionX}% ${draft.coverPositionY}%`,
                    transform: `scale(${draft.coverZoom})`,
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Choose another image
                </span>
              </>
            ) : (
              <span className="flex items-center gap-2 text-sm font-semibold text-sun-primary">
                <Camera size={18} />
                Choose cover image
              </span>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickImage('cover')}
          />

          {coverFile && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={16} />} onClick={discardCoverPick}>
              Undo image choice
            </Button>
          )}

          {coverSource && (
            <div className="space-y-3 rounded-2xl border border-sun-border bg-sun-surface-light p-4">
              <p className="text-xs font-semibold">Adjust crop</p>
              <label className="block text-[11px] text-sun-text-muted">
                Horizontal position ({draft.coverPositionX}%)
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.coverPositionX}
                  onChange={(event) => update('coverPositionX', Number(event.target.value))}
                  className="mt-1 w-full accent-sun-primary"
                />
              </label>
              <label className="block text-[11px] text-sun-text-muted">
                Vertical position ({draft.coverPositionY}%)
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.coverPositionY}
                  onChange={(event) => update('coverPositionY', Number(event.target.value))}
                  className="mt-1 w-full accent-sun-primary"
                />
              </label>
              <label className="block text-[11px] text-sun-text-muted">
                Zoom ({draft.coverZoom.toFixed(2)}x)
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={draft.coverZoom}
                  onChange={(event) => update('coverZoom', Number(event.target.value))}
                  className="mt-1 w-full accent-sun-primary"
                />
              </label>
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="cover-description" className="text-xs font-semibold">
                Cover description
              </label>
              <span className="text-[10px] text-sun-text-muted">
                {draft.coverDescription.length}/{COVER_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="cover-description"
              value={draft.coverDescription}
              onChange={(event) => update('coverDescription', event.target.value)}
              maxLength={COVER_DESCRIPTION_MAX}
              rows={3}
              placeholder="What does this cover represent?"
              className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light p-3 text-sm outline-none transition-colors focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10"
            />
          </div>
        </section>

        <section className="surface-card space-y-5 p-5 sm:p-6" aria-labelledby="editor-identity">
          <h2 id="editor-identity" className="text-sm font-semibold">
            Name and handle
          </h2>

          <Input
            label="Display name"
            value={draft.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            placeholder="How you want to be known"
            maxLength={80}
            icon={<User size={16} />}
            autoComplete="name"
          />

          <div>
            <Input
              label="Handle"
              value={draft.username}
              onChange={(event) => update('username', event.target.value)}
              placeholder="your_handle"
              maxLength={USERNAME_MAX}
              icon={<AtSign size={16} />}
              autoComplete="username"
              spellCheck={false}
              error={
                handleState === 'invalid' || handleState === 'taken' ? handleMessage : undefined
              }
              hint={
                handleState === 'invalid' || handleState === 'taken' ? undefined : handleHint
              }
            />
            {handleState === 'checking' && (
              <p className="mt-1.5 flex items-center gap-1.5 px-0.5 text-xs text-sun-text-muted">
                <Loader2 size={12} className="animate-spin" />
                Checking availability…
              </p>
            )}
            {handleState === 'available' && (
              <p className="mt-1.5 flex items-center gap-1.5 px-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Check size={12} />
                {handleMessage}
              </p>
            )}
          </div>
        </section>

        <section className="surface-card space-y-3 p-5 sm:p-6" aria-labelledby="editor-bio">
          <div className="flex items-center justify-between">
            <h2 id="editor-bio" className="text-sm font-semibold">
              Bio
            </h2>
            <span className="text-[10px] text-sun-text-muted">
              {draft.bio.length}/{BIO_MAX}
            </span>
          </div>

          <textarea
            value={draft.bio}
            onChange={(event) => update('bio', event.target.value)}
            maxLength={BIO_MAX}
            rows={5}
            placeholder="Tell people about your work and interests… korusa.com"
            className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light p-3 text-sm leading-relaxed outline-none transition-colors focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10"
          />

          {/* Nothing about a plain textarea tells you a pasted address will work, so the
              hint says it - and anything recognised is echoed back below, because a link
              that quietly failed to register looks identical to one that worked until
              somebody taps it. Read back with the same parser the profile renders with. */}
          <p className="text-[11px] leading-relaxed text-sun-text-muted">
            Write a link anywhere in here - korusa.com or https://korusa.com - and it becomes
            tappable on your profile.
          </p>

          {bioLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bioLinks.map((link, index) => (
                <a
                  key={`${link.href}-${index}`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sun-primary/10 px-3 py-1 text-[11px] font-semibold text-sun-primary transition-colors hover:bg-sun-primary/20"
                >
                  <LinkIcon size={11} className="shrink-0" />
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Sticky, because the form is taller than a phone screen and a save button at the
            bottom of it is a scroll away from every field you just changed. */}
        <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-2 rounded-2xl border border-sun-border bg-sun-surface/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="px-1 text-xs text-sun-text-muted">
            {isDirty ? 'You have unsaved changes.' : 'Everything is saved.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={requestLeave} disabled={saving}>
              {isDirty ? 'Discard' : 'Done'}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !isDirty || handleState === 'checking' || handleState === 'invalid' || handleState === 'taken'}
              icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </motion.div>

      <Modal
        open={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        title="Discard your changes?"
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmLeaveOpen(false)}
            >
              Keep editing
            </Button>
            <Button variant="danger" className="flex-1" onClick={leave}>
              Discard
            </Button>
          </div>
        }
      >
        <p className="p-5 text-sm text-sun-text-muted">
          Your photo, cover and text edits have not been saved yet. Leaving now loses them.
        </p>
      </Modal>
    </div>
  );
};
