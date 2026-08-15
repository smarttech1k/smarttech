import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { StoryComposer } from './StoryComposer';
import { StoryViewerOverlay } from './StoryViewer';
import {
  listStoryGroups,
  removeStorySubscription,
  subscribeToStories,
  type StoryGroup,
} from '../../../lib/stories';

interface StoriesRailProps {
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
}

export const StoriesRail: React.FC<StoriesRailProps> = ({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(await listStoryGroups());
    } catch {
      // An unreachable story feed should not take the whole home page down; the
      // rail falls back to the "Your story" tile alone.
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = subscribeToStories(() => void load());
    return () => {
      void removeStorySubscription(channel);
    };
  }, [load]);

  const updateScrollButtons = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollLeft(scroller.scrollLeft > 4);
    setCanScrollRight(scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [groups, updateScrollButtons]);

  const scrollBy = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Patch the one story locally instead of refetching the whole rail, so the ring
  // updates the moment a slide is watched.
  const handleViewed = useCallback((storyId: string) => {
    setGroups((previous) =>
      previous.map((group) => {
        if (!group.stories.some((story) => story.id === storyId)) return group;
        const stories = group.stories.map((story) =>
          story.id === storyId ? { ...story, viewedByMe: true } : story,
        );
        return {
          ...group,
          stories,
          hasUnseen: group.isMine ? false : stories.some((story) => !story.viewedByMe),
        };
      }),
    );
  }, []);

  const myGroup = groups.find((group) => group.isMine) ?? null;
  const myGroupIndex = myGroup ? groups.indexOf(myGroup) : -1;
  const otherGroups = groups.filter((group) => !group.isMine);
  const displayName = currentUserName || 'You';

  return (
    <section className="relative mb-6" aria-label="Stories">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute -left-1 top-[38px] z-20 hidden h-8 w-8 items-center justify-center rounded-full border border-sun-border bg-sun-surface/90 text-sun-text-main shadow-lg backdrop-blur transition-colors hover:bg-sun-primary hover:text-black sm:flex"
          aria-label="Scroll stories left"
        >
          <ChevronLeft size={17} />
        </button>
      )}

      <div
        ref={scrollerRef}
        onScroll={updateScrollButtons}
        className="scrollbar-hide flex gap-4 overflow-x-auto px-1 pb-1 pt-1"
      >
        {/* Your story: opens the composer, or your own reel if one is live. */}
        {currentUserId && (
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  myGroupIndex >= 0 ? setViewerStart(myGroupIndex) : setComposerOpen(true)
                }
                className="block rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/25"
                title={myGroup ? 'View your story' : 'Add to your story'}
              >
                <StoryRing highlighted={!!myGroup}>
                  <Avatar size="full" src={currentUserAvatarUrl || undefined} name={displayName} />
                </StoryRing>
              </button>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-sun-bg bg-sun-primary text-black shadow-md transition-transform hover:scale-105"
                aria-label="Add to your story"
              >
                <Plus size={13} strokeWidth={3.5} />
              </button>
            </div>
            <span className="w-[72px] truncate text-center text-[11px] font-medium text-sun-text-muted">
              Your story
            </span>
          </div>
        )}

        {loading && !groups.length
          ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex shrink-0 flex-col items-center gap-2">
                <div className="h-16 w-16 animate-pulse rounded-full bg-sun-surface-light sm:h-[68px] sm:w-[68px]" />
                <div className="h-2.5 w-14 animate-pulse rounded-full bg-sun-surface-light" />
              </div>
            ))
          : otherGroups.map((group) => {
              const name = group.fullName || group.username || 'Korusa member';
              return (
                <button
                  key={group.userId}
                  type="button"
                  onClick={() => setViewerStart(groups.indexOf(group))}
                  className="flex shrink-0 flex-col items-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/25"
                  title={`View ${name}'s story`}
                >
                  <StoryRing highlighted={group.hasUnseen}>
                    <Avatar size="full" src={group.avatarUrl || undefined} name={name} />
                  </StoryRing>
                  <span
                    className={`w-[72px] truncate text-center text-[11px] ${
                      group.hasUnseen
                        ? 'font-semibold text-sun-text-main'
                        : 'font-medium text-sun-text-muted'
                    }`}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute -right-1 top-[38px] z-20 hidden h-8 w-8 items-center justify-center rounded-full border border-sun-border bg-sun-surface/90 text-sun-text-main shadow-lg backdrop-blur transition-colors hover:bg-sun-primary hover:text-black sm:flex"
          aria-label="Scroll stories right"
        >
          <ChevronRight size={17} />
        </button>
      )}

      {composerOpen && currentUserId && (
        <StoryComposer
          userId={currentUserId}
          onClose={() => setComposerOpen(false)}
          onPosted={() => void load()}
        />
      )}

      {viewerStart !== null && groups[viewerStart] && (
        <StoryViewerOverlay
          groups={groups}
          startGroupIndex={viewerStart}
          onClose={() => setViewerStart(null)}
          onViewed={handleViewed}
          onDeleted={() => void load()}
        />
      )}
    </section>
  );
};

// Gradient ring means unseen, flat border means watched. Both states are derived
// from the story rows, never decorative.
const StoryRing = ({
  highlighted,
  children,
}: {
  highlighted: boolean;
  children: React.ReactNode;
}) => (
  <span
    className={`flex h-16 w-16 items-center justify-center rounded-full sm:h-[68px] sm:w-[68px] ${
      highlighted
        ? 'bg-gradient-to-tr from-sun-primary via-amber-400 to-rose-500'
        : 'bg-sun-border'
    }`}
  >
    <span className="flex h-[calc(100%-5px)] w-[calc(100%-5px)] items-center justify-center rounded-full bg-sun-bg p-[2px]">
      {children}
    </span>
  </span>
);
