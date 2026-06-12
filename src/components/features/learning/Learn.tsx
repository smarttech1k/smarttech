import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Star, 
  Users, 
  Clock, 
  PlayCircle, 
  Trophy, 
  CheckCircle2, 
  Award, 
  Play, 
  ArrowRight,
  Sparkles,
  BookMarked,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { CourseDetailView } from './CourseDetail';

const categories = [
  'All Skills', 'Photography & Video', 'Creative Writing', 'Design & UX', 'Creative Tech'
];

interface Mentor {
  name: string;
  role: string;
  avatar: string;
  students: string;
  rating: string;
  specialty: string;
}

const FEATURED_MENTORS: Mentor[] = [
  {
    name: "Sarah Chen",
    role: "Travel Vlogger & Editor",
    avatar: "https://i.pravatar.cc/150?u=sarah",
    students: "8.4k",
    rating: "4.9",
    specialty: "Short-form Editing Flow"
  },
  {
    name: "Alex Rivera",
    role: "Creative Director & UX Guru",
    avatar: "https://i.pravatar.cc/150?u=alex",
    students: "12.2k",
    rating: "4.9",
    specialty: "Sleek Aesthetics"
  },
  {
    name: "Leon Vance",
    role: "Author & Storyteller",
    avatar: "https://i.pravatar.cc/150?u=leon",
    students: "4.6k",
    rating: "5.0",
    specialty: "High Hook Storytelling"
  }
];

const mockMarketplaceCourses = [
  {
    id: "co-1",
    title: 'Short-Form Magic: Filming & Editing Sparks That Go Viral',
    category: 'Photography & Video',
    instructor: 'Sarah Chen',
    price: 0,
    rating: 4.9,
    students: '12k',
    duration: "14 Hours",
    lessons: "18 lessons",
    thumbnail: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=800&q=80'
  },
  {
    id: "co-2",
    title: 'Storytelling 101: Captivate Your Audience In Under 60 Seconds',
    category: 'Creative Writing',
    instructor: 'Leon Vance',
    price: 0,
    rating: 4.8,
    students: '25k',
    duration: "9 Hours",
    lessons: "12 lessons",
    thumbnail: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80'
  },
  {
    id: "co-3",
    title: 'Sleek Layout Design: Mastering Modern UI & Typography Pairings',
    category: 'Design & UX',
    instructor: 'Alex Rivera',
    price: 0,
    rating: 4.7,
    students: '8.2k',
    duration: "6 Hours",
    lessons: "9 lessons",
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80'
  },
  {
    id: "co-4",
    title: 'Creative Web Art: Build Interactive Playgrounds with Framer Motion',
    category: 'Creative Tech',
    instructor: 'Elena Ray',
    price: 0,
    rating: 4.6,
    students: '5k',
    duration: "11 Hours",
    lessons: "14 lessons",
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
  }
];

export const LearnView = ({ onStartLearning, onBack }: { onStartLearning: () => void, onBack?: () => void }) => {
  const [activeCategory, setActiveCategory] = useState('All Skills');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  if (selectedCourse) {
    return <CourseDetailView onBack={() => setSelectedCourse(null)} onStartLearning={onStartLearning} />;
  }

  const filteredCourses = mockMarketplaceCourses.filter(course => {
    const matchesCategory = activeCategory === 'All Skills' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-12">
      {onBack && <BackButton onClick={onBack} label="Dashboard" />}

      {/* 1. COMPASS / HEADER REGION */}
      <header className="space-y-6 sm:space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-sun-text-main">
              Skill & Mentorship Hub
            </h1>
            <p className="text-sun-text-muted text-sm font-normal">
              Structured paths designed to scale professional build capability.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-1 max-w-xl gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted" size={16} />
              <input 
                type="text"
                placeholder="Search skill paths, modules, or creators..."
                className="w-full bg-sun-surface border border-sun-border rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sun-primary/25 transition-all font-medium text-sun-text-main"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="px-5 h-12 flex items-center justify-center bg-sun-surface border border-sun-border hover:border-sun-primary/20 rounded-2xl text-sun-text-muted hover:text-sun-primary transition-all">
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategory === cat 
                ? 'bg-sun-primary text-white border-sun-primary shadow-md shadow-sun-primary/10 font-black' 
                : 'bg-sun-surface border-sun-border text-sun-text-muted hover:border-sun-primary/20 hover:text-sun-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* 2. CONTINUE LEARNING / ACTIVE PROGRESS SECTION */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <BookMarked size={18} className="text-sun-primary" />
          <h3 className="text-lg font-bold text-sun-text-main">Continue Learning</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Progress Card A */}
          <div className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 group">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-sun-primary/10 text-sun-primary border-sun-primary/10 rounded-full text-[9px] font-bold py-0.5 mb-2">Photography & Video</Badge>
                <h4 className="text-sm font-bold text-sun-text-main group-hover:text-sun-primary transition-all line-clamp-1 leading-snug">
                  Short-Form Magic: Filming & Editing Sparks That Go Viral
                </h4>
                <p className="text-[11px] text-sun-text-muted mt-0.5">Chapter 4: Perfect Pacing & Music Synchronization</p>
              </div>
              <button 
                onClick={onStartLearning}
                className="w-8 h-8 rounded-full bg-sun-primary text-white flex items-center justify-center shrink-0 hover:bg-sun-secondary transition-colors"
              >
                <Play size={12} fill="currentColor" className="translate-x-0.5" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-sun-text-main">
                <span>Progress</span>
                <span>65% completed</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sun-primary rounded-full transition-all duration-500" style={{ width: "65%" }}></div>
              </div>
            </div>
          </div>

          {/* Progress Card B */}
          <div className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 group">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/10 rounded-full text-[9px] font-bold py-0.5 mb-2">Design & UX</Badge>
                <h4 className="text-sm font-bold text-sun-text-main group-hover:text-sun-primary transition-all line-clamp-1 leading-snug">
                  Sleek Layout Design: Mastering Modern UI & Typography Pairings
                </h4>
                <p className="text-[11px] text-sun-text-muted mt-0.5">Chapter 2: Dynamic Layout Grids & Negative Space</p>
              </div>
              <button 
                onClick={onStartLearning}
                className="w-8 h-8 rounded-full bg-sun-primary text-white flex items-center justify-center shrink-0 hover:bg-sun-secondary transition-colors"
              >
                <Play size={12} fill="currentColor" className="translate-x-0.5" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-sun-text-main">
                <span>Progress</span>
                <span>30% completed</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sun-primary rounded-full transition-all duration-500" style={{ width: "30%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED INSTRUCTORS/MENTORS PANEL */}
      <section className="space-y-5">
        <h3 className="text-lg font-bold text-sun-text-main">Featured Mentors</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURED_MENTORS.map((m, idx) => (
            <div 
              key={idx}
              className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-5 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-xs hover:border-sun-primary/20 transition-all duration-300"
            >
              <Avatar src={m.avatar} size="lg" className="ring-4 ring-sun-primary/15" />
              <div>
                <h4 className="font-bold text-sm text-sun-text-main">{m.name}</h4>
                <p className="text-[10px] text-sun-text-muted leading-tight mt-0.5">{m.role}</p>
              </div>
              <span className="text-[10px] bg-sun-bg border border-sun-border/40 px-2.5 py-1 rounded text-sun-text-muted font-bold capitalize">
                {m.specialty}
              </span>
              <div className="flex justify-between items-center w-full pt-3 border-t border-gray-100 dark:border-sun-border/20 text-[10px] font-semibold text-sun-text-muted">
                <span>⭐ {m.rating} Profile</span>
                <span>{m.students} students</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. SKILL PATHS & COURSES STREAM */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-sun-text-main">{activeCategory}</h3>
          <p className="text-xs font-bold text-sun-text-muted uppercase tracking-wider">{filteredCourses.length} paths available</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
          {filteredCourses.map((course) => (
            <div 
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/45 rounded-2xl overflow-hidden hover:shadow-premium transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div className="aspect-video relative overflow-hidden shrink-0 border-b border-gray-100 dark:border-sun-border/20">
                <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Course Cover" referrerPolicy="no-referrer" />
                <span className="absolute top-4 left-4 bg-black/60 text-white backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">
                  {course.category}
                </span>
                <span className="absolute bottom-4 right-4 bg-sun-primary text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                  FREE / CO-BUILD
                </span>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-sun-text-main group-hover:text-sun-primary transition-colors leading-snug">
                    {course.title}
                  </h4>
                  <p className="text-xs text-sun-text-muted mt-1 font-semibold">Led by {course.instructor}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-105 dark:border-sun-border/20 text-xs font-bold text-sun-text-muted">
                  <span className="flex items-center gap-1.5"><Clock size={13} /> {course.duration}</span>
                  <span className="flex items-center gap-1.5"><BookOpen size={13} /> {course.lessons}</span>
                  <span className="text-sun-primary font-black uppercase tracking-wider flex items-center gap-1">
                    START
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Block (Professional Focus) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-sun-border/40">
        {[
          { icon: <Clock size={18} />, title: "Micro-learning Hubs", desc: "Short, focused interactive sequences designed for immediate development integration." },
          { icon: <Award size={18} />, title: "Real-world Co-building", desc: "Collaborate on production-ready repositories alongside mentors instead of passive multiple-choice tests." },
          { icon: <Trophy size={18} />, title: "Verifiable Creator Badges", desc: "Publish completed projects directly to your Korusa developer identity feed." }
        ].map((benefit, i) => (
          <div key={i} className="bg-white dark:bg-sun-surface/60 border border-gray-100 dark:border-sun-border/30 p-5 rounded-2xl space-y-3">
            <div className="p-2.5 bg-sun-primary/10 text-sun-primary rounded-xl w-fit">
              {benefit.icon}
            </div>
            <h4 className="font-bold text-sm text-sun-text-main">{benefit.title}</h4>
            <p className="text-xs text-sun-text-muted leading-relaxed font-normal">{benefit.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};
