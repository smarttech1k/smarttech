import React, { useState } from 'react';
import { Award, BookOpen, CalendarDays, Coins, GraduationCap, Lightbulb, Mic2, Presentation, Users, X } from 'lucide-react';
import type { MessageRow } from '../../../lib/messages';

export type KorusaToolDraft = {
  type: MessageRow['message_type'];
  body: string;
  metadata: Record<string, unknown>;
};

export const KorusaToolsMenu = ({ onClose, onCreate }: { onClose: () => void; onCreate: (draft: KorusaToolDraft) => Promise<void> | void }) => {
  const [selectedType, setSelectedType] = useState<MessageRow['message_type']>('study_session');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [progress, setProgress] = useState(50);
  const tools = [
    { type: 'study_session', label: 'Study session', icon: CalendarDays },
    { type: 'study_room', label: 'Study room', icon: Users },
    { type: 'whiteboard', label: 'Whiteboard', icon: Presentation },
    { type: 'consultation', label: 'Consultation', icon: Lightbulb },
    { type: 'course', label: 'Recommend course', icon: BookOpen },
    { type: 'progress', label: 'Progress card', icon: GraduationCap },
    { type: 'mentor_booking', label: 'Mentor booking', icon: Award },
    { type: 'voice_room', label: 'Voice room', icon: Mic2 },
    { type: 'tip', label: 'Creator tip', icon: Coins },
  ] as const;

  const submit = async () => {
    const tool = tools.find((item) => item.type === selectedType);
    const cleanTitle = title.trim() || tool?.label || 'Korusa invitation';
    await onCreate({
      type: selectedType,
      body: cleanTitle,
      metadata: {
        title: cleanTitle,
        description: description.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        progress: selectedType === 'progress' ? progress : null,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end bg-black/45 backdrop-blur-sm md:absolute md:items-center md:justify-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="korusa-tools-title">
      <section className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] border border-sun-border bg-sun-surface p-4 shadow-2xl md:max-w-lg md:rounded-[28px]">
        <header className="flex items-center justify-between"><div><h2 id="korusa-tools-title" className="font-display text-lg font-bold">Create together</h2><p className="text-[10px] text-sun-text-muted">Bring learning and creator experiences into this chat.</p></div><button type="button" onClick={onClose} className="composer-tool" aria-label="Close Korusa tools"><X size={18} /></button></header>
        <div className="mt-4 grid grid-cols-3 gap-2">{tools.map((tool) => <button key={tool.type} type="button" onClick={() => setSelectedType(tool.type)} className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-[9px] font-semibold transition-all ${selectedType === tool.type ? 'border-sun-primary bg-sun-primary/10 text-sun-primary' : 'border-sun-border text-sun-text-muted hover:border-sun-primary/30'}`}><tool.icon size={18} /><span>{tool.label}</span></button>)}</div>
        <div className="mt-4 space-y-3">
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Title" className="h-11 w-full rounded-xl border border-sun-border bg-sun-surface-light px-3 text-sm outline-none focus:border-sun-primary" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="Add a short note or goal" className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light p-3 text-sm outline-none focus:border-sun-primary" />
          {['study_session', 'study_room', 'consultation', 'mentor_booking', 'voice_room'].includes(selectedType) && <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-11 w-full rounded-xl border border-sun-border bg-sun-surface-light px-3 text-sm outline-none focus:border-sun-primary" />}
          {selectedType === 'progress' && <label className="block text-xs font-semibold">Progress: {progress}%<input type="range" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="mt-2 w-full accent-sun-primary" /></label>}
          <button type="button" onClick={() => void submit()} className="w-full rounded-xl bg-gradient-to-r from-sun-primary to-sun-secondary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sun-primary/15">Share in conversation</button>
        </div>
      </section>
    </div>
  );
};
