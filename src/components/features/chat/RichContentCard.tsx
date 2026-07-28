import React from 'react';
import { CalendarDays, ExternalLink, GraduationCap, Link2, Play, Users } from 'lucide-react';
import type { MessageRow } from '../../../lib/messages';

export const RichContentCard = ({ message, mine = false }: { message: MessageRow; mine?: boolean }) => {
  const metadata = message.metadata || {};
  const url = stringValue(metadata.url) || extractUrl(message.body);
  const title = stringValue(metadata.title);
  const description = stringValue(metadata.description);
  const imageUrl = stringValue(metadata.image_url);

  if (message.message_type === 'post' || message.message_type === 'course' || message.message_type === 'event') {
    const Icon = message.message_type === 'course' ? GraduationCap : message.message_type === 'event' ? CalendarDays : Users;
    return (
      <a href={url || '#'} target={url ? '_blank' : undefined} rel="noreferrer" className={`mb-2 block overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 ${mine ? 'border-white/20 bg-white/10' : 'border-sun-border bg-sun-surface-light'}`}>
        {imageUrl && <img src={imageUrl} alt="" className="h-32 w-full object-cover" />}
        <div className="p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider opacity-70"><Icon size={12} />Shared {message.message_type}</div>
          <p className="text-xs font-bold">{title || message.body}</p>
          {description && <p className="mt-1 line-clamp-2 text-[10px] opacity-70">{description}</p>}
        </div>
      </a>
    );
  }

  if (!url) return null;
  const hostname = safeHostname(url);
  const video = /youtube\.com|youtu\.be|vimeo\.com|tiktok\.com/i.test(url);
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`mb-2 block max-w-sm overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 ${mine ? 'border-white/20 bg-white/10' : 'border-sun-border bg-sun-surface-light'}`}>
      {imageUrl && <div className="relative"><img src={imageUrl} alt="" className="h-32 w-full object-cover" />{video && <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white"><Play size={18} fill="currentColor" /></span></span>}</div>}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider opacity-65">{video ? <Play size={11} /> : <Link2 size={11} />}{hostname}</div>
        <p className="mt-1 line-clamp-2 text-xs font-bold">{title || cleanUrl(url)}</p>
        {description && <p className="mt-1 line-clamp-2 text-[10px] opacity-70">{description}</p>}
        <span className="mt-2 flex items-center gap-1 text-[9px] font-semibold opacity-65">Open link <ExternalLink size={10} /></span>
      </div>
    </a>
  );
};

function extractUrl(value: string) {
  return value.match(/https?:\/\/[^\s]+/i)?.[0] || null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function safeHostname(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return 'Shared link'; }
}

function cleanUrl(value: string) {
  try { const parsed = new URL(value); return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}`; } catch { return value; }
}
