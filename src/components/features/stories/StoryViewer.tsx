import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import {
  STORY_IMAGE_DURATION_MS,
  deleteStory,
  getStoryViewers,
  markStoryViewed,
  type StoryGroup,
  type StoryViewer,
} from '../../../lib/stories';

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
  // Fired after a story is recorded as seen, so the rail can drop its unseen ring.
  onViewed: (storyId: string) => void;
  onDeleted: () => void;
}

// How long a press has to be held before it counts as "pause" rather than a tap.
const HOLD_TO_PAUSE_MS = 250;

export const StoryViewerOverlay: React.FC<StoryViewerProps> = ({
  groups,
  startGroupIndex,
  onClose,
  onViewed,
  onDeleted,
}) => {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState({ group: startGroupIndex, story: 0 });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[] | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const elapsedRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const viewedRef = useRef(new Set<string>());

  // Mirrored during render so the advance helper can read the live cursor without
  // becoming a dependency of every timer effect.
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  const activeGroup = groups[cursor.group];
  const activeStory = activeGroup?.stories[cursor.story];

  const advance = useCallback(
    (delta: 1 | -1) => {
      const { group, story } = cursorRef.current;
      const current = groups[group];
      if (!current) {
        onClose();
        return;
      }

      const nextStory = story + delta;
      if (nextStory >= 0 && nextStory < current.stories.length) {
        setCursor({ group, story: nextStory });
        return;
      }

      const nextGroup = group + delta;
      // Rewinding past the very first story just restarts it.
      if (nextGroup < 0) {
        setCursor({ group, story: 0 });
        return;
      }
      if (nextGroup >= groups.length) {
        onClose();
        return;
      }
      setCursor({
        group: nextGroup,
        story: delta === 1 ? 0 : Math.max(groups[nextGroup].stories.length - 1, 0),
      });
    },
    [groups, onClose],
  );

  // A cursor move is a fresh slide: reset the clock and collapse any open panels.
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    setShowViewers(false);
    setConfirmDelete(false);
  }, [cursor.group, cursor.story]);

  // Record the view once per story per session; the rail reads the result to
  // decide whether the author's ring is still highlighted.
  useEffect(() => {
    if (!activeStory || activeGroup?.isMine) return;
    if (viewedRef.current.has(activeStory.id)) return;
    viewedRef.current.add(activeStory.id);
    const storyId = activeStory.id;
    void markStoryViewed(storyId)
      .then(() => onViewed(storyId))
      // A dropped view receipt is cosmetic: the ring corrects itself on next load.
      .catch(() => {});
  }, [activeStory, activeGroup?.isMine, onViewed]);

  // Images run on a fixed timer. Elapsed time lives in a ref so a hold resumes
  // from where it stopped instead of restarting the slide.
  useEffect(() => {
    if (!activeStory || activeStory.mediaType !== 'image' || paused) return;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      const ratio = Math.min(elapsedRef.current / STORY_IMAGE_DURATION_MS, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        advance(1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeStory, paused, advance]);

  // Videos drive their own progress, so the element is the source of truth.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeStory?.mediaType !== 'video') return;

    if (paused) {
      video.pause();
      return;
    }

    // Unmuted autoplay can be refused even after a click. Fall back to muted
    // playback with a visible unmute control rather than freezing the slide.
    void video.play().catch(() => {
      video.muted = true;
      setMuted(true);
      void video.play().catch(() => {});
    });
  }, [paused, activeStory]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') advance(1);
      else if (event.key === 'ArrowLeft') advance(-1);
      else if (event.key === ' ') {
        event.preventDefault();
        setPaused((previous) => !previous);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, onClose]);

  const beginHold = () => {
    heldRef.current = false;
    holdTimerRef.current = window.setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, HOLD_TO_PAUSE_MS);
  };

  const endHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (heldRef.current) setPaused(false);
  };

  // Tap zones sit above the media but below the chrome. A press that turned into
  // a hold must not also navigate when the finger lifts.
  const handleZone = (delta: 1 | -1) => () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    advance(delta);
  };

  const openViewers = async () => {
    if (!activeStory) return;
    setShowViewers(true);
    setPaused(true);
    try {
      setViewers(await getStoryViewers(activeStory.id));
    } catch {
      setViewers([]);
    }
  };

  const handleDelete = async () => {
    if (!activeStory || deleting) return;
    setDeleting(true);
    try {
      await deleteStory(activeStory.id, activeStory.mediaPath);
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!activeGroup || !activeStory) return null;

  const authorName = activeGroup.fullName || activeGroup.username || 'Korusa member';
  const isMine = activeGroup.isMine;

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh flex-col bg-black">
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
      >
        {/* Media */}
        {activeStory.mediaUrl ? (
          activeStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              key={activeStory.id}
              src={activeStory.mediaUrl}
              className="h-full w-full object-contain"
              playsInline
              muted={muted}
              onTimeUpdate={(event) => {
                const element = event.currentTarget;
                if (element.duration > 0) setProgress(element.currentTime / element.duration);
              }}
              onEnded={() => advance(1)}
            />
          ) : (
            <img
              key={activeStory.id}
              src={activeStory.mediaUrl}
              alt={activeStory.caption || `Story by ${authorName}`}
              className="h-full w-full object-contain"
            />
          )
        ) : (
          <p className="px-8 text-center text-sm font-medium text-white/70">
            This story could not be loaded.
          </p>
        )}

        {/* Tap zones: back on the left third, forward on the rest. */}
        <button
          type="button"
          onClick={handleZone(-1)}
          className="absolute inset-y-0 left-0 w-1/3 cursor-default focus-visible:outline-none"
          aria-label="Previous story"
        />
        <button
          type="button"
          onClick={handleZone(1)}
          className="absolute inset-y-0 right-0 w-2/3 cursor-default focus-visible:outline-none"
          aria-label="Next story"
        />

        {/* Desktop arrows, since a click target with no cursor affordance is easy to miss. */}
        <button
          type="button"
          onClick={() => advance(-1)}
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex"
          aria-label="Previous story"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => advance(1)}
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex"
          aria-label="Next story"
        >
          <ChevronRight size={20} />
        </button>

        {/* Header: progress segments, author, controls. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex gap-1 px-3">
            {activeGroup.stories.map((story, index) => (
              <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width:
                      index < cursor.story
                        ? '100%'
                        : index === cursor.story
                          ? `${Math.round(progress * 100)}%`
                          : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-auto mt-3 flex items-center gap-3 px-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/profile/${activeGroup.username || activeGroup.userId}`);
              }}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <Avatar src={activeGroup.avatarUrl || undefined} name={authorName} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">{authorName}</span>
                <span className="block text-[11px] text-white/70">
                  {formatStoryTime(activeStory.createdAt)}
                </span>
              </span>
            </button>

            {activeStory.mediaType === 'video' && (
              <button
                type="button"
                onClick={() => setMuted((previous) => !previous)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label={muted ? 'Unmute story' : 'Mute story'}
              >
                {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close stories"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Footer: caption, plus the author's own view count and delete control. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12">
          {activeStory.caption && (
            <p className="mb-3 max-h-24 overflow-y-auto text-sm leading-relaxed text-white">
              {activeStory.caption}
            </p>
          )}

          {isMine && (
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => void openViewers()}
                className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                <Eye size={15} />
                {activeStory.viewCount} {activeStory.viewCount === 1 ? 'view' : 'views'}
              </button>

              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex h-10 items-center gap-2 rounded-full bg-red-500 px-4 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting && <Loader2 size={14} className="animate-spin" />}
                    Delete story
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex h-10 items-center rounded-full bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/20"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                    setPaused(true);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label="Delete this story"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showViewers && (
        <div className="absolute inset-0 z-10 flex items-end bg-black/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
          <section className="flex max-h-[70dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sun-border bg-sun-surface">
            <header className="flex shrink-0 items-center justify-between border-b border-sun-border px-5 py-4">
              <h3 className="text-sm font-bold text-sun-text-main">
                Viewed by {viewers ? viewers.length : ''}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowViewers(false);
                  setPaused(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-sun-text-muted transition-colors hover:bg-sun-surface-light"
                aria-label="Close viewer list"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {viewers === null ? (
                <p className="p-4 text-center text-xs text-sun-text-muted">Loading viewers…</p>
              ) : viewers.length === 0 ? (
                <p className="p-4 text-center text-xs text-sun-text-muted">No one has watched this yet.</p>
              ) : (
                viewers.map((viewer) => (
                  <button
                    key={viewer.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${viewer.username || viewer.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-sun-surface-light"
                  >
                    <Avatar
                      src={viewer.avatarUrl || undefined}
                      name={viewer.fullName || viewer.username || 'K'}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-sun-text-main">
                        {viewer.fullName || viewer.username || 'Korusa member'}
                      </span>
                      {viewer.username && (
                        <span className="block truncate text-[11px] text-sun-text-muted">
                          @{viewer.username}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[10px] text-sun-text-muted">
                      {formatStoryTime(viewer.viewedAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

function formatStoryTime(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
