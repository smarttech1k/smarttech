import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Eye,
  FileText,
  Hash,
  Heart,
  MessageSquare,
  Minus,
  Percent,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BackButton } from '../../ui/BackButton';
import {
  engagementRate,
  engagementsIn,
  fetchAudienceBreakdown,
  fetchCreatorOverview,
  fetchEngagementSeries,
  fetchMyTopHashtags,
  fetchStoryPerformance,
  fetchTopPosts,
  INSIGHTS_RANGES,
  toCsv,
  VIEW_TRACKING_START,
  type AudienceBreakdown,
  type CreatorOverview,
  type DayPoint,
  type Delta,
  type InsightsRange,
  type StoryPerformance,
  type TagCount,
  type TopPost,
} from '../../../lib/analytics';
import { formatRelativeTime } from '../../../lib/time';

// Korusa Purple Official Color Palette
const COLORS = ['#6D28D9', '#8B5CF6', '#A78BFA', '#4C1D95', '#DDD6FE'];

const PANEL_CLASS =
  'bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border/40 p-4 sm:p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300';

const formatCount = (value: number) => {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
};

// Built from the parts rather than `new Date(day)`: an ISO date string parses as UTC
// midnight, which renders as the previous day for anyone west of Greenwich.
const parseDay = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, (month || 1) - 1, date || 1);
};

const formatDayLabel = (day: string) =>
  parseDay(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatDayFull = (day: string) =>
  parseDay(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderColor: '#E5E7EB',
  borderRadius: '12px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(109,40,217,0.05)',
  color: '#1E293B',
} as const;

const AXIS_TICK = { fill: '#94a3b8', fontSize: 10, fontWeight: 700 } as const;

/**
 * The change pill. The page this replaced hardcoded every one of these green with an
 * upward arrow, so no metric could ever be shown falling - `ArrowDownRight` was
 * imported and never used. This computes the direction from the previous window.
 *
 * Three cases the percentage cannot express, each with its own presentation:
 * nothing in either window (neutral dash), nothing before and something now (New),
 * and everything gone (-100%).
 */
const DeltaPill = ({ delta }: { delta: Delta | null }) => {
  if (!delta) return null;

  const { current, previous } = delta;

  if (current === previous) {
    return (
      <span className="flex items-center gap-1 rounded-full border border-sun-border bg-sun-bg px-2 py-0.5 text-[10px] font-bold text-sun-text-muted">
        <Minus size={10} strokeWidth={2.5} />
        {current === 0 ? 'None yet' : 'No change'}
      </span>
    );
  }

  const up = current > previous;
  const label =
    previous === 0 ? 'New' : `${up ? '+' : ''}${Math.round(((current - previous) / previous) * 100)}%`;

  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
        up
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
          : 'bg-red-500/10 text-red-600 border-red-500/10'
      }`}
      title={`${previous} in the previous period, ${current} now`}
    >
      {up ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
      {label}
    </span>
  );
};

const MetricCard = ({
  icon: Icon,
  title,
  value,
  delta,
  hint,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  delta?: Delta | null;
  hint?: string;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, scale: 1.01 }}
    className={`bg-white dark:bg-sun-surface border-t-4 border-t-sun-primary border-x border-b border-gray-100 dark:border-sun-border/50 p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group ${className}`}
  >
    <div className="absolute -right-4 -bottom-4 p-6 opacity-[0.03] text-sun-primary pointer-events-none group-hover:scale-110 transition-transform duration-300">
      <Icon size={96} />
    </div>

    <div className="relative z-10 mb-6 flex items-start justify-between gap-2">
      <div className="p-3 bg-sun-primary/10 text-sun-primary rounded-xl group-hover:bg-sun-primary group-hover:text-white transition-all duration-300 shadow-sm shadow-sun-primary/5">
        <Icon size={18} />
      </div>
      <DeltaPill delta={delta ?? null} />
    </div>

    <div className="relative z-10">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">{title}</p>
      <h3 className="text-2xl font-bold tracking-tight text-sun-text-main sm:text-3xl">{value}</h3>
      {hint && <p className="mt-1 text-[10px] font-medium text-sun-text-muted">{hint}</p>}
    </div>
  </motion.div>
);

const MetricSkeleton = ({ className = '' }: { className?: string }) => (
  <div
    className={`bg-white dark:bg-sun-surface border border-gray-100 dark:border-sun-border p-4 sm:p-6 rounded-2xl animate-pulse space-y-4 ${className}`}
  >
    <div className="flex items-start justify-between">
      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-5 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
    <div className="space-y-2">
      <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white dark:bg-sun-surface-light border border-gray-100 dark:border-sun-border/40 p-8 rounded-3xl animate-pulse h-[400px]">
    <div className="mb-10 flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-5 w-36 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
    <div className="h-[240px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
  </div>
);

const PanelHeading = ({
  icon: Icon,
  title,
  subtitle,
  tint = 'primary',
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tint?: 'primary' | 'secondary';
}) => (
  <div className="mb-6 flex items-center gap-3.5">
    <div
      className={`shrink-0 rounded-xl p-2.5 ${
        tint === 'primary' ? 'bg-sun-primary/10 text-sun-primary' : 'bg-sun-secondary/10 text-sun-secondary'
      }`}
    >
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <h4 className="text-xs font-bold uppercase tracking-wider text-sun-text-main">{title}</h4>
      <p className="mt-0.5 text-[10px] text-sun-text-muted">{subtitle}</p>
    </div>
  </div>
);

/** A labelled proportion bar, the presentation the mock used for its country list. */
const ShareBar = ({ label, value, share, tint }: { label: string; value: string; share: number; tint: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between gap-3 text-xs font-semibold text-sun-text-main">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 font-bold text-sun-primary">{value}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: tint }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(share, 0) * 100}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </div>
  </div>
);

const EmptyNote = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-dashed border-sun-border bg-sun-bg/40 p-4 text-xs leading-relaxed text-sun-text-muted">
    {children}
  </p>
);

export const AnalyticsView = ({ onBack }: { onBack?: () => void }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [range, setRange] = useState<InsightsRange>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [audience, setAudience] = useState<AudienceBreakdown | null>(null);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [stories, setStories] = useState<StoryPerformance[]>([]);

  useEffect(() => setIsMounted(true), []);

  // allSettled rather than all: six independent panels, and one failing RPC should
  // cost its own panel rather than blank the page. The banner appears only when
  // every one of them failed, which means the connection and not the data.
  const load = useCallback(async (activeRange: InsightsRange) => {
    setIsLoading(true);
    setErrorMessage('');

    const results = await Promise.allSettled([
      fetchCreatorOverview(activeRange),
      fetchEngagementSeries(activeRange),
      fetchTopPosts(activeRange),
      fetchAudienceBreakdown(),
      fetchMyTopHashtags(activeRange),
      fetchStoryPerformance(activeRange),
    ]);

    const [overviewResult, seriesResult, postsResult, audienceResult, tagsResult, storiesResult] = results;

    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
    if (seriesResult.status === 'fulfilled') setSeries(seriesResult.value);
    if (postsResult.status === 'fulfilled') setTopPosts(postsResult.value);
    if (audienceResult.status === 'fulfilled') setAudience(audienceResult.value);
    if (tagsResult.status === 'fulfilled') setTags(tagsResult.value);
    if (storiesResult.status === 'fulfilled') setStories(storiesResult.value);

    if (results.every((result) => result.status === 'rejected')) {
      const first = results[0];
      setErrorMessage(
        first.status === 'rejected' && first.reason instanceof Error
          ? first.reason.message
          : 'Could not load your insights.',
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(series)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `korusa-insights-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isMounted) {
    // min-h-full: this placeholder renders inside the shell's own scroller, so a
    // 100vh block added a second scrollbar for the first frame after mount.
    return <div className="min-h-full bg-sun-bg" />;
  }

  const rate = overview ? engagementRate(overview, 'current') : null;
  const previousRate = overview ? engagementRate(overview, 'previous') : null;
  const engagements = overview ? engagementsIn(overview, 'current') : 0;

  const viewsInWindow = series.reduce((total, point) => total + point.views, 0);
  const engagementSeries = series.map((point) => ({
    ...point,
    total: point.likes + point.comments + point.storyViews,
  }));
  const hasEngagement = engagementSeries.some((point) => point.total > 0);

  const audienceTotal = audience ? audience.mutual + audience.followersOnly + audience.followingOnly : 0;
  const maxTagCount = tags.reduce((max, tag) => Math.max(max, tag.postCount), 0);
  const maxPostEngagement = topPosts.reduce(
    (max, post) => Math.max(max, post.likeCount + post.commentCount),
    0,
  );

  return (
    // No horizontal padding here: AppLayout's page container already applies
    // px-4 sm:px-6 lg:px-8, and doubling it cost 32px of a 375px screen. Same for
    // the bottom padding, which the shell now sizes around the mobile nav.
    <div className="space-y-6 sm:space-y-10 md:pb-20 max-w-7xl mx-auto pt-4 sm:pt-8">
      <header className="flex flex-col justify-between gap-6 border-b border-sun-border/40 pb-6 md:flex-row md:items-end md:gap-8">
        <div className="space-y-4">
          {onBack && <BackButton onClick={onBack} label="Back" />}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-sun-primary">Insights</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-sun-text-main sm:text-4xl">
              How your account is doing
            </h1>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-sun-text-muted sm:text-sm">
              Your own posts, stories and followers, counted from the real thing. Nobody else can see
              these numbers.
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {/* Full width below sm for the same reason the feed's Latest/Following
              toggle is: a small pill floating at the left edge of a wrapped line is
              both hard to hit and hard to read as a set of choices. */}
          <div
            className="flex w-full rounded-xl border border-sun-border bg-sun-surface p-1 shadow-sm sm:w-auto"
            role="group"
            aria-label="Time range"
          >
            {INSIGHTS_RANGES.map((option) => {
              const active = range === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRange(option)}
                  className={`min-h-10 flex-1 rounded-lg px-4 text-xs font-bold uppercase tracking-wider transition-colors sm:min-h-0 sm:flex-none sm:py-2 ${
                    active ? 'bg-sun-primary text-white' : 'text-sun-text-muted hover:text-sun-text-main'
                  }`}
                >
                  {option}d
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={isLoading || series.length === 0}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sun-primary px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-sun-primary/10 transition-all hover:bg-sun-secondary disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-5 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 xl:grid-cols-5">
        {isLoading || !overview ? (
          [0, 1, 2, 3, 4].map((index) => (
            <MetricSkeleton
              key={index}
              className={index === 4 ? 'sm:col-span-2 md:col-span-2 xl:col-span-1' : ''}
            />
          ))
        ) : (
          <>
            <MetricCard
              icon={Users}
              title="Followers"
              value={formatCount(overview.followersTotal)}
              delta={overview.followers}
              hint={`${formatCount(overview.followers.current)} new in ${range}d`}
            />
            <MetricCard
              icon={Eye}
              title="Post views"
              value={formatCount(overview.views.current)}
              delta={overview.views}
              hint={`${formatCount(overview.viewsTotal)} all time`}
            />
            <MetricCard
              icon={Heart}
              title="Engagements"
              value={formatCount(engagements)}
              delta={{ current: engagements, previous: engagementsIn(overview, 'previous') }}
              hint="Likes, comments and story reactions"
            />
            <MetricCard
              icon={Percent}
              title="Engagement rate"
              value={rate === null ? '—' : `${(rate * 100).toFixed(1)}%`}
              delta={
                rate === null || previousRate === null
                  ? null
                  : { current: Math.round(rate * 1000), previous: Math.round(previousRate * 1000) }
              }
              hint={rate === null ? 'Needs at least one post view' : 'Engagements per view'}
            />
            <MetricCard
              icon={FileText}
              title="Posts published"
              value={formatCount(overview.posts.current)}
              delta={overview.posts}
              hint={`${formatCount(overview.postsTotal)} all time`}
              className="sm:col-span-2 md:col-span-2 xl:col-span-1"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className={PANEL_CLASS}>
            <div className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
              <div>
                <h3 className="text-base font-bold text-sun-text-main">Reach</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-sun-text-muted">
                  People who saw your posts, counted once each. Tracking began{' '}
                  {formatDayFull(VIEW_TRACKING_START)}.
                </p>
              </div>
              <div className="shrink-0 rounded-xl bg-sun-primary/10 p-2.5 text-sun-primary">
                <TrendingUp size={16} />
              </div>
            </div>

            {viewsInWindow === 0 ? (
              <div className="flex h-[240px] items-center sm:h-[280px]">
                <EmptyNote>
                  No views recorded in this window yet. A view is counted when somebody other than you
                  keeps one of your posts on screen — so this fills in as people read what you publish,
                  and it has nothing to show for the days before tracking existed.
                </EmptyNote>
              </div>
            ) : (
              <div className="h-[240px] w-full sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6D28D9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={AXIS_TICK}
                      dy={12}
                      interval="preserveStartEnd"
                      minTickGap={24}
                      tickFormatter={formatDayLabel}
                    />
                    <YAxis hide={true} allowDecimals={false} />
                    <Tooltip
                      cursor={{ stroke: '#8B5CF6', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(label: string) => formatDayFull(label)}
                      labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}
                      itemStyle={{ color: '#6D28D9', fontSize: '13px', fontWeight: 700 }}
                      formatter={(value: number) => [value, 'Viewers']}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#6D28D9"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorViews)"
                      activeDot={{ r: 6, fill: '#6D28D9', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className={PANEL_CLASS}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-sun-text-main">Engagement received</h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-sun-text-muted">
                  What other people did with your posts and stories, day by day.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { label: 'Likes', color: COLORS[0] },
                  { label: 'Comments', color: COLORS[1] },
                  { label: 'Story views', color: COLORS[2] },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-sun-text-muted"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {!hasEngagement ? (
              <div className="flex h-[240px] items-center sm:h-[280px]">
                <EmptyNote>
                  No likes, comments or story views on your posts in the last {range} days. Every one
                  you do receive is placed on the day it happened, so this fills in as people react —
                  try a longer range if you have been quiet lately.
                </EmptyNote>
              </div>
            ) : (
              <div className="h-[240px] w-full sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={engagementSeries}>
                    <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={AXIS_TICK}
                      dy={12}
                      interval="preserveStartEnd"
                      minTickGap={24}
                      tickFormatter={formatDayLabel}
                    />
                    <YAxis hide={true} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(109, 40, 217, 0.04)' }}
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(label: string) => formatDayFull(label)}
                      labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                    />
                    <Bar dataKey="likes" stackId="engagement" name="Likes" fill={COLORS[0]} />
                    <Bar dataKey="comments" stackId="engagement" name="Comments" fill={COLORS[1]} />
                    <Bar
                      dataKey="storyViews"
                      stackId="engagement"
                      name="Story views"
                      fill={COLORS[2]}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-3">
        {/* Top posts */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-sun-border/40 dark:bg-sun-surface sm:p-8 xl:col-span-2"
        >
          <div className="border-b border-gray-100 pb-6 dark:border-sun-border/40">
            <h3 className="text-base font-bold text-sun-text-main">Your top posts</h3>
            <p className="mt-0.5 text-xs text-sun-text-muted">
              Published in the last {range} days, ranked by the engagement they earned. Counts are for
              the life of each post.
            </p>
          </div>

          {!isLoading && topPosts.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sun-border bg-sun-bg text-sun-text-muted/40">
                <FileText size={24} />
              </div>
              <p className="text-sm font-bold text-sun-text-main">Nothing published in this window</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-sun-text-muted">
                Post something and it shows up here with its own numbers. Try a longer range if you have
                posted before.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-sun-text-muted dark:border-sun-border/20">
                    <th className="py-4 font-bold">Post</th>
                    <th className="hidden py-4 text-center font-bold sm:table-cell">Views</th>
                    <th className="hidden py-4 text-center font-bold sm:table-cell">Likes</th>
                    <th className="hidden py-4 text-center font-bold md:table-cell">Comments</th>
                    <th className="hidden py-4 text-right font-bold lg:table-cell">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-sun-border/20">
                  {isLoading
                    ? [0, 1, 2].map((index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="py-4">
                            <div className="h-8 w-44 rounded bg-slate-100 dark:bg-slate-800" />
                          </td>
                          <td className="hidden py-4 sm:table-cell">
                            <div className="mx-auto h-4 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                          </td>
                          <td className="hidden py-4 sm:table-cell">
                            <div className="mx-auto h-4 w-10 rounded bg-slate-100 dark:bg-slate-800" />
                          </td>
                          <td className="hidden py-4 md:table-cell">
                            <div className="mx-auto h-4 w-10 rounded bg-slate-100 dark:bg-slate-800" />
                          </td>
                          <td className="hidden py-4 lg:table-cell">
                            <div className="ml-auto h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                          </td>
                        </tr>
                      ))
                    : topPosts.map((post) => {
                        const postEngagement = post.likeCount + post.commentCount;
                        const share = maxPostEngagement > 0 ? postEngagement / maxPostEngagement : 0;
                        return (
                          <tr
                            key={post.id}
                            className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/10"
                          >
                            <td className="py-4 pr-2">
                              <div className="flex items-center gap-3 sm:gap-4">
                                {post.mediaUrl ? (
                                  <img
                                    src={post.mediaUrl}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded-lg border border-sun-border/30 object-cover transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  // Text-only posts are the common case here, so a
                                  // glyph rather than a broken image frame.
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-sun-border/30 bg-sun-bg text-sun-text-muted/50 sm:h-11 sm:w-11">
                                    <FileText size={16} />
                                  </div>
                                )}
                                <div className="flex min-w-0 flex-col">
                                  <span className="line-clamp-2 text-xs font-bold leading-tight text-sun-text-main transition-colors group-hover:text-sun-primary sm:text-sm wrap-anywhere">
                                    {post.content?.trim() || 'Untitled post'}
                                  </span>
                                  <div className="mt-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-sun-text-muted">
                                    <span className="sm:hidden">{post.viewCount} views</span>
                                    <span className="text-sun-primary sm:hidden">•</span>
                                    <span className="sm:hidden">{post.likeCount} likes</span>
                                    <span className="text-sun-primary md:hidden">•</span>
                                    <span className="md:hidden">{post.commentCount} comments</span>
                                    <span className="hidden sm:inline">
                                      {formatRelativeTime(post.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="hidden py-4 text-center font-mono font-bold text-sun-text-main sm:table-cell">
                              {post.viewCount}
                            </td>
                            <td className="hidden py-4 text-center font-mono font-medium text-sun-text-muted sm:table-cell">
                              {post.likeCount}
                            </td>
                            <td className="hidden py-4 text-center font-mono font-medium text-sun-text-muted md:table-cell">
                              {post.commentCount}
                            </td>
                            <td className="hidden py-4 text-right lg:table-cell">
                              {/* Relative to the best-performing row on screen, and
                                  labelled with the real number - the page this
                                  replaced drew every bar at 80% and called it "High". */}
                              <div className="inline-flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-sun-primary to-sun-secondary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${share * 100}%` }}
                                    transition={{ duration: 1.2 }}
                                  />
                                </div>
                                <span className="w-6 text-[10px] font-bold uppercase tracking-wider text-sun-primary">
                                  {postEngagement}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Right column. Each panel is self-contained with its own empty rule, so
            another metric is one more entry in this stack. */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={PANEL_CLASS}>
            <PanelHeading icon={Users} title="Your audience" subtitle="Who follows whom, right now" />

            {isLoading || !audience ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="animate-pulse space-y-2">
                    <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-1.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : audienceTotal === 0 ? (
              <EmptyNote>
                No follow relationships yet. Follow a few people and this shows how much of your
                audience is mutual.
              </EmptyNote>
            ) : (
              <div className="space-y-4">
                <ShareBar
                  label="Mutual"
                  value={String(audience.mutual)}
                  share={audience.mutual / audienceTotal}
                  tint={COLORS[0]}
                />
                <ShareBar
                  label="Follows you"
                  value={String(audience.followersOnly)}
                  share={audience.followersOnly / audienceTotal}
                  tint={COLORS[1]}
                />
                <ShareBar
                  label="You follow"
                  value={String(audience.followingOnly)}
                  share={audience.followingOnly / audienceTotal}
                  tint={COLORS[2]}
                />
              </div>
            )}
          </motion.div>

          {/* Hidden entirely when you use no hashtags, the same rule
              get_trending_hashtags documents: an empty result renders no panel. */}
          {!isLoading && tags.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={PANEL_CLASS}>
              <PanelHeading
                icon={Hash}
                title="Your hashtags"
                subtitle={`Counted from your posts in the last ${range} days`}
                tint="secondary"
              />
              <div className="space-y-4">
                {tags.map((tag, index) => (
                  <ShareBar
                    key={tag.tag}
                    label={`#${tag.tag}`}
                    value={`${tag.postCount} ${tag.postCount === 1 ? 'post' : 'posts'}`}
                    share={maxTagCount > 0 ? tag.postCount / maxTagCount : 0}
                    tint={COLORS[index % COLORS.length]}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {!isLoading && stories.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={PANEL_CLASS}>
              <PanelHeading
                icon={Sparkles}
                title="Story performance"
                subtitle={`Your stories from the last ${range} days`}
                tint="secondary"
              />
              <div className="divide-y divide-gray-100 dark:divide-sun-border/20">
                {stories.map((story) => (
                  <div key={story.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-sun-text-main">
                        {story.caption?.trim() || (story.mediaType === 'video' ? 'Video story' : 'Photo story')}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">
                        {formatRelativeTime(story.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[11px] font-bold text-sun-text-main">
                      <span className="flex items-center gap-1" title="Viewers">
                        <Eye size={12} className="text-sun-text-muted" />
                        {story.viewCount}
                      </span>
                      <span className="flex items-center gap-1" title="Reactions">
                        <MessageSquare size={12} className="text-sun-text-muted" />
                        {story.reactionCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
