import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Star, 
  Users, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Globe, 
  Smartphone, 
  Award, 
  Share2, 
  Info,
  Calendar,
  Lock,
  PlayCircle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';

interface Lesson {
  title: string;
  duration: string;
  isPreview?: boolean;
}

interface Section {
  title: string;
  lessons: Lesson[];
}

const mockCurriculum: Section[] = [
  {
    title: 'Introduction to Wisdom Architecture',
    lessons: [
      { title: 'The Philosophy of Scaling Knowledge', duration: '12:45', isPreview: true },
      { title: 'Defining Your Wisdom Core', duration: '08:20', isPreview: true },
      { title: 'Cognitive Load & Transfer Dynamics', duration: '15:10' },
    ]
  },
  {
    title: 'Designing for Information Growth',
    lessons: [
      { title: 'Modular Content Systems', duration: '22:15' },
      { title: 'The Loop: Feedback as Fuel', duration: '18:40' },
      { title: 'Iterative Refinement of Expert Models', duration: '25:30' },
    ]
  },
  {
    title: 'Technical Implementation',
    lessons: [
      { title: 'Korusa API Ecosystem', duration: '30:00' },
      { title: 'Secure Distribution of Proprietary IP', duration: '12:10' },
      { title: 'Auto-scaling Mentorship with AI', duration: '45:00' },
    ]
  }
];

export const CourseDetailView = ({ onBack, onStartLearning }: { onBack: () => void, onStartLearning: () => void }) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6">
        <BackButton onClick={onBack} label="Courses" sticky />
        {/* Breadcrumbs / Back */}
        <nav className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-sun-text-muted">
          <span className="opacity-70">Design Systems</span>
          <span className="opacity-30">/</span>
          <span className="text-white truncate max-w-[150px] sm:max-w-none">Scaling Wisdom</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content (Left) */}
        <div className="lg:col-span-8 space-y-8 sm:space-y-12">
          {/* Header */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Badge variant="primary" className="!rounded-lg px-2 sm:px-3 py-1 text-[10px]">Best Seller</Badge>
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-sun-surface rounded-lg border border-sun-border">
                <Star size={12} className="text-sun-primary fill-sun-primary" />
                <span className="text-[10px] sm:text-xs font-black">4.9</span>
                <span className="text-[8px] sm:text-[10px] text-sun-text-muted">(1,248 reviews)</span>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight tracking-tight">
              Scaling Wisdom: The Architecture of Expert Systems
            </h1>
            
            <p className="text-sm sm:text-lg text-sun-text-muted leading-relaxed max-w-2xl font-medium">
              Learn how to decompose complex expert knowledge into scalable, interactive systems that empower thousands without losing nuance.
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-2 sm:pt-4">
              <div className="flex items-center gap-3">
                <Avatar size="sm" src="https://i.pravatar.cc/150?u=12" />
                <div className="text-[10px] sm:text-xs">
                  <p className="text-sun-text-muted font-medium mb-0.5">Created by</p>
                  <p className="font-bold text-white hover:text-sun-primary cursor-pointer">Alex Rivera</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-sun-text-muted" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">English</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-sun-text-muted" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">04/2026</span>
              </div>
            </div>
          </div>

          {/* Video Preview */}
          <div className="relative aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-black border border-sun-border group shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80" 
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" 
              alt="Course Preview" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={onStartLearning}
                className="w-14 h-14 sm:w-20 sm:h-20 bg-sun-primary text-black rounded-full flex items-center justify-center shadow-2xl shadow-sun-primary/20 hover:scale-110 transition-transform active:scale-95 group/btn"
              >
                <Play size={24} className="sm:size-32 fill-current ml-1" />
              </button>
            </div>
            <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10">
              <PlayCircle size={14} className="text-sun-primary" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white">Preview this course</span>
            </div>
          </div>

          {/* What you'll learn */}
          <section className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-display font-bold">What you'll learn</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                'Build resilient design systems for multi-modal knowledge delivery',
                'Implement the AI-Augmented Wisdom Loop in existing workflows',
                'Deconstruct tacit expert knowledge into explicit mental models',
                'Scale mentorship through automated, contextual feedback chains',
                'Measure the ROI of intellectual property scaling at the enterprise level',
                'Design intuitive interfaces for deep information absorption'
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="shrink-0 mt-1">
                    <CheckCircle2 size={16} className="text-sun-primary" />
                  </div>
                  <p className="text-[11px] sm:text-sm text-sun-text-muted leading-relaxed font-medium">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Curriculum */}
          <section className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-display font-bold">Course Content</h2>
              <div className="flex gap-3 text-[8px] sm:text-[10px] font-bold text-sun-text-muted uppercase tracking-widest">
                <span>12 Sections</span>
                <span>84 Lectures</span>
                <span>14h 22m total</span>
              </div>
            </div>

            <div className="border border-sun-border rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden divide-y divide-sun-border">
              {mockCurriculum.map((section, idx) => (
                <div key={idx} className="bg-sun-surface/20">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {expandedSection === idx ? <ChevronUp size={18} className="text-sun-primary" /> : <ChevronDown size={18} />}
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm tracking-tight">{section.title}</h3>
                        <p className="text-[8px] sm:text-[10px] text-sun-text-muted uppercase tracking-widest mt-1 font-bold">
                          {section.lessons.length} lessons • 54m
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedSection === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-1 sm:space-y-2">
                          {section.lessons.map((lesson, lIdx) => (
                            <div 
                              key={lIdx} 
                              onClick={onStartLearning}
                              className="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-1.5 sm:p-2 bg-sun-surface rounded-lg text-sun-text-muted group-hover:text-sun-primary transition-colors">
                                  {lesson.isPreview ? <PlayCircle size={12} /> : <Lock size={12} />}
                                </div>
                                <div>
                                  <p className={`text-[10px] sm:text-xs font-bold leading-none ${lesson.isPreview ? 'text-white' : 'text-sun-text-muted'}`}>
                                    {lesson.title}
                                  </p>
                                  {lesson.isPreview && <p className="text-[7px] sm:text-[8px] text-sun-primary uppercase tracking-widest mt-1 font-black">Free Preview</p>}
                                </div>
                              </div>
                              <span className="text-[8px] sm:text-[10px] font-mono text-sun-text-muted">{lesson.duration}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Card (Right) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 space-y-6 sm:space-y-8 border-sun-primary/20 shadow-2xl shadow-sun-primary/5"
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-sun-primary">Limited Time Offer</span>
                <span className="text-[10px] sm:text-xs text-sun-text-muted line-through">$199.99</span>
              </div>
              <div className="flex items-end gap-2">
                <h3 className="text-3xl sm:text-5xl font-display font-bold leading-none">$49.99</h3>
                <span className="text-sun-primary text-xs sm:text-base font-black mb-1">75% OFF</span>
              </div>
              <p className="text-[8px] sm:text-[10px] text-sun-text-muted font-bold uppercase tracking-widest">
                Ends in <span className="text-red-500">2 days</span>
              </p>
            </div>

            <div className="space-y-3 pt-2 sm:pt-4">
              <Button 
                onClick={onStartLearning}
                size="lg" className="w-full h-14 sm:h-16 text-base sm:text-lg rounded-2xl shadow-xl shadow-sun-primary/20 ring-4 ring-sun-primary/10"
              >
                Enroll Now
              </Button>
              <Button variant="outline" className="w-full !rounded-2xl h-12 sm:h-14 text-sm">Add to Cart</Button>
              <p className="text-[8px] sm:text-[10px] text-center text-sun-text-muted font-medium mt-2">30-Day Money-Back Guarantee</p>
            </div>

            <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4">
              <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white">This course includes:</h4>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  { icon: Clock, text: '14 hours on-demand' },
                  { icon: Award, text: 'Certificate' },
                  { icon: Smartphone, text: 'Mobile access' },
                  { icon: Info, text: 'Lifetime access' }
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[10px] sm:text-xs text-sun-text-muted font-medium">
                    <item.icon size={14} className="text-sun-primary" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Reviews Preview */}
      <section className="space-y-10 pt-20 border-t border-sun-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold">What practitioners say</h2>
            <p className="text-sun-text-muted text-sm font-medium">Trusted by teams at Figma, Stripe, and Vercel.</p>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <div className="flex items-center gap-1.5 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} size={20} className="text-sun-primary fill-sun-primary" />)}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-white">4.9 Average Rating</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {[
             { name: 'Marcus T.', role: 'Head of Product', comment: "This completely changed how we think about internal documentation. Knowledge flows so much faster now." },
             { name: 'Elena Ray', role: 'Design Lead', comment: "The module on tacit knowledge deconstruction is absolute gold. Never seen this level of depth elsewhere." }
           ].map((review, i) => (
             <div key={i} className="glass-card p-8 rounded-[2.5rem] space-y-4">
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-sun-primary fill-sun-primary" />)}
                </div>
                <p className="text-sm italic leading-relaxed text-sun-text-main">"{review.comment}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-sun-border/30">
                  <div className="w-10 h-10 rounded-full bg-sun-primary/10 flex items-center justify-center font-bold text-sun-primary">{review.name[0]}</div>
                  <div>
                    <p className="text-xs font-bold">{review.name}</p>
                    <p className="text-[10px] text-sun-text-muted uppercase tracking-wider">{review.role}</p>
                  </div>
                </div>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};
