import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, Video, X } from 'lucide-react';
import {
  ALLOWED_STORY_MIME_TYPES,
  MAX_STORY_BYTES,
  MAX_STORY_VIDEO_MS,
  readVideoDurationMs,
  uploadStory,
} from '../../../lib/stories';

interface StoryComposerProps {
  userId: string;
  onClose: () => void;
  onPosted: () => void;
}

export const StoryComposer: React.FC<StoryComposerProps> = ({ userId, onClose, onPosted }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Object URLs are a real leak if they outlive the element that used them.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const isVideo = !!file?.type.startsWith('video/');

  const handleSelect = async (selected: File | undefined) => {
    if (!selected) return;
    setError(null);

    if (!ALLOWED_STORY_MIME_TYPES.includes(selected.type)) {
      setError('Choose a JPEG, PNG, WebP, GIF, MP4, WebM or MOV file.');
      return;
    }
    if (selected.size > MAX_STORY_BYTES) {
      setError('That file is larger than 50 MB.');
      return;
    }
    if (selected.type.startsWith('video/')) {
      const durationMs = await readVideoDurationMs(selected);
      if (durationMs !== null && durationMs > MAX_STORY_VIDEO_MS) {
        setError(`That clip is ${Math.round(durationMs / 1000)}s. Stories are capped at 60s.`);
        return;
      }
    }

    setFile(selected);
  };

  const handlePost = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      await uploadStory(userId, file, caption);
      onPosted();
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not post your story.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {/* max-h-[90dvh] with a min-h-0 scroll body keeps this usable on a landscape phone. */}
      <section className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sun-border bg-sun-surface shadow-premium">
        <header className="flex shrink-0 items-center justify-between border-b border-sun-border px-5 py-4">
          <h2 className="font-display text-base font-bold text-sun-text-main">Add to your story</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full text-sun-text-muted transition-colors hover:bg-sun-surface-light hover:text-sun-text-main disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_STORY_MIME_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              void handleSelect(event.target.files?.[0]);
              event.target.value = '';
            }}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[9/14] w-full max-h-[46dvh] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-sun-border bg-sun-surface-light text-sun-text-muted transition-colors hover:border-sun-primary/60 hover:text-sun-text-main"
            >
              <div className="flex gap-2">
                <ImagePlus size={26} />
                <Video size={26} />
              </div>
              <span className="text-sm font-semibold">Choose a photo or video</span>
              <span className="px-6 text-center text-[11px] leading-relaxed">
                Up to 50 MB. Videos up to 60 seconds. Visible for 24 hours.
              </span>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-black">
              {isVideo ? (
                <video
                  src={previewUrl ?? undefined}
                  className="max-h-[46dvh] w-full object-contain"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={previewUrl ?? undefined}
                  alt="Story preview"
                  className="max-h-[46dvh] w-full object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={busy}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-40"
                aria-label="Remove selection"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-sun-text-muted">
              Caption <span className="font-medium normal-case tracking-normal">(optional)</span>
            </span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 280))}
              rows={2}
              placeholder="Say something about it"
              className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light px-3 py-2.5 text-sm text-sun-text-main outline-none transition-colors placeholder:text-sun-text-muted focus:border-sun-primary"
            />
            <span className="mt-1 block text-right text-[10px] text-sun-text-muted">{caption.length}/280</span>
          </label>

          {error && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-600">
              <AlertCircle size={14} className="mt-px shrink-0" />
              {error}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-sun-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 flex-1 rounded-xl border border-sun-border text-sm font-bold text-sun-text-main transition-colors hover:bg-sun-surface-light disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={!file || busy}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sun-primary text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Posting' : 'Share story'}
          </button>
        </footer>
      </section>
    </div>
  );
};
