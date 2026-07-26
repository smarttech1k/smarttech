import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../ui/Avatar';
import {
  followUser,
  FriendSuggestion,
  getFriendSuggestions,
  unfollowUser,
} from '../../../lib/social';

export const FriendSuggestions = () => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadSuggestions = async () => {
    try {
      setError('');
      setSuggestions(await getFriendSuggestions(8));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuggestions();
  }, []);

  const handleFollow = async (suggestion: FriendSuggestion) => {
    if (workingId) return;
    try {
      setWorkingId(suggestion.id);
      if (suggestion.you_follow) await unfollowUser(suggestion.id);
      else await followUser(suggestion.id);
      await loadSuggestions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to follow this member.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="surface-card space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-sun-primary" />
            <h2 className="section-title">People you may know</h2>
          </div>
          <p className="section-description mt-1">
            Follow each other to become friends and unlock private messaging.
          </p>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-500/8 p-3 text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="flex h-28 items-center justify-center text-sun-text-muted">
          <Loader2 className="animate-spin" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-2xl bg-sun-surface-light p-6 text-center text-sm text-sun-text-muted">
          You are caught up. New suggestions will appear as Korusa grows.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className="rounded-2xl border border-sun-border bg-sun-surface-light p-4">
              <button
                type="button"
                onClick={() => navigate(`/profile/${suggestion.username || suggestion.id}`)}
                className="flex w-full items-center gap-3 text-left"
              >
                <Avatar
                  src={suggestion.avatar_url || `https://i.pravatar.cc/150?u=${suggestion.id}`}
                  name={suggestion.full_name || suggestion.username || 'Member'}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">
                    {suggestion.full_name || suggestion.username || 'Korusa member'}
                  </h3>
                  <p className="truncate text-xs text-sun-text-muted">
                    @{suggestion.username || 'member'}
                  </p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-sun-text-muted" />
              </button>

              {suggestion.bio && (
                <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-relaxed text-sun-text-muted">
                  {suggestion.bio}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleFollow(suggestion)}
                disabled={workingId === suggestion.id}
                className={`mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-70 ${suggestion.you_follow ? 'border border-sun-border bg-sun-surface text-sun-text-main' : 'bg-sun-primary text-white'}`}
              >
                {workingId === suggestion.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <UserPlus size={15} />
                )}
                {suggestion.follows_you
                  ? 'Follow back'
                  : suggestion.you_follow
                    ? 'Unfollow'
                    : 'Follow'}
              </button>
              {suggestion.follows_you && !suggestion.you_follow && (
                <p className="mt-2 text-center text-[10px] font-medium text-sun-primary">
                  Follows you
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
