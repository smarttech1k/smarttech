import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Settings, 
  Maximize2, 
  Volume2, 
  SkipForward, 
  SkipBack, 
  CheckCircle2, 
  MessageSquare, 
  FileText, 
  Share2, 
  MoreHorizontal,
  PlayCircle,
  Lock,
  Search,
  BookOpen,
  Clock
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { BackButton } from '../../ui/BackButton';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'video' | 'quiz' | 'reading';
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

const mockChapters: Chapter[] = [
  {
    title: 'Chapter 1: Creative Storytelling & Hooks',
    lessons: [
      { id: '1', title: 'The 3-Second Hook Method', duration: '12:45', completed: true, type: 'video' },
      { id: '2', title: 'Designing Your Creator Style & Flow', duration: '08:20', completed: true, type: 'video' },
      { id: '3', title: 'Lighting & Beautiful Mobile Frame Setup', duration: '15:10', completed: false, type: 'video' },
    ]
  },
  {
    title: 'Chapter 2: Mobile Filming, Pacing & Editing',
    lessons: [
      { id: '4', title: 'Dynamic Trimming & Jump-Cuts', duration: '22:15', completed: false, type: 'video' },
      { id: '5', title: 'Music Sync & Layering Ambient Sounds', duration: '18:40', completed: false, type: 'reading' },
      { id: '6', title: 'Practice Assessment: Creating Your First Spark', duration: '10:00', completed: false, type: 'quiz' },
    ]
  }
];

export const LearningExperience = ({ onBack }: { onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'notes' | 'discussion'>('lessons');
  const [currentLessonId, setCurrentLessonId] = useState('3');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="fixed inset-0 z-[200] bg-sun-bg flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 px-4 border-b border-sun-border flex items-center justify-between bg-sun-surface/20 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} label="" className="!p-0" />
          <div className="h-8 w-px bg-sun-border hidden sm:block"></div>
          <div>
            <h1 className="text-sm font-bold truncate max-w-[150px] sm:max-w-md">3. Lighting & Beautiful Mobile Frame Setup</h1>
            <p className="text-[10px] text-sun-text-muted font-bold uppercase tracking-widest hidden sm:block">Short-Form Magic: Filming & Editing Sparks</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden md:flex flex-col items-end gap-1">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest uppercase opacity-70">Course Progress</span>
                <span className="text-[10px] font-black text-sun-primary">32%</span>
             </div>
             <div className="w-32 h-1 bg-sun-text-main/10 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-sun-primary shadow-[0_0_8px_rgba(255,184,0,0.5)]"></div>
             </div>
          </div>
          <Button variant="outline" size="sm" className="!rounded-xl px-4 hidden sm:flex" title="Share Course">Share</Button>
          <div title="Your Profile">
            <Avatar size="sm" src="https://i.pravatar.cc/150?u=me" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Player Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-black/20">
          <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
            {/* Video Player */}
            <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl border border-white/5 group">
              <img 
                src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80" 
                className="w-full h-full object-cover opacity-60" 
                alt="Video current frame" 
              />
              
              {/* Fake Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 sm:p-10">
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="relative h-1 w-full bg-white/20 rounded-full cursor-pointer overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-2/3 bg-sun-primary"></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <button title="Seek Back" className="text-white hover:text-sun-primary transition-colors"><SkipBack size={24} /></button>
                      <button title="Play/Pause" className="text-white hover:scale-110 transition-transform"><PlayCircle size={48} className="fill-current" /></button>
                      <button title="Seek Forward" className="text-white hover:text-sun-primary transition-colors"><SkipForward size={24} /></button>
                      <div className="flex items-center gap-3 ml-4" title="Volume">
                        <Volume2 size={20} className="text-white" />
                        <span className="text-xs font-mono text-white/80">08:42 / 15:10</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button title="Playback Speed" className="text-white hover:text-sun-primary transition-colors">1x</button>
                      <button title="Settings" className="text-white hover:text-sun-primary transition-colors"><Settings size={20} /></button>
                      <button title="Fullscreen" className="text-white hover:text-sun-primary transition-colors"><Maximize2 size={20} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Details (Distraction-free) */}
            <div className="space-y-12 pb-20">
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                   <h2 className="text-3xl font-display font-bold">Core Values & Ethics</h2>
                   <div className="flex flex-wrap gap-6 items-center">
                      <div className="flex items-center gap-2 text-xs font-bold text-sun-text-muted">
                        <Clock size={16} />
                        15:10 minutes
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-sun-text-muted">
                        <MessageSquare size={16} />
                        128 Comments
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-sun-text-muted">
                        <FileText size={16} />
                        2 Resources
                      </div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <Button 
                    variant="secondary" 
                    className="!rounded-2xl h-12 w-12 p-0 bg-sun-text-main/5 hover:bg-sun-primary hover:text-black transition-all"
                    title="Share Experience"
                  >
                    <Share2 size={20}/>
                  </Button>
                   <Button 
                    variant="secondary" 
                    className="!rounded-2xl h-12 w-12 p-0 bg-sun-text-main/5 hover:bg-sun-text-main/10 transition-all"
                    title="More Options"
                  >
                    <MoreHorizontal size={20}/>
                  </Button>
                </div>
              </div>

              {/* Interaction Tabs */}
              <div className="space-y-6">
                <div className="flex gap-8 border-b border-sun-border">
                  {['discussion', 'notes', 'resources'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-sun-primary' : 'text-sun-text-muted hover:text-white'}`}
                    >
                      {tab}
                      {activeTab === tab && <motion.div layoutId="learning-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-sun-primary rounded-t-full" />}
                    </button>
                  ))}
                </div>

                <div className="min-h-[300px]">
                  {activeTab === 'discussion' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="flex gap-4">
                        <Avatar size="sm" src="https://i.pravatar.cc/150?u=me" />
                        <div className="flex-1 space-y-4">
                          <textarea 
                            placeholder="Add a question or reflection..."
                            className="w-full bg-sun-surface border border-sun-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-sun-primary/30 transition-all min-h-[100px] resize-none font-medium"
                          />
                          <div className="flex justify-end">
                            <Button size="sm" className="px-6">Post Thought</Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-8 pt-8">
                         {[1,2].map(i => (
                           <div key={i} className="flex gap-4 group">
                             <Avatar size="sm" src={`https://i.pravatar.cc/150?u=${i+20}`} />
                             <div className="space-y-2">
                               <div className="flex items-center gap-3">
                                 <span className="text-xs font-bold">User_{i+102}</span>
                                 <span className="text-[10px] text-sun-text-muted font-bold uppercase tracking-wider">2 hours ago</span>
                               </div>
                               <p className="text-sm text-sun-text-muted leading-relaxed font-medium">How do we ensure the ethics of nested systems when scaling to asynchronous users?</p>
                               <div className="flex items-center gap-4 pt-2">
                                 <button className="text-[10px] font-black uppercase tracking-widest text-sun-text-muted hover:text-sun-primary">Reply</button>
                                 <button className="text-[10px] font-black uppercase tracking-widest text-sun-text-muted hover:text-red-500">Like</button>
                               </div>
                             </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'notes' && (
                    <div className="animate-in fade-in duration-500 space-y-4">
                      <div className="p-8 border-2 border-dashed border-sun-border rounded-[2.5rem] text-center space-y-4">
                         <div className="w-16 h-16 bg-sun-surface rounded-2xl flex items-center justify-center mx-auto text-sun-text-muted">
                           <FileText size={32} />
                         </div>
                         <h3 className="font-bold">No notes yet</h3>
                         <p className="text-xs text-sun-text-muted max-w-xs mx-auto uppercase tracking-wide">Capture key insights here. Your notes are private and synced across all devices.</p>
                         <Button variant="outline" size="sm">Create New Note</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-sun-surface/20 border-l border-sun-border transition-all duration-300 hidden lg:flex flex-col relative`}>
          <div className="p-6 border-b border-sun-border flex items-center justify-between shrink-0">
             <h3 className="font-display font-bold">Curriculum</h3>
             <button className="text-sun-text-muted hover:text-white transition-colors"><Search size={18}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide py-4 px-2">
            {mockChapters.map((chapter, cIdx) => (
              <div key={cIdx} className="mb-8">
                <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted mb-4">{chapter.title}</h4>
                <div className="space-y-1">
                  {chapter.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLessonId(lesson.id)}
                      className={`w-full group text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${currentLessonId === lesson.id ? 'bg-sun-primary/10 border border-sun-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <div className="shrink-0">
                        {lesson.completed ? (
                          <CheckCircle2 size={18} className="text-sun-primary" />
                        ) : lesson.id === currentLessonId ? (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-sun-primary border-t-transparent animate-spin" />
                        ) : (
                          <PlayCircle size={18} className="text-sun-text-muted group-hover:text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${currentLessonId === lesson.id ? 'text-sun-primary' : 'text-sun-text-main group-hover:text-white'}`}>{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[9px] text-sun-text-muted uppercase tracking-widest font-black">{lesson.type}</span>
                           <span className="text-[9px] text-sun-text-muted font-mono opacity-50">• {lesson.duration}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-sun-border shrink-0">
             <Button className="w-full h-12 !rounded-xl gap-2">
                <SkipForward size={18} />
                Next Lesson
             </Button>
          </div>
        </aside>

        {/* Mobile Sidebar Toggle (Floating) */}
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-24 right-6 z-[210] w-14 h-14 bg-sun-primary text-black rounded-full shadow-2xl flex items-center justify-center border-4 border-sun-bg active:scale-95 transition-all"
        >
          <BookOpen size={24} />
        </button>
      </div>
    </div>
  );
};
