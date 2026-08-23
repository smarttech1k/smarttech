import React, { useEffect, useRef, useState } from 'react';
import {
  Ban,
  BarChart3,
  Camera,
  Flag,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Sparkles,
  UserCheck,
  VolumeX,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { LinkedText } from '../../ui/LinkedText';
import type { ProfileOverview, ProfileRecord } from '../../../lib/profiles';

interface ProfileHeaderProps {
  profile: ProfileRecord;
  overview: ProfileOverview;
  isOwnProfile: boolean;
  followPending: boolean;
  messagePending: boolean;
  moderationPending: boolean;
  onViewCover: () => void;
  onEditCover: () => void;
  onViewPhoto: () => void;
  onEditProfile: () => void;
  onSettings: () => void;
  onInsights: () => void;
  onFollowToggle: () => void;
  onMessage: () => void;
  onMute: () => void;
  onBlock: () => void;
  onReport: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

const displayName = (profile: ProfileRecord) =>
  profile.full_name || profile.username || 'Korusa member';

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  overview,
  isOwnProfile,
  followPending,
  messagePending,
  moderationPending,
  onViewCover,
  onEditCover,
  onViewPhoto,
  onEditProfile,
  onSettings,
  onInsights,
  onFollowToggle,
  onMessage,
  onMute,
  onBlock,
  onReport,
  onOpenFollowers,
  onOpenFollowing,
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  // The menu used to have no way out but choosing something from it: no outside click,
  // no Escape. pointerdown rather than click so it closes on the press that starts a
  // scroll, and capture so a handler inside the menu cannot swallow it first.
  useEffect(() => {
    if (!optionsOpen) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (!optionsRef.current?.contains(event.target as Node)) setOptionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOptionsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [optionsOpen]);

  const name = displayName(profile);
  const isBlocked = overview.isBlockedByMe;
  const hasCoverImage = !!profile.cover_url;
  // Nothing to open when there is neither a picture nor a story about one - the old
  // header invited a tap either way and delivered an empty viewer.
  const canViewCover = hasCoverImage || !!profile.cover_description;

  const coverArt = (
    <>
      {hasCoverImage ? (
        <img
          src={profile.cover_url || ''}
          alt=""
          className="h-full w-full object-cover"
          style={{
            objectPosition: `${profile.cover_position_x ?? 50}% ${profile.cover_position_y ?? 50}%`,
            transform: `scale(${profile.cover_zoom ?? 1})`,
          }}
        />
      ) : (
        <>
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:32px_32px]" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
    </>
  );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-sun-border bg-sun-surface shadow-sm">
      {/* The cover viewer and the Edit cover control are siblings inside this box, not
          nested. It used to be a role="button" div with a real <button> inside it -
          invalid ARIA, and its hand-rolled key handler let Space scroll the page on the
          way to opening the viewer. A real <button> gets Enter and Space for free. */}
      <div className="relative aspect-[16/7] overflow-hidden bg-gradient-to-br from-[#24104f] via-sun-primary to-sun-secondary sm:aspect-[820/312]">
        {canViewCover ? (
          <button
            type="button"
            onClick={onViewCover}
            aria-label={`View ${isOwnProfile ? 'your' : `${name}'s`} cover photo`}
            className="absolute inset-0 h-full w-full cursor-pointer overflow-hidden text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/40"
          >
            {coverArt}
            <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 sm:bottom-5 sm:left-6 sm:right-6">
              <span className="line-clamp-1 max-w-xl text-xs font-medium text-white/90 sm:text-sm">
                {profile.cover_description || 'View cover photo'}
              </span>
              <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                View cover
              </span>
            </span>
          </button>
        ) : (
          <div className="absolute inset-0">
            {coverArt}
            {isOwnProfile && (
              <p className="absolute bottom-4 left-4 right-4 line-clamp-1 text-xs font-medium text-white/80 sm:bottom-5 sm:left-6 sm:right-6 sm:text-sm">
                Add a cover to introduce your profile.
              </p>
            )}
          </div>
        )}

        {isOwnProfile && (
          <button
            type="button"
            onClick={onEditCover}
            className="absolute right-4 top-4 z-10 inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/35 px-3 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            <Camera size={16} />
            {hasCoverImage ? 'Edit cover' : 'Add cover'}
          </button>
        )}
      </div>

      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-12 flex min-w-0 flex-col items-center gap-4 sm:-mt-16 sm:flex-row sm:items-end">
            {/* The photo is the control, not decoration. With no photo set it sends the
                owner to the editor to add one rather than opening an empty viewer. */}
            <button
              type="button"
              onClick={() => {
                if (profile.avatar_url) onViewPhoto();
                else if (isOwnProfile) onEditProfile();
              }}
              disabled={!profile.avatar_url && !isOwnProfile}
              aria-label={
                profile.avatar_url
                  ? 'View profile photo'
                  : isOwnProfile
                    ? 'Add a profile photo'
                    : 'No profile photo'
              }
              className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.65rem] border-4 border-sun-surface bg-sun-surface shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/25 active:scale-[0.98] disabled:active:scale-100 sm:h-32 sm:w-32 sm:rounded-[2rem]"
            >
              {profile.avatar_url ? (
                <>
                  <img
                    src={profile.avatar_url}
                    alt={name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                    <ImageIcon size={22} />
                  </span>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-sun-primary/10 font-display text-2xl font-semibold text-sun-primary">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </button>

            <div className="min-w-0 pb-1 text-center sm:text-left">
              <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {name}
              </h1>
              <p className="mt-1 text-sm font-medium text-sun-primary">
                @{profile.username || 'member'}
              </p>
              {/* Only when it is a real signal from the database, same rule the home
                  feed's suggestions follow. */}
              {!isOwnProfile && overview.followsYou && !isBlocked && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun-surface-light px-2.5 py-1 text-[10px] font-semibold text-sun-text-muted">
                  <UserCheck size={12} />
                  Follows you
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
            {isBlocked ? (
              <Button size="sm" variant="secondary" onClick={onBlock} disabled={moderationPending}>
                {moderationPending ? 'Working…' : 'Unblock'}
              </Button>
            ) : isOwnProfile ? (
              <>
                <Button size="sm" variant="secondary" onClick={onEditProfile}>
                  Edit profile
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onInsights}
                  icon={<BarChart3 size={16} />}
                >
                  Insights
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-10 p-0"
                  onClick={onSettings}
                  title="Account settings"
                  aria-label="Account settings"
                >
                  <Settings size={17} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant={overview.youFollow ? 'secondary' : 'primary'}
                  onClick={onFollowToggle}
                  disabled={followPending}
                >
                  {followPending
                    ? 'Working…'
                    : overview.youFollow
                      ? 'Unfollow'
                      : overview.followsYou
                        ? 'Follow back'
                        : 'Follow'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-10 p-0"
                  onClick={onMessage}
                  disabled={messagePending}
                  title={
                    overview.existingConversationId
                      ? 'Open conversation'
                      : overview.youFollow && overview.followsYou
                        ? 'Message'
                        : 'Follow each other to start a conversation'
                  }
                  aria-label="Message"
                >
                  {messagePending ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <MessageCircle size={17} />
                  )}
                </Button>

                <div className="relative" ref={optionsRef}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-10 p-0"
                    onClick={() => setOptionsOpen((previous) => !previous)}
                    title="Profile options"
                    aria-label="Profile options"
                    aria-expanded={optionsOpen}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal size={18} />
                  </Button>

                  {optionsOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-40 w-52 overflow-hidden rounded-2xl border border-sun-border bg-sun-surface p-1.5 shadow-xl"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOptionsOpen(false);
                          onMute();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sun-surface-light"
                      >
                        <VolumeX size={17} />
                        {overview.isMutedByMe ? 'Unmute user' : 'Mute user'}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOptionsOpen(false);
                          onReport();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sun-surface-light"
                      >
                        <Flag size={17} />
                        Report user
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOptionsOpen(false);
                          onBlock();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-500/8"
                      >
                        <Ban size={17} />
                        Block user
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* A blocked profile stops here. Showing their bio, their counts and every post
            they have written to the person who blocked them is the one thing the block
            was supposed to prevent. */}
        {isBlocked ? (
          <div className="mt-6 rounded-2xl border border-sun-border bg-sun-surface-light p-5 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <Ban size={20} />
            </div>
            <h2 className="mt-3 text-sm font-semibold">You blocked this member</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-sun-text-muted">
              You will not see their posts, and they cannot message you. Unblock to see this
              profile again.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 border-t border-sun-border pt-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              {/* whitespace-pre-line: the bio is written in a textarea, so a link put on
                  its own line should stay on its own line instead of being folded into
                  the sentence above it. */}
              <p className="max-w-2xl whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-sun-text-main">
                {profile.bio ? (
                  <LinkedText text={profile.bio} />
                ) : isOwnProfile ? (
                  'Add a bio to introduce your work and interests. Any link you write there becomes tappable.'
                ) : (
                  'This member has not added a bio yet.'
                )}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-sun-primary/8 px-3 py-1.5 text-xs font-semibold text-sun-primary">
                  <Sparkles size={14} />
                  Korusa member
                </span>
                {/* Suppressed on your own profile, where "followers you follow" is just
                    your friend count under a misleading name. */}
                {!isOwnProfile && overview.mutualTotal > 0 && (
                  <button
                    type="button"
                    onClick={onOpenFollowers}
                    className="inline-flex items-center gap-2 rounded-full bg-sun-surface-light px-3 py-1.5 text-xs font-semibold text-sun-text-muted transition-colors hover:text-sun-primary"
                  >
                    <UserCheck size={14} />
                    {overview.mutualTotal} {overview.mutualTotal === 1 ? 'follower' : 'followers'} you
                    follow
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center divide-x divide-sun-border rounded-2xl border border-sun-border bg-sun-surface-light">
              <div className="px-4 py-3 text-center sm:px-5">
                <p className="font-display text-xl font-semibold">{overview.postsTotal}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sun-text-muted">
                  Posts
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenFollowers}
                className="px-4 py-3 text-center transition-colors hover:text-sun-primary sm:px-5"
              >
                <p className="font-display text-xl font-semibold">{overview.followersTotal}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sun-text-muted">
                  Followers
                </p>
              </button>
              <button
                type="button"
                onClick={onOpenFollowing}
                className="px-4 py-3 text-center transition-colors hover:text-sun-primary sm:px-5"
              >
                <p className="font-display text-xl font-semibold">{overview.followingTotal}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sun-text-muted">
                  Following
                </p>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
