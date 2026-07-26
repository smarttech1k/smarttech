import React from 'react';
import { BookOpen, Clock3, Sparkles } from 'lucide-react';
import { BackButton } from '../../ui/BackButton';

interface LearnViewProps {
  onStartLearning: () => void;
  onBack?: () => void;
}

export const LearnView: React.FC<LearnViewProps> = ({ onBack }) => {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col">
      {onBack && (
        <div className="mb-6">
          <BackButton onClick={onBack} label="Dashboard" />
        </div>
      )}

      <section className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-sun-border bg-sun-surface px-6 py-16 text-center shadow-sm sm:px-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sun-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-sun-secondary/10 blur-3xl" />

        <div className="relative z-10 max-w-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-sun-primary/20 bg-sun-primary/10 text-sun-primary">
            <BookOpen size={34} />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-sun-primary/20 bg-sun-primary/8 px-3 py-1.5 text-xs font-semibold text-sun-primary">
            <Clock3 size={14} />
            Coming soon
          </div>

          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Korusa Learning is being prepared
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-sun-text-muted sm:text-base">
            Coming soon, please come back later. We are carefully preparing creators,
            lessons, and learning experiences before opening enrollment.
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-sun-text-muted">
            <Sparkles size={16} className="text-sun-primary" />
            Quality courses from trusted Korusa creators
          </div>
        </div>
      </section>
    </div>
  );
};
