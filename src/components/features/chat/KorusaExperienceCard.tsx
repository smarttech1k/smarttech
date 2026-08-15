import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Mic2,
  Presentation,
  Users,
} from 'lucide-react';
import type { MessageRow } from '../../../lib/messages';

const experienceTypes = new Set<MessageRow['message_type']>([
  'study_session', 'study_room', 'whiteboard', 'consultation', 'progress',
  'quiz', 'mentor_booking', 'voice_room', 'tip',
]);

export const isKorusaExperience = (type: MessageRow['message_type']) => experienceTypes.has(type);

export const KorusaExperienceCard = ({ message, mine = false }: { message: MessageRow; mine?: boolean }) => {
  const metadata = message.metadata || {};
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  if (!isKorusaExperience(message.message_type)) return null;

  const config = getConfig(message.message_type);
  const Icon = config.icon;
  const title = text(metadata.title) || message.body;
  const description = text(metadata.description);
  const scheduledAt = text(metadata.scheduled_at);
  const joinUrl = text(metadata.join_url);
  const progress = typeof metadata.progress === 'number' ? Math.max(0, Math.min(100, metadata.progress)) : null;
  const options = Array.isArray(metadata.options) ? metadata.options.filter((item): item is string => typeof item === 'string') : [];

  return (
    <div className={`mb-2 w-full min-w-[min(250px,100%)] max-w-sm overflow-hidden rounded-2xl border text-left shadow-sm ${mine ? 'border-white/20 bg-white/10' : 'border-sun-border bg-sun-surface-light'}`}>
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${config.gradient}`}><Icon size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-60">{config.label}</p>
            <h4 className="mt-0.5 text-sm font-bold leading-snug">{title}</h4>
            {description && <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed opacity-70">{description}</p>}
          </div>
        </div>

        {scheduledAt && <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-black/5 px-2.5 py-2 text-[10px] font-semibold dark:bg-white/5"><CalendarDays size={13} />{new Date(scheduledAt).toLocaleString()}</div>}
        {progress !== null && <div className="mt-3"><div className="mb-1 flex justify-between text-[9px] font-semibold"><span>Learning progress</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sun-primary to-sun-secondary" style={{ width: `${progress}%` }} /></div></div>}
        {message.message_type === 'quiz' && options.length > 0 && <div className="mt-3 space-y-1.5">{options.map((option, index) => <button key={option} type="button" onClick={() => setSelectedAnswer(index)} className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[10px] transition-colors ${selectedAnswer === index ? 'border-sun-primary bg-sun-primary/10 text-sun-primary' : 'border-current/10 hover:border-sun-primary/30'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current/20 text-[9px]">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[9px] font-medium opacity-60"><Clock size={11} />Shared in Korusa</span>
          {joinUrl ? <a href={joinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-sun-primary px-3 py-2 text-[10px] font-bold text-white">Open <ExternalLink size={11} /></a> : message.message_type === 'tip' ? <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold text-amber-600">Tipping coming soon</span> : <span className="rounded-full bg-sun-primary/10 px-2.5 py-1 text-[9px] font-bold text-sun-primary">Invitation</span>}
        </div>
      </div>
    </div>
  );
};

function getConfig(type: MessageRow['message_type']) {
  const configs: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
    study_session: { label: 'Study session', icon: CalendarDays, gradient: 'from-violet-600 to-purple-400' },
    study_room: { label: 'Collaborative study room', icon: Users, gradient: 'from-indigo-600 to-violet-400' },
    whiteboard: { label: 'Shared whiteboard', icon: Presentation, gradient: 'from-fuchsia-600 to-purple-400' },
    consultation: { label: 'Creator consultation', icon: Lightbulb, gradient: 'from-purple-600 to-pink-400' },
    progress: { label: 'Learning progress', icon: GraduationCap, gradient: 'from-emerald-600 to-teal-400' },
    quiz: { label: 'Quiz card', icon: BookOpen, gradient: 'from-amber-500 to-orange-400' },
    mentor_booking: { label: 'Mentor booking', icon: Award, gradient: 'from-blue-600 to-indigo-400' },
    voice_room: { label: 'Voice study room', icon: Mic2, gradient: 'from-rose-500 to-purple-500' },
    tip: { label: 'Creator appreciation', icon: Coins, gradient: 'from-amber-500 to-yellow-300' },
  };
  return configs[type] || { label: 'Korusa experience', icon: CheckCircle2, gradient: 'from-sun-primary to-sun-secondary' };
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}
