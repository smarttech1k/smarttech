import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Globe, 
  Zap, 
  BookOpen, 
  MessageSquare,
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronLeft,
  Filter,
  Download,
  MoreHorizontal,
  Award,
  Clock,
  ThumbsUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ANALYTICS_MOCK_DATA } from './mockData';

// Korusa Purple Official Color Palette
const COLORS = ['#6D28D9', '#8B5CF6', '#A78BFA', '#4C1D95', '#DDD6FE'];

const MetricCard: React.FC<{ item?: any; isLoading?: boolean; className?: string }> = ({ item, isLoading, className = "" }) => {
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border p-4 sm:p-6 rounded-2xl animate-pulse space-y-4 ${className}`}>
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="w-12 h-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="w-24 h-6 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  const Icon = ({ Users, Globe, Zap, BookOpen, MessageSquare } as any)[item.icon] || Users;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`bg-white dark:bg-sun-surface border-t-4 border-t-sun-primary border-x border-b border-gray-100 dark:border-sun-border/50 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group ${className}`}
    >
      <div className="absolute -right-4 -bottom-4 p-6 opacity-[0.03] text-sun-primary pointer-events-none group-hover:scale-110 transition-transform duration-300">
        <Icon size={96} />
      </div>

      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div className="p-3 bg-sun-primary/10 text-sun-primary rounded-xl group-hover:bg-sun-primary group-hover:text-white transition-all duration-300 shadow-sm shadow-sun-primary/5">
          <Icon size={18} />
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
          <ArrowUpRight size={10} strokeWidth={2.5} />
          {item.change}
        </span>
      </div>

      <div className="z-10 relative">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sun-text-muted mb-1.5">{item.title}</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-sun-text-main tracking-tight">{item.value}</h3>
      </div>
    </motion.div>
  );
};

const ChartSkeleton = () => (
  <div className="bg-white dark:bg-sun-surface-light border border-gray-100 dark:border-sun-border/40 p-8 rounded-3xl animate-pulse h-[400px]">
    <div className="flex justify-between items-center mb-10">
      <div className="space-y-2">
        <div className="w-36 h-5 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="w-56 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full" />
    </div>
    <div className="w-full h-[240px] bg-slate-100 dark:bg-slate-800 rounded-2xl" />
  </div>
);

export const AnalyticsView = ({ onBack }: { onBack?: () => void }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
     return <div className="min-h-screen bg-sun-bg" />;
  }

  return (
    <div className="space-y-6 sm:space-y-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
      {/* Design-Focused Creative Insights Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-sun-border/40 pb-6">
        <div className="space-y-4">
          {onBack && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onBack}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-sun-text-muted hover:text-sun-primary transition-all group"
            >
              <div className="p-1.5 rounded-full bg-sun-surface group-hover:bg-sun-primary/10 group-hover:text-sun-primary transition-all border border-sun-border/40">
                <ChevronLeft size={10} />
              </div>
              Back to Home
            </motion.button>
          )}
          <div>
             <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-sun-primary shadow-[0_0_10px_rgba(109,40,217,0.5)] animate-pulse"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-sun-primary">Your Insights</p>
             </div>
             <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-sun-text-main">
                Insights & Community Progress
             </h1>
             <p className="text-sun-text-muted mt-2 text-xs sm:text-sm max-w-lg leading-relaxed">
               See how your Spark videos, stories, and lessons are inspiring your friendly community of learners.
             </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex gap-3 shrink-0 w-full sm:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border rounded-xl text-xs font-bold uppercase tracking-wider text-sun-text-muted hover:text-sun-primary hover:border-sun-primary/20 transition-all">
            <Filter size={14} className="text-sun-primary" /> Filter
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sun-primary text-white hover:bg-sun-secondary rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-sun-primary/10">
            <Download size={14} /> Share Progress
          </button>
        </div>
      </header>

      {/* Modern Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {isLoading 
          ? [1, 2, 3, 4, 5].map((i, idx) => (
              <MetricCard 
                key={i} 
                isLoading 
                className={idx === 4 ? "sm:col-span-2 md:col-span-2 xl:col-span-1" : ""}
              />
            ))
          : ANALYTICS_MOCK_DATA.summary.map((item, idx) => (
              <MetricCard 
                key={item.id} 
                item={item} 
                className={idx === 4 ? "sm:col-span-2 md:col-span-2 xl:col-span-1" : ""}
              />
            ))
        }
      </div>

      {/* Main Analytical Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {isLoading ? <ChartSkeleton /> : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-4 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-6 sm:mb-8">
              <div>
                <h3 className="text-base font-bold text-sun-text-main">Weekly Engagement & Discovery</h3>
                <p className="text-xs text-sun-text-muted leading-relaxed max-w-sm mt-1">Views, likes, and shares across all your Spark videos and stories</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-sun-primary/10 text-sun-primary rounded-full border border-sun-primary/15 animate-pulse">
                LIVE REACH
              </span>
            </div>
            
            <div className="h-[240px] sm:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={ANALYTICS_MOCK_DATA.growth}>
                  <defs>
                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6D28D9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" dark:stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={12}
                  />
                  <YAxis hide={true} />
                  <Tooltip 
                    cursor={{ stroke: '#8B5CF6', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderColor: '#E5E7EB',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 12px rgba(109,40,217,0.05)',
                      color: '#1E293B'
                    }}
                    labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}
                    itemStyle={{ color: '#6D28D9', fontSize: '13px', fontWeight: 700 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="reach" 
                    stroke="#6D28D9" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorReach)" 
                    activeDot={{ r: 6, fill: '#6D28D9', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {isLoading ? <ChartSkeleton /> : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-4 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-6 sm:mb-8">
              <div>
                <h3 className="text-base font-bold text-sun-text-main">Time Spent Learning Together</h3>
                <p className="text-xs text-sun-text-muted leading-relaxed max-w-sm mt-1">Minutes spent watching Spark lessons and practicing creative skills</p>
              </div>
              <button className="p-2 text-sun-text-muted hover:text-sun-primary transition-colors hover:bg-sun-bg rounded-lg">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="h-[240px] sm:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={ANALYTICS_MOCK_DATA.growth}>
                  <defs>
                    <linearGradient id="colorLearning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={1}/>
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" dark:stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={12}
                  />
                  <YAxis hide={true} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(109, 40, 217, 0.04)', radius: 6 }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderColor: '#E5E7EB',
                      borderRadius: '12px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#94a3b8', fontSize: '9px' }}
                    itemStyle={{ color: '#8B5CF6', fontSize: '13px', fontWeight: 700 }}
                  />
                  <Bar 
                    dataKey="learning" 
                    fill="url(#colorLearning)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Library Table and Geography splits */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        {/* Post library table */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 rounded-2xl p-4 sm:p-8 shadow-sm overflow-hidden"
        >
          <div className="flex justify-between items-center pb-6 border-b border-gray-100 dark:border-sun-border/40">
            <div>
              <h3 className="text-base font-bold text-sun-text-main">Popular Spark Creations</h3>
              <p className="text-xs text-sun-text-muted mt-0.5">Top-performing educational art guides and video storyboards</p>
            </div>
            <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-sun-bg hover:bg-sun-primary/10 border border-sun-border text-xs text-sun-text-muted hover:text-sun-primary font-bold rounded-lg transition-all">
              Details Log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs sm:text-sm">
              <thead>
                <tr className="text-sun-text-muted uppercase tracking-wider text-[10px] border-b border-gray-100 dark:border-sun-border/20">
                  <th className="py-4 font-bold">Concept Resource</th>
                  <th className="py-4 font-bold text-center hidden sm:table-cell">Views</th>
                  <th className="py-4 font-bold text-center hidden sm:table-cell">Likes</th>
                  <th className="py-1.5 font-bold text-right hidden md:table-cell">Growth Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-sun-border/20">
                {isLoading ? [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4"><div className="w-44 h-8 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 hidden sm:table-cell"><div className="w-12 h-4 bg-slate-100 dark:bg-slate-800 rounded mx-auto" /></td>
                    <td className="py-4 hidden sm:table-cell"><div className="w-10 h-4 bg-slate-100 dark:bg-slate-800 rounded mx-auto" /></td>
                    <td className="py-4 hidden md:table-cell"><div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                  </tr>
                )) : ANALYTICS_MOCK_DATA.topContent.map((post) => (
                  <tr key={post.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 pr-2">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <img 
                          src={post.thumbnail} 
                          alt="Thumbnail" 
                          className="w-12 h-12 sm:w-11 sm:h-11 rounded-lg object-cover border border-sun-border/30 group-hover:scale-105 transition-transform shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sun-text-main group-hover:text-sun-primary transition-colors line-clamp-2 leading-tight text-xs sm:text-sm">
                            {post.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1 sm:hidden text-[9px] text-sun-text-muted font-bold tracking-wider uppercase">
                            <span>{post.views} views</span>
                            <span className="text-sun-primary">•</span>
                            <span>{post.likes} likes</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono font-bold text-sun-text-main hidden sm:table-cell">{post.views}</td>
                    <td className="py-4 text-center font-mono font-medium text-sun-text-muted hidden sm:table-cell">{post.likes}</td>
                    <td className="py-4 text-right hidden md:table-cell">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-sun-primary to-sun-secondary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: "80%" }}
                            transition={{ duration: 1.2 }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-sun-primary uppercase tracking-wider">High</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Audience Locations */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-4 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-3.5 mb-6">
              <div className="p-2.5 bg-sun-primary/10 text-sun-primary rounded-xl shrink-0">
                <Globe size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sun-text-main text-xs uppercase tracking-wider">Geography Distribution</h4>
                <p className="text-[10px] text-sun-text-muted mt-0.5">Top active student centers</p>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading ? [1,2,3].map(i => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              )) : ANALYTICS_MOCK_DATA.audience.countries.map((c) => (
                <div key={c.name} className="space-y-1.5 group">
                  <div className="flex justify-between text-xs font-semibold text-sun-text-main">
                    <span>{c.name}</span>
                    <span className="text-sun-primary font-bold">{c.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-transparent">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-sun-primary to-sun-secondary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${c.percentage}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Demographics Split */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-4 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative"
          >
            <div className="flex items-center gap-3.5 mb-6">
              <div className="p-2.5 bg-sun-secondary/10 text-sun-secondary rounded-xl shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sun-text-main text-xs uppercase tracking-wider">Demographic Metrics</h4>
                <p className="text-[10px] text-sun-text-muted mt-0.5">Gender representation</p>
              </div>
            </div>

            <div className="h-[140px] w-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={ANALYTICS_MOCK_DATA.audience.gender}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                     {ANALYTICS_MOCK_DATA.audience.gender.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="hover:brightness-105 transition-all outline-none"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                       backgroundColor: '#fff',
                       borderColor: '#e2e8f0',
                       borderRadius: '8px',
                       padding: '6px',
                       fontSize: '11px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-12 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] text-sun-text-muted uppercase font-bold tracking-widest leading-none">Registered</span>
                <span className="text-base font-bold text-sun-text-main tracking-tight leading-none mt-0.5">12.4K</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              {ANALYTICS_MOCK_DATA.audience.gender.map((gender, idx) => (
                <div key={gender.name} className="flex flex-col items-center p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-gray-100 dark:border-sun-border/30 rounded-lg text-center">
                  <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-[9px] font-bold text-sun-text-muted uppercase leading-tight truncate w-full">{gender.name}</span>
                  <span className="text-[11px] font-bold text-sun-text-main tracking-tight mt-0.5">{gender.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
