import React, { useMemo } from 'react';
import { splitTextWithLinks } from '../../lib/linkify';

interface LinkedTextProps {
  text: string;
  /** Overrides the anchor styling where the surrounding text is not body copy. */
  linkClassName?: string;
}

const DEFAULT_LINK_CLASS =
  'rounded font-semibold text-sun-primary underline decoration-sun-primary/40 underline-offset-2 transition-colors hover:decoration-sun-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-primary/40';

/**
 * Renders text with its URLs as anchors. Returns a fragment rather than a wrapper so
 * the caller keeps control of the paragraph it lives in.
 */
export const LinkedText = ({ text, linkClassName }: LinkedTextProps) => {
  const segments = useMemo(() => splitTextWithLinks(text), [text]);

  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'link' ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            // noreferrer/noopener because this points off-platform at an address a
            // member typed; nofollow ugc because it is user-generated content.
            rel="noopener noreferrer nofollow ugc"
            // A bio can sit inside a row that navigates when tapped. Without this the
            // link would open and the row would fire from the same tap.
            onClick={(event) => event.stopPropagation()}
            className={linkClassName ?? DEFAULT_LINK_CLASS}
          >
            {segment.label}
          </a>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
};
