import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Ticket,
  CreditCard,
  Check,
  Briefcase,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { apiRequest } from '../../../lib/api';
import { useUIStore } from '../../../store/uiStore';

const categories = [
  'All Skills', 'Photography & Video', 'Creative Writing', 'Design & UX', 'Creative Tech'
];

const FEATURED_MENTORS = [
  {
    name: 'Sarah Chen',
    role: 'Travel Vlogger & Editor',
    avatar: 'https://i.pravatar.cc/150?u=sarah-chen',
    students: '2.4k',
    rating: '4.9',
    specialty: 'Photography & Video',
  },
  {
    name: 'Leon Vance',
    role: 'Creative Director',
    avatar: 'https://i.pravatar.cc/150?u=leon-vance',
    students: '1.8k',
    rating: '4.8',
    specialty: 'Creative Writing',
  },
  {
    name: 'Mina Patel',
    role: 'Product Designer',
    avatar: 'https://i.pravatar.cc/150?u=mina-patel',
    students: '1.2k',
    rating: '4.9',
    specialty: 'Design & UX',
  },
];

interface Mentor {
  name: string;
  role: string;
  avatar: string;
  students: string;
  rating: string;
  specialty: string;
}

const MAX_COVER_WIDTH = 1400;
const COVER_IMAGE_QUALITY = 0.78;

async function resizeImageToDataUrl(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load image.'));
    img.src = objectUrl;
  });

  const scale = Math.min(1, MAX_COVER_WIDTH / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Unable to process image.');
  }

  context.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(objectUrl);
  return canvas.toDataURL('image/jpeg', COVER_IMAGE_QUALITY);
}

export const LearnView = ({ onStartLearning, onBack }: { onStartLearning: () => void, onBack?: () => void }) => {
  const [activeCategory, setActiveCategory] = useState('All Skills');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [viewCart, setViewCart] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureCategory, setLectureCategory] = useState('Photography & Video');
  const [lectureDescription, setLectureDescription] = useState('');
  const [lectureCoverPhotoFile, setLectureCoverPhotoFile] = useState('');
  const [lectureCoverPhotoName, setLectureCoverPhotoName] = useState('');
  const [lectureDataLink, setLectureDataLink] = useState('');
  const [lecturePrice, setLecturePrice] = useState('0');
  const [lectureSubmitting, setLectureSubmitting] = useState(false);
  const [lectureStatus, setLectureStatus] = useState('');
  const { cart, addToCart, removeFromCart, clearCart, enrolledCourses, enrollInCourses } = useUIStore();

  // Cart Promo Code States
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  
  // Checkout Processing States
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'processing' | 'done'>('idle');
  const [checkoutProgressText, setCheckoutProgressText] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadCourses = async () => {
      if (!useUIStore.getState().authToken) return;
      try {
        const response = await apiRequest<{ lessons: any[] }>('/lessons?limit=50', {}, useUIStore.getState().authToken);
        if (mounted) setCourses((response.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          category: lesson.category,
          title: lesson.title,
          instructor: lesson.instructor,
          role: lesson.role,
          rating: lesson.rating,
          students: lesson.students,
          price: lesson.price,
          duration: lesson.duration,
          lessons: lesson.lessons,
          thumbnail: lesson.cover_photo || lesson.thumbnail,
          cover_photo: lesson.cover_photo,
          description: lesson.description,
          difficulty: lesson.difficulty,
          isFeatured: lesson.isFeatured,
          data_link: lesson.data_link,
        })));
      } catch {
        if (mounted) setCourses([]);
      }
    };
    loadCourses();
    return () => { mounted = false; };
  }, []);

  if (selectedCourse) {
    return (
      <div className="space-y-8">
        <BackButton onClick={() => setSelectedCourse(null)} label="Back to Academy" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="aspect-video rounded-[2rem] overflow-hidden border border-sun-border bg-sun-surface">
              <img
                src={selectedCourse.cover_photo || selectedCourse.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80'}
                alt={selectedCourse.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-3">
              <Badge variant="primary" className="!rounded-lg px-3 py-1 text-[10px]">{selectedCourse.category}</Badge>
              <h2 className="text-3xl sm:text-5xl font-display font-bold text-sun-text-main leading-tight">{selectedCourse.title}</h2>
              <p className="text-sun-text-muted text-sm sm:text-base leading-relaxed max-w-3xl">
                {selectedCourse.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-bold text-sun-text-muted uppercase tracking-widest">
              <span>{selectedCourse.duration || '10 mins'}</span>
              <span>•</span>
              <span>{selectedCourse.lessons || '1 lesson'}</span>
              <span>•</span>
              <span>{selectedCourse.difficulty || 'Beginner'}</span>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-card p-6 rounded-[2rem] border-sun-border/40 space-y-5">
              <div className="flex items-center gap-3">
                <Avatar src={selectedCourse.thumbnail || `https://i.pravatar.cc/150?u=${selectedCourse.instructor || selectedCourse.title}`} size="sm" />
                <div>
                  <p className="font-bold text-sun-text-main">{selectedCourse.instructor}</p>
                  <p className="text-xs text-sun-text-muted">{selectedCourse.role}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Rating</span><span className="font-bold">{selectedCourse.rating || '4.9'}</span></div>
                <div className="flex justify-between"><span>Learners</span><span className="font-bold">{selectedCourse.students || '0'}</span></div>
                <div className="flex justify-between"><span>Price</span><span className="font-bold">${Number(selectedCourse.price || 0).toFixed(2)}</span></div>
              </div>
              <Button onClick={onStartLearning} className="w-full rounded-2xl">Start Learning</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredCourses = courses.filter(course => {
    const matchesCategory = activeCategory === 'All Skills' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const cartDiscountAmount = cartSubtotal * (discountPercent / 100);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscountAmount);

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'KORUSA50') {
      setDiscountPercent(50);
      setPromoMessage('Promo Applied! 50% discount has been successfully credited.');
    } else if (code === 'FRIEND20') {
      setDiscountPercent(20);
      setPromoMessage('Promo Applied! 20% discount has been successfully credited.');
    } else if (code === '') {
      setPromoMessage('');
    } else {
      setPromoMessage('Invalid promotional voucher code.');
    }
  };

  const handleSecureCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutStep('processing');
    setCheckoutProgressText('Establishing secure transaction tunnel with Korusa Pay...');
    
    setTimeout(() => {
      setCheckoutProgressText('Registering professional credentials with our mentor guild...');
      setTimeout(() => {
        setCheckoutProgressText('Generating verifiable NFT learning certificates on-chain...');
        setTimeout(() => {
          // Unlock materials
          enrollInCourses(cart.map(item => item.id));
          clearCart();
          setCheckoutStep('done');
        }, 1200);
      }, 1000);
    }, 1000);
  };

  const handlePostLecture = async () => {
    if (!lectureTitle.trim() || !lectureDescription.trim()) {
      setLectureStatus('Please add a title and description.');
      return;
    }

    if (!lectureDataLink.trim()) {
      setLectureStatus('Please add the private Google Drive data link.');
      return;
    }

    const parsedPrice = Number.parseFloat(lecturePrice);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setLectureStatus('Please add a valid course price.');
      return;
    }

    setLectureSubmitting(true);
    setLectureStatus('');
    try {
      const response = await apiRequest<any>('/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: lectureTitle,
          category: lectureCategory,
          description: lectureDescription,
          instructor: useUIStore.getState().currentUser?.full_name || useUIStore.getState().currentUser?.username || 'Community Creator',
          role: 'Community Lecturer',
          cover_photo_file: lectureCoverPhotoFile || null,
          data_link: lectureDataLink.trim() || null,
          price: parsedPrice,
          duration: '10 mins',
          lessons: '1 lesson',
          difficulty: 'Beginner',
          isFeatured: false,
        }),
      }, useUIStore.getState().authToken);

      setCourses((prev) => [response, ...prev]);
      setLectureTitle('');
      setLectureDescription('');
      setLectureCoverPhotoFile('');
      setLectureCoverPhotoName('');
      setLectureDataLink('');
      setLecturePrice('0');
      setLectureStatus('Lecture posted successfully.');
    } catch (error) {
      setLectureStatus(error instanceof Error ? error.message : 'Unable to post lecture.');
    } finally {
      setLectureSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {onBack && <BackButton onClick={onBack} label="Dashboard" />}

      {/* Flagship academy tab buttons & Cart Status bar */}
      <div className="flex items-center justify-between gap-4 border-b border-sun-border/30 pb-4">
        <div className="flex gap-4">
          <button 
            onClick={() => { setViewCart(false); }}
            className={`text-sm font-black uppercase tracking-widest pb-1 transition-all relative ${!viewCart ? 'text-sun-primary' : 'text-sun-text-muted hover:text-white'}`}
          >
            Academy Catalogue
            {!viewCart && <motion.div layoutId="academy-tab-indicator" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-sun-primary" />}
          </button>
          
          <button 
            onClick={() => { setViewCart(true); }}
            className={`text-sm font-black uppercase tracking-widest pb-1 transition-all relative flex items-center gap-2 ${viewCart ? 'text-sun-primary' : 'text-sun-text-muted hover:text-white'}`}
          >
            Shopping Cart
            {cart.length > 0 && (
              <span className="bg-sun-primary text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-bounce shrink-0">
                {cart.length}
              </span>
            )}
            {viewCart && <motion.div layoutId="academy-tab-indicator" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-sun-primary" />}
          </button>
        </div>

        {!viewCart && cart.length > 0 && (
          <button 
            onClick={() => setViewCart(true)}
            className="flex items-center gap-2 bg-sun-primary/10 border border-sun-primary/20 hover:bg-sun-primary/20 px-4 py-2 rounded-xl text-xs font-black text-sun-primary transition-all animate-pulse"
          >
            <ShoppingCart size={14} />
            View Cart ({cart.length})
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!viewCart ? (
          <motion.div 
            key="academy-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-12"
          >
            {/* LECTURE POSTING */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-sun-text-main">Post a Lecture</h3>
                  <p className="text-xs text-sun-text-muted mt-1 font-medium">Share a lesson with the community and surface it in the learning feed.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <input
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="Lecture title"
                  className="bg-sun-surface border border-sun-border rounded-2xl px-4 py-3 text-sm font-medium text-sun-text-main focus:outline-none focus:ring-2 focus:ring-sun-primary/20"
                />
                <select
                  value={lectureCategory}
                  onChange={(e) => setLectureCategory(e.target.value)}
                  className="bg-sun-surface border border-sun-border rounded-2xl px-4 py-3 text-sm font-medium text-sun-text-main focus:outline-none focus:ring-2 focus:ring-sun-primary/20"
                >
                  {categories.filter((cat) => cat !== 'All Skills').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Button onClick={handlePostLecture} disabled={lectureSubmitting} className="rounded-2xl">
                  {lectureSubmitting ? 'Posting...' : 'Post Lecture'}
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <input
                  value={lectureDataLink}
                  onChange={(e) => setLectureDataLink(e.target.value)}
                  placeholder="Private Google Drive data link"
                  className="bg-sun-surface border border-sun-border rounded-2xl px-4 py-3 text-sm font-medium text-sun-text-main focus:outline-none focus:ring-2 focus:ring-sun-primary/20"
                />
                <input
                  value={lecturePrice}
                  onChange={(e) => setLecturePrice(e.target.value)}
                  placeholder="Course price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="bg-sun-surface border border-sun-border rounded-2xl px-4 py-3 text-sm font-medium text-sun-text-main focus:outline-none focus:ring-2 focus:ring-sun-primary/20"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 bg-sun-surface border border-sun-border rounded-2xl px-4 py-3 text-sm font-medium text-sun-text-main cursor-pointer">
                  <span className="text-xs font-bold text-sun-text-muted uppercase tracking-widest">Upload Cover Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const optimized = await resizeImageToDataUrl(file);
                        setLectureCoverPhotoFile(optimized);
                        setLectureCoverPhotoName(file.name);
                        setLectureStatus('');
                      } catch {
                        setLectureStatus('Could not process the cover photo. Please try a smaller image.');
                      }
                    }}
                  />
                  <span className="text-xs text-sun-text-muted break-all">
                    {lectureCoverPhotoName || 'Choose an image to upload to the backend'}
                  </span>
                </label>
                  {lectureCoverPhotoFile && (
                  <div className="rounded-2xl overflow-hidden border border-sun-border bg-black/20">
                    <img src={lectureCoverPhotoFile} alt="Cover preview" className="w-full h-40 object-cover" />
                  </div>
                )}
              </div>
              <textarea
                value={lectureDescription}
                onChange={(e) => setLectureDescription(e.target.value)}
                placeholder="Describe what learners will get from this lecture..."
                className="w-full min-h-[120px] bg-sun-surface border border-sun-border rounded-[1.5rem] px-4 py-3 text-sm font-medium text-sun-text-main focus:outline-none focus:ring-2 focus:ring-sun-primary/20 resize-none"
              />
              {lectureStatus && (
                <p className="text-xs font-semibold text-sun-text-muted">{lectureStatus}</p>
              )}
            </section>

            {/* 1. HERO REGION */}
            <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sun-primary/10 via-sun-surface-light/40 to-transparent border border-sun-border p-8 md:p-12 space-y-6">
              <div className="absolute top-0 right-0 w-96 h-96 bg-sun-primary/5 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-2 text-sun-primary">
                  <GraduationCap size={18} />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">KORUSA ELITE ACADEMY</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-display font-black leading-tight tracking-tight text-sun-text-main">
                  Master the Art of Premium Creative Builds
                </h1>
                <p className="text-sun-text-muted text-sm sm:text-base leading-relaxed font-medium">
                  High-end, structured learning programs designed to equip you with verifiable portfolio badges. Access interactive source codes and build with the best.
                </p>
              </div>

              {/* Quick stats board */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-sun-surface-light border border-sun-border rounded-2xl relative z-10">
                {[
                  { value: "4", label: "Flagship Paths" },
                  { value: "92%", label: "Graduation Rate" },
                  { value: "3", label: "Elite Mentors" },
                  { value: "50k+", label: "Global Alumni" }
                ].map((stat, i) => (
                  <div key={i} className="text-center sm:text-left space-y-0.5 border-r border-sun-border/40 last:border-0">
                    <p className="text-xl sm:text-2xl font-black text-sun-text-main">{stat.value}</p>
                    <p className="text-[10px] text-sun-text-muted font-black uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </header>

            {/* SEARCH AND FILTERING BAR */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted" size={16} />
                <input 
                  type="text"
                  placeholder="Search course tracks, modules, or premier creators..."
                  className="w-full bg-sun-surface border border-sun-border rounded-2xl py-3 pl-12 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sun-primary/25 transition-all font-medium text-sun-text-main"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Categories */}
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      activeCategory === cat 
                      ? 'bg-sun-primary text-black border-sun-primary shadow-md shadow-sun-primary/10 font-bold' 
                      : 'bg-sun-surface border-sun-border text-sun-text-muted hover:border-sun-primary/25 hover:text-sun-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. ACTIVE PROGRESS SECTION */}
            {enrolledCourses.length > 0 && (
              <section className="space-y-5 animate-in fade-in duration-500">
                <div className="flex items-center gap-2">
                  <BookMarked size={18} className="text-sun-primary" />
                  <h3 className="text-lg font-bold text-sun-text-main">Your Unlocked Paths ({enrolledCourses.length})</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.filter(c => enrolledCourses.includes(c.id)).map((course) => (
                    <div key={course.id} className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 group">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-4">
                          <span className="bg-sun-primary/10 text-sun-primary px-2.5 py-0.5 rounded-full text-[9px] font-bold mb-2 inline-block uppercase">
                            {course.category}
                          </span>
                          <h4 className="text-sm font-bold text-sun-text-main group-hover:text-sun-primary transition-all line-clamp-1 leading-snug">
                            {course.title}
                          </h4>
                          <p className="text-[11px] text-sun-text-muted mt-0.5">Under {course.instructor}</p>
                        </div>
                        <button 
                          onClick={onStartLearning}
                          className="w-8 h-8 rounded-full bg-sun-primary text-black flex items-center justify-center shrink-0 hover:bg-white transition-colors"
                        >
                          <Play size={12} fill="currentColor" className="translate-x-0.5" />
                        </button>
                      </div>
                      
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[10px] font-bold text-sun-text-main">
                          <span>Status</span>
                          <span className="text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Active Enrollment
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-full transition-all duration-500"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. FEATURED INSTRUCTORS */}
            <section className="space-y-5">
              <h3 className="text-lg font-bold text-sun-text-main">Elite Academy Guild</h3>
              
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
                      <span>⭐ {m.rating} Rating</span>
                      <span>{m.students} students</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. COURSES CATALOGUE */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-sun-text-main">{activeCategory} Tracks</h3>
                <p className="text-xs font-bold text-sun-text-muted uppercase tracking-wider">{filteredCourses.length} available lessons</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredCourses.map((course) => {
                  const isCurrentInCart = cart.some(i => i.id === course.id);
                  const isCurrentEnrolled = enrolledCourses.includes(course.id);
                  
                  return (
                    <div 
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/45 rounded-[2rem] overflow-hidden hover:shadow-premium transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="aspect-video relative overflow-hidden shrink-0 border-b border-gray-100 dark:border-sun-border/20">
                        <img src={course.cover_photo || course.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Course Cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        <span className="absolute top-4 left-4 bg-black/60 text-white backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/5">
                          {course.category}
                        </span>
                        
                        {/* Dynamic enrollment state badge */}
                        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                          <span className="text-white text-base font-bold tracking-tight drop-shadow-md">
                            ${course.price.toFixed(2)}
                          </span>
                        </div>

                        {isCurrentEnrolled ? (
                          <span className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg shadow-emerald-500/20">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="absolute top-4 right-4 bg-sun-primary text-black text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                            MEMBERSHIP TIER
                          </span>
                        )}
                      </div>

                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between bg-sun-surface/10">
                        <div>
                        <div className="flex items-center gap-1.5 text-[10px] text-sun-primary font-black uppercase tracking-wider mb-1.5">
                            <Star size={11} className="fill-current" />
                            {course.rating} • Led by {course.instructor}
                          </div>
                          <h4 className="font-bold text-base sm:text-lg text-sun-text-main group-hover:text-sun-primary transition-colors leading-snug line-clamp-2">
                            {course.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-105 dark:border-sun-border/20 text-xs font-bold text-sun-text-muted gap-2">
                          <span className="flex items-center gap-1"><Clock size={13} /> {course.duration}</span>
                          <span className="flex items-center gap-1"><BookOpen size={13} /> {course.lessons}</span>
                          
                          {isCurrentEnrolled ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartLearning();
                              }}
                              className="text-emerald-500 font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 text-xs py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/10"
                            >
                              PLAY
                              <ArrowRight size={12} />
                            </button>
                          ) : isCurrentInCart ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewCart(true);
                              }}
                              className="text-sun-primary font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0 text-[10px] py-1.5 px-3 rounded-lg bg-sun-primary/10 border border-sun-primary/20"
                            >
                              IN CART
                              <ArrowRight size={10} />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(course);
                              }}
                              className="bg-sun-primary hover:bg-white text-black font-extrabold uppercase tracking-wider text-[10px] py-1.5 px-3.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 shadow-md shadow-sun-primary/10"
                            >
                              + CART
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="cart-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {checkoutStep === 'idle' ? (
              <div className="space-y-8">
                {/* Header back section */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-sun-text-main">Your Academic Order</h2>
                    <p className="text-xs text-sun-text-muted mt-1 font-medium">Verify your selected flagship learning courses prior to enrollment.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewCart(false)}>Browse Catalogue</Button>
                </div>

                {cart.length === 0 ? (
                  /* EMPTY STATE */
                  <div className="p-12 text-center rounded-[2rem] border-2 border-dashed border-sun-border bg-sun-surface-light max-w-xl mx-auto space-y-6">
                    <div className="w-20 h-20 bg-sun-primary/10 rounded-full flex items-center justify-center mx-auto text-sun-primary">
                      <ShoppingCart size={36} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-sun-text-main">Your cart is currently empty</h3>
                      <p className="text-xs text-sun-text-muted leading-relaxed max-w-sm mx-auto">
                        Incorporate premier professional learning certificates and start elevating your content visual style today.
                      </p>
                    </div>
                    <Button onClick={() => setViewCart(false)} className="px-8 font-black !rounded-xl">Explore Course Tracks</Button>
                  </div>
                ) : (
                  /* CART CONTENT LIST & SUMMARY GRID */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Item list */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                      {cart.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-4 bg-sun-surface border border-sun-border/70 p-4 rounded-2xl relative group overflow-hidden"
                        >
                          <img 
                            src={item.thumbnail} 
                            alt={item.title} 
                            className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl object-cover shrink-0 border border-sun-border/40"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0 pr-4">
                            <span className="text-[8px] tracking-[0.15em] font-black uppercase text-sun-primary block mb-0.5">
                              {item.category}
                            </span>
                            <h3 className="font-bold text-sm sm:text-base text-sun-text-main leading-snug line-clamp-2">{item.title}</h3>
                            <p className="text-xs text-sun-text-muted mt-0.5">Led by {item.instructor}</p>
                            <p className="text-xs font-black text-sun-text-main mt-1 block sm:hidden">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>

                          <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 pr-4">
                            <p className="font-black text-sm text-sun-text-main">${item.price.toFixed(2)}</p>
                            <p className="text-[10px] text-sun-text-muted font-bold">Lifetime access</p>
                          </div>

                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 sm:p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                            title="Remove Course"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Order summary right pane */}
                    <div className="lg:col-span-5 xl:col-span-4">
                      <div className="glass-card p-5 sm:p-6 lg:p-6 xl:p-8 rounded-[2rem] border-sun-primary/25 shadow-xl space-y-6">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-white border-b border-sun-border/40 pb-3">
                          Order Summary
                        </h3>

                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between font-medium text-sun-text-muted text-xs">
                            <span>Subtotal</span>
                            <span>${cartSubtotal.toFixed(2)}</span>
                          </div>
                          
                          {discountPercent > 0 && (
                            <div className="flex justify-between font-bold text-xs text-emerald-500">
                              <span>Discount ({discountPercent}%)</span>
                              <span>-${cartDiscountAmount.toFixed(2)}</span>
                            </div>
                          )}

                          <div className="flex justify-between font-medium text-sun-text-muted text-xs">
                            <span>Access Fee</span>
                            <span className="text-white uppercase tracking-wider font-bold">FREE</span>
                          </div>

                          <div className="border-t border-sun-border/30 my-4 pt-4 flex justify-between items-end">
                            <span className="font-bold text-sm">Payable Amount</span>
                            <span className="text-2xl font-black text-sun-primary">${cartTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Promo / Coupon voucher */}
                        <div className="space-y-2 pt-2">
                          <p className="text-[9px] font-black uppercase text-sun-text-muted tracking-widest">Promotion Code</p>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="e.g. KORUSA50"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              className="bg-sun-surface border border-sun-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none flex-1 placeholder:text-gray-600 tracking-wider uppercase text-white min-w-0"
                            />
                            <Button variant="outline" size="sm" onClick={handleApplyPromo} className="!rounded-xl px-4 text-xs font-bold shrink-0 whitespace-nowrap">
                              Apply
                            </Button>
                          </div>
                          {promoMessage && (
                            <p className={`text-[10px] font-bold ${discountPercent > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {promoMessage}
                            </p>
                          )}
                          <p className="text-[9px] text-sun-text-muted leading-tight font-medium">Use code <b className="text-sun-primary">KORUSA50</b> for an instant 50% discount off your order!</p>
                        </div>

                        <div className="pt-4">
                          <Button 
                            onClick={handleSecureCheckout}
                            className="w-full min-h-[3.5rem] py-3.5 px-4 text-xs sm:text-sm whitespace-normal text-center leading-tight rounded-2xl flex items-center justify-center gap-2.5 font-black shadow-lg"
                          >
                            <CreditCard size={18} className="shrink-0" />
                            <span>Complete Secure Purchase</span>
                          </Button>
                          <p className="text-[9px] text-center text-sun-text-muted font-medium mt-3">
                            🔒 SSL Encrypted & Secure checkout processed via Korusa Cloud
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ) : checkoutStep === 'processing' ? (
              /* SECURE PROCESSING STATE */
              <div className="text-center p-12 sm:p-24 rounded-[3rem] bg-sun-surface-light border border-sun-border max-w-xl mx-auto space-y-8 animate-pulse">
                <div className="w-20 h-20 border-4 border-sun-primary border-t-transparent rounded-full animate-spin mx-auto pb-2" />
                <div className="space-y-3">
                  <h3 className="text-xl font-bold tracking-tight text-white">Cryptographic Transaction Pending</h3>
                  <p className="text-sm text-sun-text-muted max-w-xs mx-auto font-medium leading-relaxed">
                    {checkoutProgressText}
                  </p>
                </div>
              </div>
            ) : (
              /* ORDER CONGRATULATIONS SUCCESS STATE */
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto text-center space-y-8 p-8 sm:p-12 glass-card rounded-[3rem] border-sun-primary/30 relative overflow-hidden"
              >
                {/* Decorative golden seals */}
                <div className="absolute top-4 right-4 text-sun-primary opacity-20">
                  <Award size={100} />
                </div>
                
                <div className="w-20 h-20 bg-sun-primary text-black rounded-full flex items-center justify-center mx-auto shadow-2xl shrink-0">
                  <Check size={40} strokeWidth={3} />
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black tracking-[0.25em] text-sun-primary uppercase">OFFICIAL CREDENTIAL UNLOCKED</span>
                  <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-sun-text-main">Enrollment Complete!</h2>
                  <p className="text-xs sm:text-sm text-sun-text-muted max-w-md mx-auto leading-relaxed">
                    Congratulations, <b className="text-white">James Wilson</b>. Your order was successfully processed and logged inside our certified index.
                  </p>
                </div>

                {/* Simulated Certificate Graphic */}
                <div className="p-6 border-2 border-double border-sun-primary/20 bg-black/40 rounded-2xl relative text-left space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-sun-primary tracking-widest">KORUSA ACADEMY</p>
                      <h4 className="font-bold text-xs uppercase text-white font-display">VERIFIABLE LEARNER PASSPORT</h4>
                    </div>
                    <Award className="text-sun-primary" size={24} />
                  </div>
                  
                  <div className="border-t border-sun-border/40 my-3"></div>
                  
                  <div className="space-y-2 text-[10px]">
                    <div className="flex justify-between text-sun-text-muted">
                      <span>Owner:</span>
                      <span className="text-white font-bold">James Wilson</span>
                    </div>
                    <div className="flex justify-between text-sun-text-muted">
                      <span>License ID:</span>
                      <span className="text-white font-mono uppercase">KR-8422A9-WS</span>
                    </div>
                    <div className="flex justify-between text-sun-text-muted">
                      <span>Authority:</span>
                      <span className="text-sun-primary font-bold">Alumni Guild Council</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={() => {
                      setCheckoutStep('idle');
                      setViewCart(false);
                      onStartLearning();
                    }} 
                    className="w-full h-12 !rounded-xl font-bold"
                  >
                    Launch Interactive Player Now
                  </Button>
                  <button 
                    onClick={() => {
                      setCheckoutStep('idle');
                      setViewCart(false);
                    }}
                    className="text-xs text-sun-text-muted hover:text-white font-bold block mx-auto uppercase tracking-wider"
                  >
                    Back to Academy Catalog
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flagship core benefits banner */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-sun-border/40">
        {[
          { icon: <Layers size={18} />, title: "Micro-learning Hubs", desc: "Short, focused interactive sequences designed for immediate development integration." },
          { icon: <Award size={18} />, title: "Verifiable Creator Badges", desc: "Publish completed projects directly to your Korusa developer identity feed." },
          { icon: <Briefcase size={18} />, title: "Elite Mentor Guidance", desc: "Collaborate on real source files alongside world-class creative instructors." }
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
