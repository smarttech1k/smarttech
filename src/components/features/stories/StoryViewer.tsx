import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Send,
  SmilePlus,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { REACTION_EMOJIS } from '../../../lib/reactions';
import {
  STORY_IMAGE_DURATION_MS,
  deleteStory,
  getStoryInsights,
  getStoryViewers,
  markStoryViewed,
  sendStoryReply,
  setStoryReaction,
  type StoryGroup,
  type StoryViewer,
} from '../../../lib/stories';

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
  // Fired after a story is recorded as seen, so the rail can drop its unseen ring.
  onViewed: (storyId: string) => void;
  // Fired after a reaction is saved, so the rail keeps the emoji lit if the viewer
  // closes and reopens without a reload.
  onReacted: (storyId: string, emoji: string | null) => void;
  onDeleted: () => void;
}

// How long a press has to be held before it counts as "pause" rather than a tap.
const HOLD_TO_PAUSE_MS = 250;

// Below this the shrink is a browser toolbar, not a keyboard.
const KEYBOARD_MIN_INSET_PX = 60;

export const StoryViewerOverlay: React.FC<StoryViewerProps> = ({
  groups,
  startGroupIndex,
  onClose,
  onViewed,
  onReacted,
  onDeleted,
}) => {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState({ group: startGroupIndex, story: 0 });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[] | null>(null);
  const [insights, setInsights] = useState<{ viewCount: number; reactionCount: number } | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showReactionRail, setShowReactionRail] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

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
  // The viewer list and counts are cleared too, so the previous story's audience
  // cannot flash under the next story's heading before its own data arrives - and
  // so are the draft, the emoji rail and any error, which belong to the story they
  // were written against and would otherwise carry over to the next one.
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setPaused(false);
    setShowViewers(false);
    setConfirmDelete(false);
    setViewers(null);
    setInsights(null);
    setShowReactionRail(false);
    setDraft('');
    setReplySent(false);
    setActionError(null);
  }, [cursor.group, cursor.story]);

  // The lit emoji comes from the rail's snapshot, then from whatever the server
  // last confirmed. Reading it into state rather than off the prop directly lets a
  // tap update immediately while still re-syncing when the rail patch flows back.
  useEffect(() => {
    setMyReaction(activeStory?.myReaction ?? null);
  }, [activeStory?.id, activeStory?.myReaction]);

  // Your own slide asks for its live totals, because the numbers that travelled
  // with the rail were taken before anyone had watched or reacted. Only the author
  // can read these, and only their own stories show them at all.
  useEffect(() => {
    if (!activeStory || !activeGroup?.isMine) return;
    let active = true;
    void getStoryInsights(activeStory.id)
      .then((result) => {
        if (active && result) setInsights(result);
      })
      // Falling back to the rail's snapshot beats showing nothing.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeStory, activeGroup?.isMine]);

  // The viewport meta in index.html has no interactive-widget, so the default
  // resizes-visual applies: the on-screen keyboard does not shrink the layout
  // viewport, and this footer - bottom-anchored inside an h-dvh overlay - ends up
  // behind it. Measuring the gap the keyboard occupies and lifting the footer by it
  // fixes the viewer without touching the global meta tag, which the chat composer
  // was already tuned against.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const gap = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardInset(gap > KEYBOARD_MIN_INSET_PX ? gap : 0);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

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

  // The overlay covers the page, so the feed behind it must stop scrolling -
  // otherwise a drag over the story scrolls the list underneath and the page
  // keeps its scrollbar alongside a supposedly full-screen viewer.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Typing in the reply field must not drive the story. Space in particular is
      // both the pause shortcut and preventDefault'ed below, which would make it
      // impossible to type a space in a reply.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        // Escape leaves the field rather than closing the whole viewer.
        if (event.key === 'Escape') target.blur();
        return;
      }
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
      const [list, live] = await Promise.all([
        getStoryViewers(activeStory.id),
        // Refreshed alongside the list rather than derived from its length: the
        // list is a union of watchers and reactors, so counting its rows would
        // overstate the views by anyone who reacted without a view row.
        getStoryInsights(activeStory.id).catch(() => null),
      ]);
      setViewers(list);
      if (live) setInsights(live);
    } catch {
      setViewers([]);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!activeStory || reacting) return;
    setReacting(true);
    setActionError(null);
    try {
      // The server answers with the emoji now in effect, or null once cleared, so
      // the lit state is never an optimistic guess.
      const next = await setStoryReaction(activeStory.id, emoji);
      setMyReaction(next);
      onReacted(activeStory.id, next);
      setShowReactionRail(false);
      // The rail paused the slide so the choice was unhurried; the choice is made
      // now, so let it run again - unless a reply is half-written underneath.
      setPaused(!!draft.trim());
    } catch (error) {
      setActionError(readableStoryError(error, 'Could not save your reaction.'));
    } finally {
      setReacting(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeStory || sending) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setActionError(null);
    try {
      await sendStoryReply(activeStory.id, body);
      setDraft('');
      // Confirmation rather than an echo of the message: the conversation itself
      // lives in Messages, not in the viewer. Nothing is being composed any more,
      // so the slide resumes.
      setReplySent(true);
      setPaused(false);
    } catch (error) {
      setActionError(readableStoryError(error, 'Could not send your reply.'));
    } finally {
      setSending(false);
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
  // Placeholders and confirmations read better with just the first name.
  const authorFirstName = authorName.split(' ')[0];
  const isMine = activeGroup.isMine;
  // The live totals once they arrive, the rail's snapshot until then.
  const viewCount = insights?.viewCount ?? activeStory.viewCount;
  const reactionCount = insights?.reactionCount ?? activeStory.reactionCount;

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh items-center justify-center bg-black md:px-16">
      {/* md:px-16 above reserves room for the arrows that sit outside the card.
          Without it the card - whose width is derived from its height - grows until
          max-w-full stops it at the viewport edge, clipping the arrows on a tall
          window.

          The dead space around the card is a way out, not a navigation target.
          On a phone the card is full bleed, so there is no dead space to hit. */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default focus-visible:outline-none"
        aria-label="Close stories"
      />

      {/* Full bleed on a phone; a 9:16 card from sm up, because a story is a
          portrait medium and a landscape clip stretched across a desktop window
          reads as a video player instead. w-auto lets the aspect ratio derive the
          width from the height; max-w-full keeps a short, wide window honest. */}
      <div className="relative z-10 flex h-full w-full items-center justify-center sm:aspect-[9/16] sm:h-[92dvh] sm:w-auto sm:max-w-full">
        {/* Chrome is positioned against this card rather than the viewport, so the
            author, progress bars and caption stay on the story instead of drifting
            into the letterbox gutters on a wide screen. */}
        <div
          className="relative h-full w-full overflow-hidden bg-neutral-950 sm:rounded-2xl"
          onPointerDown={beginHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
        >
          {/* Fill behind media that is not 9:16, so a landscape clip does not sit in
              a slab of dead black. A scaled, heavily blurred copy of the same source
              reads as depth instead of emptiness. For video this is a second element
              that is deliberately never played: with preload="auto" it paints its
              first frame and holds there, so nothing decodes twice. No canvas, which
              would need crossOrigin on a signed URL and break the slide outright if
              storage ever stopped sending CORS headers. */}
          {activeStory.mediaUrl && (
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              {activeStory.mediaType === 'video' ? (
                <video
                  key={`backdrop-${activeStory.id}`}
                  src={activeStory.mediaUrl}
                  className="h-full w-full scale-125 object-cover blur-2xl"
                  preload="auto"
                  muted
                  playsInline
                  tabIndex={-1}
                />
              ) : (
                <div
                  className="h-full w-full scale-125 bg-cover bg-center blur-2xl"
                  style={{ backgroundImage: `url("${activeStory.mediaUrl}")` }}
                />
              )}
              {/* Keeps the header, caption and controls legible over a bright fill. */}
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center">
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
          </div>

          {/* Tap zones: back on the left third of the card, forward on the rest. */}
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

          {/* Header: progress segments, author, controls. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <div className="flex gap-1 px-3">
              {activeGroup.stories.map((story, index) => (
                <div key={story.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label={muted ? 'Unmute story' : 'Mute story'}
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close stories"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Footer: caption, then either the author's own numbers and delete
              control, or - on someone else's story - the reaction rail and reply
              box. Lifted by keyboardInset so the input is not left under the
              on-screen keyboard. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 transition-transform duration-150"
            style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
          >
            {activeStory.caption && (
              <p className="mb-3 max-h-24 overflow-y-auto text-sm leading-relaxed text-white">
                {activeStory.caption}
              </p>
            )}

            {isMine ? (
              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openViewers()}
                  className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/20"
                  aria-label={`${viewCount} ${viewCount === 1 ? 'view' : 'views'}, ${reactionCount} ${
                    reactionCount === 1 ? 'reaction' : 'reactions'
                  }. Open the list.`}
                >
                  <Eye size={15} />
                  <span>{viewCount}</span>
                  {/* A neutral icon, not a heart: the reactions themselves vary, and
                      one emoji standing in for all of them would misreport them. */}
                  <span className="h-4 w-px bg-white/25" aria-hidden="true" />
                  <SmilePlus size={15} />
                  <span>{reactionCount}</span>
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
                      onClick={() => {
                        setConfirmDelete(false);
                        // Confirming paused the slide; declining has to release it.
                        setPaused(false);
                      }}
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
            ) : (
              <div
                className="pointer-events-auto"
                // The hold-to-pause handlers are bound to the card wrapper, so
                // without this every tap in here starts the pause timer and typing
                // flickers the story underneath.
                onPointerDown={(event) => event.stopPropagation()}
              >
                {actionError && (
                  <p className="mb-2 rounded-2xl bg-red-500/90 px-3 py-2 text-[11px] font-semibold text-white">
                    {actionError}
                  </p>
                )}

                {showReactionRail && (
                  <div className="mb-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => void handleReaction(emoji)}
                        disabled={reacting}
                        className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 disabled:opacity-50 ${
                          myReaction === emoji ? 'bg-white/25' : ''
                        }`}
                        aria-label={myReaction === emoji ? `Remove ${emoji}` : `React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const opening = !showReactionRail;
                      setShowReactionRail(opening);
                      // Opening holds the slide so the choice is unhurried;
                      // closing lets it run again, unless a reply is half-written.
                      setPaused(opening || !!draft.trim());
                    }}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-white transition-colors ${
                      myReaction ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    aria-label={myReaction ? 'Change your reaction' : 'React to this story'}
                    aria-expanded={showReactionRail}
                  >
                    {myReaction ?? <SmilePlus size={18} />}
                  </button>

                  {replySent ? (
                    <p className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-bold text-white">
                      <Check size={15} className="shrink-0" />
                      <span className="truncate">Sent to {authorFirstName}</span>
                    </p>
                  ) : (
                    <>
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onFocus={() => setPaused(true)}
                        // Only resume once there is nothing half-written: a slide
                        // that advanced under an unsent reply would discard it.
                        onBlur={() => {
                          if (!draft.trim()) setPaused(false);
                        }}
                        onKeyDown={(event) => {
                          // Arrows and space belong to the field, not the story.
                          event.stopPropagation();
                          if (event.key === 'Enter') void handleSendReply();
                        }}
                        placeholder={`Reply to ${authorFirstName}…`}
                        maxLength={4000}
                        className="h-11 min-w-0 flex-1 rounded-full border border-white/25 bg-black/50 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/50 focus:border-white/60"
                        aria-label={`Reply privately to ${authorName}`}
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendReply()}
                        disabled={!draft.trim() || sending}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                        aria-label="Send reply"
                      >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop arrows sit just outside the card, so they never cover the media
            and never land halfway across an empty screen. */}
        <button
          type="button"
          onClick={() => advance(-1)}
          className="absolute -left-14 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex"
          aria-label="Previous story"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => advance(1)}
          className="absolute -right-14 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex"
          aria-label="Next story"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {showViewers && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
          <section className="flex max-h-[70dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sun-border bg-sun-surface">
            <header className="flex shrink-0 items-center justify-between border-b border-sun-border px-5 py-4">
              {/* Not "Viewed by": the list is a union of watchers and reactors, so a
                  reaction with no recorded view still belongs in it. */}
              <h3 className="text-sm font-bold text-sun-text-main">
                Views and reactions{viewers ? ` · ${viewers.length}` : ''}
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
                    <span className="flex shrink-0 items-center gap-2 text-[10px] text-sun-text-muted">
                      {viewer.reaction && (
                        <span className="text-base leading-none" aria-label={`Reacted ${viewer.reaction}`}>
                          {viewer.reaction}
                        </span>
                      )}
                      {/* Null for someone who reacted without a view row on record. */}
                      {viewer.viewedAt ? formatStoryTime(viewer.viewedAt) : 'Reacted'}
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

// The reply and reaction RPCs raise on purpose, and some of those refusals are
// things the user can act on - especially the turn rule, which is not a failure at
// all. Matched on the message text because PostgREST surfaces a raise as a message
// rather than a code, and a Postgrest error is a plain object, not an Error.
function readableStoryError(error: unknown, fallback: string) {
  const message =
    typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';

  if (/waiting for a reply/i.test(message)) {
    return 'You have already replied. Wait for a response before sending another.';
  }
  if (/story not found/i.test(message)) return 'This story is no longer available.';
  if (/too long/i.test(message)) return 'That reply is too long.';
  if (/own story/i.test(message)) return 'This is your own story.';
  if (/authentication required/i.test(message)) return 'Sign in again to reply.';
  return fallback;
}
