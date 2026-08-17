import React, { useEffect, useState } from 'react';
import { CircleSlash, Play } from 'lucide-react';
import type { MessageRow } from '../../../lib/messages';
import { signStoryPath } from '../../../lib/stories';

// The reference card above a story reply, so the author knows which of their
// stories is being answered rather than reading a bare line of text.
//
// This component signs its own thumbnail. signMessageMediaBatch in lib/messages.ts
// is hardcoded to the message-media bucket, and teaching the thread loader about a
// second bucket would spread story concerns through a 1100-line file for a bubble
// type that appears rarely. One request, only when such a bubble exists.
//
// Degrading is the normal case, not an edge case: stories expire after 24 hours and
// nothing sweeps the bucket, so the object may or may not still sign. When it does
// not, the card stays as a label plus the caption. It is deliberately not a link -
// a visual reference, not a route back into a story that has probably expired.
export const StoryReplyCard = ({ message, mine = false }: { message: MessageRow; mine?: boolean }) => {
  const metadata = message.metadata || {};
  const mediaPath = typeof metadata.story_media_path === 'string' ? metadata.story_media_path : null;
  const mediaType = metadata.story_media_type === 'video' ? 'video' : 'image';
  const caption = typeof metadata.story_caption === 'string' && metadata.story_caption.trim()
    ? metadata.story_caption
    : null;

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!mediaPath) {
      setExpired(true);
      return;
    }
    let active = true;
    setThumbnailUrl(null);
    setExpired(false);
    void signStoryPath(mediaPath).then((url) => {
      if (!active) return;
      if (url) setThumbnailUrl(url);
      else setExpired(true);
    });
    return () => {
      active = false;
    };
  }, [mediaPath]);

  return (
    <div
      className={`mb-2 flex items-center gap-2.5 rounded-2xl border p-2 ${
        mine ? 'border-white/20 bg-white/10' : 'border-sun-border bg-sun-surface-light'
      }`}
    >
      {/* 9:16 crop, matching the shape the story was watched in. */}
      <div className="relative h-14 w-9 shrink-0 overflow-hidden rounded-lg bg-black/40">
        {thumbnailUrl ? (
          mediaType === 'video' ? (
            <>
              {/* Paused with preload="auto" this paints frame 0 and holds there, so a
                  thumbnail costs no playback. Same trick as the viewer's backdrop. */}
              <video src={thumbnailUrl} className="h-full w-full object-cover" preload="auto" muted playsInline tabIndex={-1} />
              <span className="absolute inset-0 flex items-center justify-center text-white/90">
                <Play size={12} fill="currentColor" />
              </span>
            </>
          ) : (
            <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <span className="flex h-full w-full items-center justify-center opacity-50">
            {expired ? <CircleSlash size={13} /> : null}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">
          {mine ? 'You replied to a story' : 'Replied to your story'}
        </p>
        {caption ? (
          <p className="mt-0.5 line-clamp-2 text-[10px] opacity-70">{caption}</p>
        ) : (
          <p className="mt-0.5 text-[10px] opacity-55">{expired ? 'No longer available' : `— ${mediaType}`}</p>
        )}
      </div>
    </div>
  );
};
