import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Search, UserPlus, Users, X } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { followUser, unfollowUser } from '../../../lib/social';
import {
  FOLLOW_PAGE_SIZE,
  fetchFollowList,
  fetchProfile,
  type FollowDirection,
  type FollowListItem,
  type ProfileRecord,
} from '../../../lib/profiles';

interface FollowListViewProps {
  direction: FollowDirection;
}

const SEARCH_DEBOUNCE_MS = 300;

export const FollowListView: React.FC<FollowListViewProps> = ({ direction }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [items, setItems] = useState<FollowListItem[]>([]);
  const [cursor, setCursor] = useState<{ followedAt: string; id: string } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  // Guards against a slow first page landing after a later search has already replaced
  // the list - typing quickly used to be able to leave stale rows on screen.
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetchProfile(id)
      .then((record) => {
        if (!active) return;
        setProfile(record);
        // Without this the page sits on its skeleton forever for a handle that does not
        // resolve, because the list below never gets a target to load.
        setProfileMissing(!record);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfileMissing(true);
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load this profile.',
        );
      });
    return () => {
      active = false;
    };
  }, [id]);

  const load = useCallback(async () => {
    if (!profile) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      setLoading(true);
      setErrorMessage('');
      const page = await fetchFollowList({ targetId: profile.id, direction, search });
      if (requestRef.current !== requestId) return;
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (error: unknown) {
      if (requestRef.current !== requestId) return;
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load this list.');
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [profile, direction, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!profile || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchFollowList({
        targetId: profile.id,
        direction,
        search,
        cursor,
      });
      setCursor(page.nextCursor);
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...page.items.filter((item) => !seen.has(item.id))];
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load more people.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFollowToggle = async (person: FollowListItem) => {
    if (pendingFollow) return;
    setPendingFollow(person.id);
    // Optimistic: the row is the only thing that changes, and reverting one boolean is
    // cheaper than re-fetching a page to find out it worked.
    setItems((previous) =>
      previous.map((item) =>
        item.id === person.id ? { ...item, youFollow: !item.youFollow } : item,
      ),
    );
    try {
      if (person.youFollow) await unfollowUser(person.id);
      else await followUser(person.id);
    } catch (error: unknown) {
      setItems((previous) =>
        previous.map((item) =>
          item.id === person.id ? { ...item, youFollow: person.youFollow } : item,
        ),
      );
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update whether you follow them.',
      );
    } finally {
      setPendingFollow(null);
    }
  };

  const heading = direction === 'followers' ? 'Followers' : 'Following';
  const ownerName = profile?.full_name || profile?.username || 'this member';
  const backTarget = `/profile/${profile?.username || profile?.id || id || 'me'}`;

  const emptyLabel = search
    ? `Nobody here matches “${search}”.`
    : direction === 'followers'
      ? 'No followers yet.'
      : 'Not following anyone yet.';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* A real route, so this button, the browser's own Back and a refresh all agree.
          This list used to be component state on the profile: refreshing dropped you back
          to the profile, and browser Back left the profile altogether. */}
      <BackButton onClick={() => navigate(backTarget)} label="Profile" sticky />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun-primary/10 text-sun-primary">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="section-title truncate">{heading}</h1>
            <p className="section-description truncate">
              {direction === 'followers'
                ? `People who follow ${ownerName}.`
                : `People ${ownerName} follows.`}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sun-text-muted"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={`Search ${heading.toLowerCase()} by name or handle`}
            aria-label={`Search ${heading.toLowerCase()}`}
            className="min-h-11 w-full rounded-xl border border-sun-border bg-sun-surface pl-11 pr-10 text-sm font-medium shadow-sm outline-none transition-colors placeholder:text-sun-text-muted/55 focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-sun-text-muted hover:bg-sun-surface-light"
            >
              <X size={15} />
            </button>
          )}
        </div>

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

        {profileMissing ? (
          <div className="surface-card py-12 text-center">
            <p className="text-sm text-sun-text-muted">
              No Korusa member matches <span className="font-semibold">{id}</span>.
            </p>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="mt-4 text-sm font-semibold text-sun-primary hover:underline"
            >
              Back to home
            </button>
          </div>
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="surface-card flex items-center gap-3 p-4">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-sun-surface-light" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded bg-sun-surface-light" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-sun-surface-light" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card py-12 text-center text-sm text-sun-text-muted">
            {emptyLabel}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((person) => {
              const name = person.fullName || person.username || 'Korusa member';
              return (
                <div key={person.id} className="interactive-card flex items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${person.username || person.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {/* No placeholder service: Avatar renders their initials. The old list
                        filled a missing photo with a stock picture of a stranger. */}
                    <Avatar size="lg" src={person.avatarUrl || undefined} name={name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{name}</span>
                      <span className="mt-0.5 block truncate text-xs text-sun-text-muted">
                        @{person.username || 'member'}
                      </span>
                      {person.followsYou && (
                        <span className="mt-0.5 block text-[10px] font-semibold text-sun-primary">
                          Follows you
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleFollowToggle(person)}
                    disabled={pendingFollow === person.id}
                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
                      person.youFollow
                        ? 'border border-sun-border text-sun-text-muted hover:border-sun-primary/35'
                        : 'bg-sun-primary text-white hover:bg-[#5b21b6]'
                    } ${pendingFollow === person.id ? 'opacity-60' : ''}`}
                  >
                    {person.youFollow ? <Check size={12} /> : <UserPlus size={12} />}
                    {person.youFollow ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!loading && cursor && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sun-border bg-sun-surface text-sm font-bold text-sun-text-main transition-colors hover:bg-sun-surface-light disabled:opacity-60"
          >
            {loadingMore && <Loader2 size={15} className="animate-spin" />}
            {loadingMore ? 'Loading' : `Load ${FOLLOW_PAGE_SIZE} more`}
          </button>
        )}
      </motion.section>
    </div>
  );
};
