import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, BookOpen, Star, Users, Clock, PlayCircle, Trophy, CheckCircle2 } from 'lucide-react';
import { CourseCard } from '../../ui/Cards';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { CourseDetailView } from './CourseDetail';

const categories = [
  'All Courses', 'Design', 'Development', 'Marketing', 'AI & Data', 'Business', 'Photography', 'Music'
];

const mockMarketplaceCourses = [
  {
    title: 'Advanced UI Design Systems',
    category: 'Design',
    instructor: 'Alex Rivera',
    price: 49.99,
    rating: 4.9,
    students: '12k',
    thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?w=800&q=80'
  },
  {
    title: 'Fullstack React & Node.js Mastery',
    category: 'Development',
    instructor: 'Sarah Chen',
    price: 89.99,
    rating: 4.8,
    students: '25k',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80'
  },
  {
    title: 'AI Engineering with Python',
    category: 'AI & Data',
    instructor: 'Marcus T.',
    price: 0,
    rating: 4.7,
    students: '8.2k',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80'
  },
  {
    title: 'Brand Strategy for Founders',
    category: 'Business',
    instructor: 'Elena Ray',
    price: 24.99,
    rating: 4.6,
    students: '5k',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
  }
];

export const LearnView = ({ onStartLearning, onBack }: { onStartLearning: () => void, onBack?: () => void }) => {
  const [activeCategory, setActiveCategory] = useState('All Courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  if (selectedCourse) {
    return <CourseDetailView onBack={() => setSelectedCourse(null)} onStartLearning={onStartLearning} />;
  }

  const filteredCourses = mockMarketplaceCourses.filter(course => {
    const matchesCategory = activeCategory === 'All Courses' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-12">
      {onBack && <BackButton onClick={onBack} label="Dashboard" />}
      {/* ... (rest of search/header) */}
      <header className="space-y-6 sm:space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Wisdom Library</h1>
            <p className="text-sun-text-muted text-xs sm:text-sm font-medium">Over 5,000 expert-led courses to scale your potential.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-1 max-w-xl gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted" size={18} />
              <input 
                type="text"
                placeholder="What do you want to learn today?"
                className="w-full bg-sun-surface border border-sun-border rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sun-primary/30 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="secondary" className="!rounded-2xl px-5 h-12 flex items-center justify-center">
              <Filter size={18} />
              <span className="sm:hidden ml-2 font-bold uppercase tracking-widest text-[10px]">Filter</span>
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all border ${
                activeCategory === cat 
                ? 'bg-sun-primary text-black border-sun-primary shadow-lg shadow-sun-primary/10 font-black' 
                : 'bg-sun-surface border-sun-border text-sun-text-muted hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Featured Spotlight */}
      <section 
        className="relative glass-card rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 overflow-hidden group cursor-pointer border-sun-primary/10 hover:border-sun-primary/30 transition-all"
        onClick={() => setSelectedCourse(mockMarketplaceCourses[0])}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 sm:gap-10">
          <div className="w-40 h-40 sm:w-64 sm:h-64 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden rotate-3 group-hover:rotate-0 transition-transform duration-700 shadow-2xl shrink-0">
            <img src="https://i.pravatar.cc/500?u=12" className="w-full h-full object-cover" alt="Instructor" />
          </div>
          <div className="flex-1 space-y-4 sm:space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="bg-sun-primary/20 text-sun-primary px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Instructor Spotlight</div>
              <CheckCircle2 size={14} className="text-sun-primary" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-display font-bold leading-tight">Mastering UI Design with <span className="text-sun-primary">Alex Rivera</span></h2>
            <p className="text-sun-text-muted text-sm sm:text-lg max-w-xl leading-relaxed mx-auto md:mx-0">Join Alex as he breaks down the design systems behind the worlds most successful platforms. Limited time free access.</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-sun-primary" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">12,402 Students</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-sun-primary fill-sun-primary" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">4.9 Rating</span>
              </div>
            </div>
            <Button size="lg" className="px-8 sm:px-10 w-full sm:w-auto">Enroll Now - Free</Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5 sm:opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
           <BookOpen size={200} />
        </div>
      </section>

      {/* Course Grid */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-display font-bold">{activeCategory}</h3>
          <p className="text-[10px] font-bold text-sun-text-muted uppercase tracking-widest">{filteredCourses.length} results</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredCourses.map((course, idx) => (
            <CourseCard key={idx} {...course} onClick={() => setSelectedCourse(course)} />
          ))}
        </div>
      </section>

      {/* Benefits / Social Proof */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-10">
        {[
          { icon: PlayCircle, title: '24/7 Access', desc: 'Learn on your own schedule with lifetime access.' },
          { icon: Clock, title: 'Micro-learning', desc: 'Short, focused modules designed for high retention.' },
          { icon: Trophy, title: 'Certificates', desc: 'Earn verifiable credentials recognized by top firms.' },
        ].map((benefit, i) => (
          <div key={i} className="glass-card p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-sun-border/30 hover:border-sun-primary/20 transition-colors">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center text-sun-primary mb-4">
              <benefit.icon size={20} />
            </div>
            <h4 className="font-bold text-sm mb-2">{benefit.title}</h4>
            <p className="text-[9px] sm:text-[10px] text-sun-text-muted leading-relaxed uppercase tracking-wider font-medium">{benefit.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="py-20 text-center space-y-6">
        <h2 className="text-3xl font-display font-bold">Ready to contribute?</h2>
        <p className="text-sun-text-muted max-w-lg mx-auto">Create your own course and share your expertise with a global audience of learners.</p>
        <Button variant="outline" size="lg" className="px-12">Become an Instructor</Button>
      </section>
    </div>
  );
};
