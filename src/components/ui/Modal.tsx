import React, { useCallback, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

/**
 * The one dialog in the app.
 *
 * It exists because the profile page grew four hand-rolled modals and only one of them
 * - the photo viewer - closed on Escape or a backdrop click. The rest trapped you: no
 * Escape, no backdrop, no focus management, and the page scrolling underneath.
 *
 * Not built on src/components/shared/Modals.tsx, which is unimported dead code hardwired
 * to one width with non-functional buttons inside it.
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Rendered as the dialog's accessible name. Required even in media mode. */
  title: string;
  /** Hide the title bar's visible text but keep it as the accessible name. */
  hideTitle?: boolean;
  subtitle?: string;
  size?: ModalSize;
  /**
   * 'media' is the black, chromeless treatment for looking at a picture: no padding, no
   * surface background, and the panel shrinks to the image rather than the image
   * stretching to the panel.
   */
  variant?: 'panel' | 'media';
  /** Pinned below the scrolling body, for a save button that must stay reachable. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * How many modals are currently holding the scroll lock. A counter rather than a
 * boolean because the cover editor can open a confirm on top of itself, and the inner
 * one closing must not hand scrolling back to the page while the outer one is still up.
 */
let lockCount = 0;

/**
 * The app scrolls inside `main#main-content` (see AppLayout), not on the body - the
 * layout root is `h-dvh overflow-hidden`. Locking only the body would leave the page
 * scrolling behind the dialog on every screen in the app, which is the exact bug this
 * component is here to fix. Both are locked because a full-screen route may differ.
 */
function scrollTargets(): HTMLElement[] {
  const targets: HTMLElement[] = [];
  const main = document.getElementById('main-content');
  if (main) targets.push(main);
  if (document.body) targets.push(document.body);
  return targets;
}

function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;
  scrollTargets().forEach((element) => {
    element.dataset.modalPrevOverflow = element.style.overflow;
    element.style.overflow = 'hidden';
  });
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  scrollTargets().forEach((element) => {
    element.style.overflow = element.dataset.modalPrevOverflow ?? '';
    delete element.dataset.modalPrevOverflow;
  });
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  hideTitle = false,
  subtitle,
  size = 'md',
  variant = 'panel',
  footer,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Where focus was before we opened, so it can go back. Without this, closing a dialog
  // drops the caret at the top of the document and a keyboard user has to tab back to
  // wherever they were.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const isMedia = variant === 'media';

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    lockScroll();

    // Focus the panel itself rather than its first control: on a media viewer the first
    // control is the close button, and starting there reads as "close" to a screen
    // reader before it reads what was opened.
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      unlockScroll();
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (!focusable.length) {
        // Nothing to move between, so Tab would leave the dialog entirely.
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <div key="modal" className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className={`absolute inset-0 backdrop-blur-sm ${isMedia ? 'bg-black/85' : 'bg-black/60'}`}
          />

          {/* tabIndex -1 so the panel can hold focus on open without being a tab stop.
              onKeyDown on the panel rather than a window listener: a nested dialog then
              gets the Escape first, which is what stops one keystroke closing both. */}
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-3xl shadow-2xl outline-none ${
              SIZES[size]
            } ${isMedia ? 'bg-black' : 'border border-sun-border bg-sun-surface'}`}
          >
            <header
              className={`flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
                isMedia
                  ? 'border-b border-white/10 text-white'
                  : 'border-b border-sun-border text-sun-text-main'
              }`}
            >
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className={`truncate font-display font-semibold ${
                    hideTitle ? 'sr-only' : isMedia ? 'text-sm' : 'text-lg'
                  }`}
                >
                  {title}
                </h2>
                {subtitle && (
                  <p
                    className={`truncate text-xs ${isMedia ? 'text-white/60' : 'text-sun-text-muted'}`}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isMedia
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'text-sun-text-muted hover:bg-sun-surface-light'
                }`}
              >
                <X size={19} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

            {footer && (
              <footer
                className={`shrink-0 p-4 sm:p-5 ${
                  isMedia ? 'bg-black' : 'border-t border-sun-border bg-sun-surface'
                }`}
              >
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
