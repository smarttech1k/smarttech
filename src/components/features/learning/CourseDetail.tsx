import React, { useEffect, useState } from 'react';
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
  PlayCircle,
  ShoppingCart,
  Check
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { useUIStore } from '../../../store/uiStore';
import { apiRequest } from '../../../lib/api';

interface Lesson {
  title: string;
  duration: string;
  isPreview?: boolean;
}

interface Section {
  title: string;
  lessons: Lesson[];
}

export const CourseDetailView = ({ 
  course, 
  onBack, 
  onStartLearning 
}: { 
  course: any; 
  onBack: () => void; 
  onStartLearning: () => void; 
}) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const { cart, addToCart, enrolledCourses } = useUIStore();
  const [copied, setCopied] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await apiRequest<any>(`/courses/${course.id}`, {}, useUIStore.getState().authToken);
        if (!mounted) return;
        const nextSections = (response.sections || []).map((section: any) => ({
          title: section.title,
          lessons: (section.lesson_details || []).map((lesson: any) => ({
            title: lesson.title,
            duration: lesson.duration || '00:00',
            isPreview: lesson.is_preview,
          })),
        }));
        setSections(nextSections);
      } catch {
        if (mounted) setSections([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [course.id]);

  // Check if course is already in cart
  const isInCart = cart.some(item => item.id === course.id);
  // Check if enrolled in course
  const isEnrolled = enrolledCourses.includes(course.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(course);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-6">
        <BackButton onClick={onBack} label="Back to Platform" sticky />
        {/* Breadcrumbs / Back */}
        <nav className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-sun-text-muted">
          <span className="opacity-70">{course.category}</span>
          <span className="opacity-30">/</span>
          <span className="text-white truncate max-w-[200px] sm:max-w-none">{course.title}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content (Left) */}
        <div className="lg:col-span-8 space-y-8 sm:space-y-12">
          {/* Header */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Badge variant="primary" className="!rounded-lg px-2 sm:px-3 py-1 text-[10px]">Flagship Tier</Badge>
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-sun-surface rounded-lg border border-sun-border">
                <Star size={12} className="text-sun-primary fill-sun-primary" />
                <span className="text-[10px] sm:text-xs font-black">{course.rating || '4.9'}</span>
                <span className="text-[8px] sm:text-[10px] text-sun-text-muted">({course.students || '8.2k'} graduates)</span>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight tracking-tight text-sun-text-main">
              {course.title}
            </h1>
            
            <p className="text-sm sm:text-lg text-sun-text-muted leading-relaxed max-w-2xl font-medium">
              Transform your build ability with deep, structured modules and actual hands-on assignments. Led by premier creator experts.
            </p>

            {(course.course_link || course.data_link) && (
              <div className="flex flex-col gap-2 text-xs sm:text-sm">
                {course.course_link && (
                  <a
                    href={course.course_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sun-primary font-bold break-all hover:underline"
                  >
                    Open course / video link
                  </a>
                )}
                {course.data_link && (
                  <a
                    href={course.data_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sun-primary font-bold break-all hover:underline"
                  >
                    Open Google Drive data link
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-2 sm:pt-4">
              <div className="flex items-center gap-3">
                <Avatar size="sm" src={`https://i.pravatar.cc/150?u=${course.instructor}`} />
                <div className="text-[10px] sm:text-xs">
                  <p className="text-sun-text-muted font-medium mb-0.5">Created by</p>
                  <p className="font-bold text-white hover:text-sun-primary cursor-pointer">{course.instructor}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-sun-text-muted" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">English (HD Audio)</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-sun-text-muted" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">MEMBER ONLY ACCESS</span>
              </div>
            </div>
          </div>

          {/* Video Preview */}
          <div className="relative aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden bg-black border border-sun-border group shadow-2xl">
            <img 
              src={course.cover_photo || course.thumbnail} 
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" 
              alt="Course Cover" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={onStartLearning}
                className="w-14 h-14 sm:w-20 sm:h-20 bg-sun-primary text-black rounded-full flex items-center justify-center shadow-2xl shadow-sun-primary/20 hover:scale-110 transition-transform active:scale-95 group/btn"
              >
                <Play size={24} className="sm:size-8 fill-current ml-1" />
              </button>
            </div>
            <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10">
              <PlayCircle size={14} className="text-sun-primary" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white">Preview course intro</span>
            </div>
          </div>

          {/* What you'll learn */}
          <section className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-sun-text-main">What you'll master in this flagship course</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {[
                'Tell authentic, high-impact brand stories under extreme constraints',
                'Design modern visual presets, typography pairings, and spatial rhythms',
                'Optimize professional mobile workflows and custom studio setups',
                'Scale interactive organic audience networks that drive active retention',
                'Pace your sequencing with premium audio scoring & beat markers',
                'Publish pristine verifiable certification badges to show partners'
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
              <h2 className="text-xl sm:text-2xl font-display font-bold text-sun-text-main">Structured Path</h2>
              <div className="flex gap-3 text-[8px] sm:text-[10px] font-bold text-sun-text-muted uppercase tracking-widest">
                <span>{course.lessons || '9 lessons'}</span>
                <span>•</span>
                <span>{course.duration || '6 Hours'} total</span>
              </div>
            </div>

            <div className="border border-sun-border rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden divide-y divide-sun-border">
              {(sections.length > 0 ? sections : []).map((section, idx) => (
                <div key={idx} className="bg-sun-surface/20">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {expandedSection === idx ? <ChevronUp size={18} className="text-sun-primary" /> : <ChevronDown size={18} />}
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm tracking-tight text-sun-text-main">{section.title}</h3>
                        <p className="text-[8px] sm:text-[10px] text-sun-text-muted uppercase tracking-widest mt-1 font-bold">
                          {section.lessons.length} lessons • ~1 hour module
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
                                  {lesson.isPreview && <p className="text-[7px] sm:text-[8px] text-sun-primary uppercase tracking-widest mt-1 font-black">Free Spark Preview</p>}
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
            className="glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 space-y-6 sm:space-y-8 border-sun-primary/20 shadow-2xl"
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-sun-primary">FLAGSHIP COURSE PLATFORM</span>
                <span className="text-[10px] sm:text-xs text-sun-text-muted line-through">${(course.price * 3.5).toFixed(2)}</span>
              </div>
              <div className="flex items-end gap-2">
                <h3 className="text-3xl sm:text-5xl font-display font-bold leading-none text-sun-text-main">${course.price ? course.price.toFixed(2) : '39.00'}</h3>
                <span className="text-sun-primary text-xs sm:text-base font-black mb-1">70% OFF</span>
              </div>
              <p className="text-[8px] sm:text-[10px] text-sun-text-muted font-bold uppercase tracking-widest">
                Lifetime Premium Upgrades Included
              </p>
            </div>

            <div className="space-y-3 pt-2 sm:pt-4">
              {isEnrolled ? (
                <Button 
                  onClick={onStartLearning}
                  size="lg" className="w-full h-14 sm:h-16 text-base sm:text-lg rounded-2xl shadow-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  Start Learning (Unlocked)
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={onStartLearning}
                    size="lg" className="w-full h-14 sm:h-16 text-base sm:text-lg rounded-2xl shadow-xl shadow-sun-primary/20 ring-4 ring-sun-primary/10"
                  >
                    Quick Trial Start
                  </Button>
                  
                  {isInCart ? (
                    <div className="w-full p-4 rounded-2xl bg-white/5 border border-sun-primary/40 text-center font-bold text-xs flex items-center justify-center gap-2 text-sun-primary">
                      <Check size={16} /> Added in Cart
                    </div>
                  ) : (
                    <Button 
                      onClick={handleAddToCart}
                      variant="outline" 
                      className="w-full !rounded-2xl h-12 sm:h-14 text-sm font-bold flex items-center justify-center gap-2 hover:bg-sun-primary/10"
                    >
                      <ShoppingCart size={15} />
                      Add to Cart
                    </Button>
                  )}
                </>
              )}
              
              <button 
                onClick={handleShare}
                className="w-full text-[10px] text-center text-sun-text-muted hover:text-sun-primary font-bold uppercase tracking-widest mt-2 block transition-colors"
              >
                {copied ? "Link Copied!" : "Share Path with Friends"}
              </button>
            </div>

            <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4 border-t border-sun-border/30">
              <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white">Syllabus guarantees:</h4>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  { icon: Clock, text: `${course.duration || '12 hours'} Premium video content` },
                  { icon: Award, text: 'Verifiable Korusa Profile Badge' },
                  { icon: Smartphone, text: 'Cross-platform interactive player' },
                  { icon: Info, text: 'Direct Q&A thread with instructor' },
                  { icon: Share2, text: course.course_link ? 'Includes course/video link' : 'Includes downloadable data link' }
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
    </div>
  );
};
