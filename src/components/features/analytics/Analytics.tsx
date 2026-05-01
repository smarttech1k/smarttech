import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Eye, 
  Heart, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronLeft,
  Filter,
  Download,
  MoreHorizontal,
  Globe,
  PieChart as PieChartIcon
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

const COLORS = ['#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#F44336'];

const MetricCard: React.FC<{ item?: any; isLoading?: boolean }> = ({ item, isLoading }) => {
  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-[2rem] border border-sun-border/10 animate-pulse">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-white/5 rounded-2xl" />
          <div className="w-16 h-6 bg-white/5 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="w-24 h-3 bg-white/5 rounded-full" />
          <div className="w-32 h-8 bg-white/5 rounded-full" />
        </div>
      </div>
    );
  }

  const Icon = ({ Users, Eye, Heart, DollarSign } as any)[item.icon] || Users;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass-card p-6 rounded-[2rem] border border-sun-border/10 group hover:border-sun-primary/40 hover:bg-white/[0.03] transition-all duration-500 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
        <Icon size={80} />
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="p-3 bg-sun-primary/10 rounded-2xl text-sun-primary group-hover:bg-sun-primary group-hover:text-black transition-all duration-500 shadow-lg shadow-sun-primary/5">
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md border ${
          item.isPositive 
            ? 'text-green-400 bg-green-400/10 border-green-400/20' 
            : 'text-red-400 bg-red-400/10 border-red-400/20'
        }`}>
          {item.isPositive ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />}
          {item.change}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sun-text-muted mb-2 group-hover:text-sun-primary/60 transition-colors">{item.title}</p>
        <h3 className="text-3xl font-display font-black tracking-tight group-hover:scale-105 origin-left transition-transform duration-500">{item.value}</h3>
      </div>
    </motion.div>
  );
};

const ChartSkeleton = () => (
  <div className="glass-card p-8 rounded-[2.5rem] border border-sun-border/10 animate-pulse h-[450px]">
    <div className="flex justify-between items-center mb-10">
      <div className="space-y-3">
        <div className="w-40 h-6 bg-white/5 rounded-lg" />
        <div className="w-60 h-4 bg-white/5 rounded-lg" />
      </div>
      <div className="w-10 h-10 bg-white/5 rounded-full" />
    </div>
    <div className="w-full h-[280px] bg-white/5 rounded-[2rem]" />
  </div>
);

export const AnalyticsView = ({ onBack }: { onBack?: () => void }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
     return <div className="min-h-screen bg-sun-bg" />;
  }

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 border-b border-sun-border/5 pb-6 md:pb-10">
        <div className="space-y-4 md:space-y-5">
          {onBack && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onBack}
              className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-sun-text-muted hover:text-sun-primary transition-all group"
            >
              <div className="p-1 md:p-1.5 rounded-full bg-white/5 group-hover:bg-sun-primary/20 group-hover:text-sun-primary transition-all">
                <ChevronLeft size={12} />
              </div>
              Back to dashboard
            </motion.button>
          )}
          <div>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3"
             >
                <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-sun-primary shadow-[0_0_15px_rgba(255,184,0,0.6)] animate-pulse"></div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-sun-primary">Creator Performance</p>
             </motion.div>
             <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tighter uppercase italic leading-[0.9] md:leading-[0.85]">
                Creator <span className="text-sun-primary drop-shadow-[0_0_30px_rgba(255,184,0,0.2)]">Portal</span>
             </h1>
             <p className="text-sun-text-muted mt-3 md:mt-4 text-sm md:text-base max-w-lg leading-relaxed">
               Track your audience growth, analyze engagement rates, and optimize your teaching impact.
             </p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 md:gap-4"
        >
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-sun-primary/30 transition-all active:scale-95">
            <Filter size={14} className="text-sun-primary" /> <span className="hidden sm:inline">Filter Matrix</span><span className="sm:hidden">Filter</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-3.5 bg-sun-primary text-black rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:brightness-110 hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] transition-all active:scale-95 shadow-xl shadow-sun-primary/10">
            <Download size={14} /> <span className="hidden sm:inline">Data Stream</span><span className="sm:hidden">Export</span>
          </button>
        </motion.div>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading 
          ? [1, 2, 3, 4].map(i => <MetricCard key={i} isLoading />)
          : ANALYTICS_MOCK_DATA.summary.map((item) => (
              <MetricCard key={item.id} item={item} />
            ))
        }
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isLoading ? <ChartSkeleton /> : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 rounded-[3rem] border border-sun-border/10 hover:border-sun-border/20 transition-all duration-700 min-w-0 shadow-2xl shadow-black/40"
          >
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Audience Growth</h3>
                <p className="text-xs text-sun-text-muted leading-relaxed max-w-[240px]">Real-time tracking of new student enrollments and followers</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-sun-primary px-3 py-1.5 bg-sun-primary/10 rounded-full border border-sun-primary/20">
                <TrendingUp size={12} className="animate-bounce" /> LIVE STREAM
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={ANALYTICS_MOCK_DATA.growth}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFB800" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#FFB800" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="10 10" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}
                    dy={15}
                  />
                  <YAxis hide={true} />
                  <Tooltip 
                    cursor={{ stroke: '#FFB800', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 10, 10, 0.9)', 
                      backdropFilter: 'blur(10px)',
                      borderColor: 'rgba(255, 184, 0, 0.3)', 
                      borderRadius: '20px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    labelStyle={{ color: '#ffffff50', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}
                    itemStyle={{ color: '#FFB800', fontSize: '14px', fontWeight: 900 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="followers" 
                    stroke="#FFB800" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorFollowers)" 
                    animationDuration={2500}
                    activeDot={{ r: 6, fill: '#FFB800', stroke: '#000', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {isLoading ? <ChartSkeleton /> : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 rounded-[3rem] border border-sun-border/10 hover:border-sun-border/20 transition-all duration-700 min-w-0 shadow-2xl shadow-black/40"
          >
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Content Engagement</h3>
                <p className="text-xs text-sun-text-muted leading-relaxed max-w-[240px]">Monitor how students are interacting with your lessons</p>
              </div>
              <button className="p-3 bg-white/5 rounded-2xl text-sun-text-muted hover:text-white hover:bg-white/10 transition-all">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={ANALYTICS_MOCK_DATA.growth}>
                  <CartesianGrid strokeDasharray="10 10" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}
                    dy={15}
                  />
                  <YAxis hide={true} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 184, 0, 0.05)', radius: 12 }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 10, 10, 0.9)', 
                      backdropFilter: 'blur(10px)',
                      borderColor: 'rgba(255, 184, 0, 0.3)', 
                      borderRadius: '20px',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#ffffff50', fontSize: '10px', textTransform: 'uppercase' }}
                    itemStyle={{ color: '#FFB800', fontSize: '14px', fontWeight: 900 }}
                  />
                  <Bar 
                    dataKey="views" 
                    fill="#FFB800" 
                    radius={[12, 12, 0, 0]} 
                    barSize={40}
                    animationDuration={2000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {/* Content Performance Table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2 glass-card rounded-[3rem] border border-sun-border/10 overflow-hidden shadow-2xl"
        >
          <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Content Library</h3>
              <p className="text-xs text-sun-text-muted mt-1">Detailed performance metrics for your top posts and courses</p>
            </div>
            <button className="px-5 py-2 bg-white/5 hover:bg-sun-primary hover:text-black transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5">
              History Log
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">Post Title</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">Views</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">Likes</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">Growth Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-10 py-6"><div className="w-40 h-10 bg-white/5 rounded-xl" /></td>
                    <td className="px-10 py-6"><div className="w-16 h-6 bg-white/5 rounded-lg" /></td>
                    <td className="px-10 py-6"><div className="w-16 h-6 bg-white/5 rounded-lg" /></td>
                    <td className="px-10 py-6"><div className="w-32 h-4 bg-white/5 rounded-full" /></td>
                  </tr>
                )) : ANALYTICS_MOCK_DATA.topContent.map((post) => (
                  <tr key={post.id} className="group hover:bg-white/[0.03] transition-all duration-300">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                          <img 
                            src={post.thumbnail} 
                            alt="" 
                            className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-sun-primary/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                        </div>
                        <p className="text-sm font-black tracking-tight leading-snug group-hover:text-sun-primary transition-colors max-w-[240px] italic">
                          {post.title}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-sm font-mono font-black group-hover:text-white transition-colors">{post.views}</span>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-sm font-mono font-black group-hover:text-white transition-colors">{post.likes}</span>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden border border-white/5">
                           <motion.div 
                              className="h-full bg-sun-primary rounded-full shadow-[0_0_10px_rgba(255,184,0,0.5)]" 
                              initial={{ width: 0 }}
                              animate={{ width: '65%' }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                           />
                        </div>
                        <span className="text-[10px] font-black text-sun-primary tracking-tighter">TRENDING</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Audience Insights */}
        <div className="space-y-8">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="glass-card p-10 rounded-[3rem] border border-sun-border/10 shadow-xl"
           >
              <div className="flex items-center gap-4 mb-10">
                 <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl shadow-inner shadow-blue-500/5">
                    <Globe size={22} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Audience Locations</h3>
                    <p className="text-[10px] text-sun-text-muted uppercase">Distribution hubs</p>
                 </div>
              </div>
              <div className="space-y-8">
                {isLoading ? [1,2,3,4].map(i => (
                  <div key={i} className="space-y-3 animate-pulse">
                    <div className="flex justify-between"><div className="w-20 h-3 bg-white/5 rounded" /><div className="w-10 h-3 bg-white/5 rounded" /></div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full" />
                  </div>
                )) : ANALYTICS_MOCK_DATA.audience.countries.map((country) => (
                  <div key={country.name} className="space-y-3 group">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                       <span>{country.name}</span>
                       <span className="text-sun-text-muted group-hover:text-sun-primary transition-colors">{country.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <motion.div 
                          className="h-full bg-gradient-to-r from-sun-primary/50 to-sun-primary rounded-full group-hover:brightness-125 transition-all"
                          initial={{ width: 0 }}
                          animate={{ width: `${country.percentage}%` }}
                          transition={{ duration: 2, ease: "circOut" }}
                       />
                    </div>
                  </div>
                ))}
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="glass-card p-10 rounded-[3rem] border border-sun-border/10 shadow-xl"
           >
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl shadow-inner shadow-purple-500/5">
                    <PieChartIcon size={22} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Audience Demographics</h3>
                    <p className="text-[10px] text-sun-text-muted uppercase">Age & Gender</p>
                 </div>
              </div>
              <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                   <PieChart>
                      <Pie
                        data={ANALYTICS_MOCK_DATA.audience.gender}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                         {ANALYTICS_MOCK_DATA.audience.gender.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            className="hover:brightness-125 transition-all outline-none"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                           backgroundColor: 'rgba(10, 10, 10, 0.9)', 
                           backdropFilter: 'blur(10px)',
                           borderColor: 'rgba(255, 184, 0, 0.2)', 
                           borderRadius: '20px',
                           padding: '12px',
                           fontSize: '10px',
                           fontWeight: 900
                        }}
                      />
                   </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest text-sun-text-muted">Total Audience</p>
                    <p className="text-xl font-display font-black leading-none">12.4K</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                 {ANALYTICS_MOCK_DATA.audience.gender.map((entry, index) => (
                   <div key={entry.name} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[10px] font-black uppercase text-sun-text-muted group-hover:text-white">{entry.name}</span>
                   </div>
                 ))}
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
};
