import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Ban, CalendarDays, Camera, FileText, Flag, Image as ImageIcon, Loader2, MessageCircle, MoreHorizontal, Save, Settings, Sparkles, Users, VolumeX, X } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { BackButton } from '../../ui/BackButton';
import { LinkedText } from '../../ui/LinkedText';
import { supabase } from '../../../lib/supabase';
import { listConversations, startDirectConversation } from '../../../lib/messages';

type ProfileRecord = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_description: string | null;
  cover_position_x: number;
  cover_position_y: number;
  cover_zoom: number;
};

type PostRecord = {
  id: string;
  media_url: string | null;
  content: string;
  created_at: string;
};

type FollowListItem = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

interface ProfileViewProps {
  onSettingsClick?: () => void;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onSettingsClick, onBack }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [subView, setSubView] = useState<'main' | 'followers' | 'following'>('main');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [followers, setFollowers] = useState<FollowListItem[]>([]);
  const [following, setFollowing] = useState<FollowListItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsViewer, setFollowsViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [coverDescription, setCoverDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverSaving, setCoverSaving] = useState(false);
  const [coverPositionX, setCoverPositionX] = useState(50);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverStoryOpen, setCoverStoryOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');

  const isOwnProfile = id === 'me' || (!!profile && viewerId === profile.id);
  const isFriend = isFollowing && followsViewer;

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setNoticeMessage('');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('You must be signed in.');
      if (!id) throw new Error('Profile identifier is missing.');
      setViewerId(user.id);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const query = supabase.from('profiles').select(
        'id, username, full_name, bio, avatar_url, cover_url, cover_description, cover_position_x, cover_position_y, cover_zoom',
      );
      const result = id === 'me'
        ? await query.eq('id', user.id).single()
        : isUuid
          ? await query.eq('id', id).single()
          : await query.eq('username', id).single();
      if (result.error) throw result.error;
      const target = result.data as ProfileRecord;
      setProfile(target);
      setCoverDescription(target.cover_description || '');
      setCoverPositionX(Number(target.cover_position_x ?? 50));
      setCoverPositionY(Number(target.cover_position_y ?? 50));
      setCoverZoom(Number(target.cover_zoom ?? 1));

      const [postResult, followerResult, followingResult] = await Promise.all([
        supabase.from('posts').select('id, media_url, content, created_at').eq('user_id', target.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('follower_id').eq('following_id', target.id),
        supabase.from('follows').select('following_id').eq('follower_id', target.id),
      ]);
      if (postResult.error) throw postResult.error;
      if (followerResult.error) throw followerResult.error;
      if (followingResult.error) throw followingResult.error;
      setPosts(postResult.data || []);

      const followerIds = (followerResult.data || []).map((row) => row.follower_id);
      const followingIds = (followingResult.data || []).map((row) => row.following_id);
      const [followerProfiles, followingProfiles] = await Promise.all([
        followerIds.length
          ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', followerIds)
          : Promise.resolve({ data: [], error: null }),
        followingIds.length
          ? supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', followingIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (followerProfiles.error) throw followerProfiles.error;
      if (followingProfiles.error) throw followingProfiles.error;
      setFollowers((followerProfiles.data || []) as FollowListItem[]);
      setFollowing((followingProfiles.data || []) as FollowListItem[]);
      setIsFollowing(user.id !== target.id && followerIds.includes(user.id));
      setFollowsViewer(user.id !== target.id && followingIds.includes(user.id));
      if (user.id !== target.id) {
        const [blockResult, muteResult] = await Promise.all([
          supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', target.id).maybeSingle(),
          supabase.from('user_mutes').select('muted_id').eq('muter_id', user.id).eq('muted_id', target.id).maybeSingle(),
        ]);
        if (blockResult.error) throw blockResult.error;
        if (muteResult.error) throw muteResult.error;
        setIsBlocked(!!blockResult.data);
        setIsMuted(!!muteResult.data);
      } else {
        setIsBlocked(false);
        setIsMuted(false);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  // setPhotoOpen(false) on the way in: without it, opening the photo and then
  // navigating to another member left the previous person's picture on screen.
  useEffect(() => { setPhotoOpen(false); void loadProfileData(); }, [id]);
  useEffect(() => {
    if (!photoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPhotoOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [photoOpen]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const handleBack = () => {
    if (subView !== 'main') setSubView('main');
    else onBack?.();
  };

  const handleFollowToggle = async () => {
    if (!viewerId || !profile || isOwnProfile || followLoading) return;
    try {
      setFollowLoading(true);
      setErrorMessage('');
      if (isFollowing) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', viewerId).eq('following_id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: viewerId,
          following_id: profile.id,
        });
        if (error && error.code !== '23505') throw error;
      }
      await loadProfileData();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update follow state.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile || messageLoading) return;
    try {
      setMessageLoading(true);
      setErrorMessage('');
      if (isBlocked) {
        setErrorMessage('Unblock this user before opening the conversation.');
        return;
      }
      const existing = (await listConversations()).find(
        (conversation) => conversation.otherUserId === profile.id,
      );
      if (existing) {
        navigate(`/messages?conversation=${existing.conversationId}`);
        return;
      }
      if (!isFollowing) {
        setErrorMessage('Follow to start a conversation');
        return;
      }
      if (!followsViewer) {
        setErrorMessage('You can start a conversation when this user follows you back.');
        return;
      }
      const conversationId = await startDirectConversation(profile.id);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to open this conversation.');
    } finally {
      setMessageLoading(false);
    }
  };

  const openCoverEditor = () => {
    setCoverDescription(profile?.cover_description || '');
    setCoverPositionX(Number(profile?.cover_position_x ?? 50));
    setCoverPositionY(Number(profile?.cover_position_y ?? 50));
    setCoverZoom(Number(profile?.cover_zoom ?? 1));
    setCoverFile(null);
    setCoverPreview('');
    setCoverEditorOpen(true);
  };

  const handleCoverFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file for your cover.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Cover images must be smaller than 8 MB.');
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCoverSave = async () => {
    if (!profile || !isOwnProfile || coverSaving) return;
    try {
      setCoverSaving(true);
      setErrorMessage('');
      let coverUrl = profile.cover_url;
      if (coverFile) {
        const extension = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${profile.id}/cover-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(
          filePath,
          coverFile,
          { upsert: true, contentType: coverFile.type },
        );
        if (uploadError) throw uploadError;
        coverUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
      }
      const description = coverDescription.trim() || null;
      const { error } = await supabase.from('profiles').update({
        cover_url: coverUrl,
        cover_description: description,
        cover_position_x: coverPositionX,
        cover_position_y: coverPositionY,
        cover_zoom: coverZoom,
      }).eq('id', profile.id);
      if (error) throw error;
      setProfile({
        ...profile,
        cover_url: coverUrl,
        cover_description: description,
        cover_position_x: coverPositionX,
        cover_position_y: coverPositionY,
        cover_zoom: coverZoom,
      });
      setCoverEditorOpen(false);
      setCoverFile(null);
      setCoverPreview('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update your cover.');
    } finally {
      setCoverSaving(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!profile || moderationLoading) return;
    try {
      setModerationLoading(true);
      setErrorMessage('');
      const { error } = await supabase.rpc('set_user_block', {
        target_user_id: profile.id,
        should_block: !isBlocked,
      });
      if (error) throw error;
      setIsBlocked(!isBlocked);
      setNoticeMessage(isBlocked ? 'User unblocked.' : 'User blocked.');
      setOptionsOpen(false);
      if (!isBlocked) {
        setIsFollowing(false);
        setFollowsViewer(false);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update block status.');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!viewerId || !profile || moderationLoading) return;
    try {
      setModerationLoading(true);
      setErrorMessage('');
      const request = isMuted
        ? supabase.from('user_mutes').delete().eq('muter_id', viewerId).eq('muted_id', profile.id)
        : supabase.from('user_mutes').insert({ muter_id: viewerId, muted_id: profile.id });
      const { error } = await request;
      if (error && error.code !== '23505') throw error;
      setIsMuted(!isMuted);
      setNoticeMessage(isMuted ? 'User unmuted.' : 'User muted. Their posts will no longer appear in your feed.');
      setOptionsOpen(false);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to update mute status.');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!viewerId || !profile || moderationLoading) return;
    try {
      setModerationLoading(true);
      setErrorMessage('');
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: viewerId,
        reported_id: profile.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      if (error) throw error;
      setReportOpen(false);
      setReportDetails('');
      setOptionsOpen(false);
      setNoticeMessage('Report submitted. The Korusa safety team will review it.');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to submit this report.');
    } finally {
      setModerationLoading(false);
    }
  };

  const renderUserList = (items: FollowListItem[], emptyLabel: string) =>
    items.length === 0 ? (
      <div className="surface-card py-12 text-center text-sm text-sun-text-muted">{emptyLabel}</div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((user) => (
          <button key={user.id} type="button" onClick={() => navigate(`/profile/${user.username || user.id}`)} className="interactive-card flex items-center gap-3 p-4 text-left">
            <Avatar size="lg" src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`} name={user.full_name || user.username || 'Member'} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{user.full_name || user.username || 'Korusa member'}</h3>
              <p className="truncate text-xs text-sun-text-muted">@{user.username || 'member'}</p>
            </div>
            <ArrowRight size={17} className="text-sun-text-muted" />
          </button>
        ))}
      </div>
    );

  if (loading && !profile) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sun-text-muted"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {(onBack || subView !== 'main') && <BackButton onClick={handleBack} label={subView === 'main' ? 'Back' : 'Profile'} sticky />}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-600">{errorMessage}</div>}
      {noticeMessage && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-700 dark:text-emerald-300">{noticeMessage}</div>}
      <AnimatePresence mode="wait">
        {subView === 'main' ? (
          <motion.div key="profile-main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
            <section className="overflow-hidden rounded-[2rem] border border-sun-border bg-sun-surface shadow-sm">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setCoverStoryOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setCoverStoryOpen(true);
                }}
                className="relative aspect-[16/7] cursor-pointer overflow-hidden bg-gradient-to-br from-[#24104f] via-sun-primary to-sun-secondary sm:aspect-[820/312]"
                aria-label="View cover photo and description"
              >
                {(coverPreview || profile?.cover_url) ? (
                  <img
                    src={coverPreview || profile?.cover_url || ''}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300"
                    style={{
                      objectPosition: `${profile?.cover_position_x ?? 50}% ${profile?.cover_position_y ?? 50}%`,
                      transform: `scale(${profile?.cover_zoom ?? 1})`,
                    }}
                  />
                ) : (
                  <>
                    <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:32px_32px]" />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 sm:bottom-5 sm:left-6 sm:right-6">
                  <p className="line-clamp-1 max-w-xl text-xs font-medium text-white/90 sm:text-sm">
                    {profile?.cover_description || 'Tap to view cover'}
                  </p>
                  <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                    View cover
                  </span>
                </div>
                {isOwnProfile && (
                  <button type="button" onClick={(event) => { event.stopPropagation(); openCoverEditor(); }} className="absolute right-4 top-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/35 px-3 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/55">
                    <Camera size={16} />Edit cover
                  </button>
                )}
              </div>

              <div className="px-5 pb-6 sm:px-8 sm:pb-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="-mt-12 flex min-w-0 flex-col items-center gap-4 sm:-mt-16 sm:flex-row sm:items-end">
                    {/* The photo is the control, not decoration: it was a plain div,
                        so tapping it did nothing while the cover directly above it
                        opened. With no photo set it sends the owner to settings to add
                        one rather than opening an empty viewer. */}
                    <button
                      type="button"
                      onClick={() => {
                        if (profile?.avatar_url) setPhotoOpen(true);
                        else if (isOwnProfile) onSettingsClick?.();
                      }}
                      disabled={!profile?.avatar_url && !isOwnProfile}
                      aria-label={profile?.avatar_url ? 'View profile photo' : isOwnProfile ? 'Add a profile photo' : 'No profile photo'}
                      className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.65rem] border-4 border-sun-surface bg-sun-surface shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/25 active:scale-[0.98] disabled:active:scale-100 sm:h-32 sm:w-32 sm:rounded-[2rem]"
                    >
                      {profile?.avatar_url ? (
                        <>
                          <img src={profile.avatar_url} alt={profile.full_name || profile.username || 'Profile'} className="h-full w-full object-cover" />
                          <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                            <ImageIcon size={22} />
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-sun-primary/10 font-display text-2xl font-semibold text-sun-primary">
                          {(profile?.full_name || profile?.username || 'K').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0 pb-1 text-center sm:text-left">
                      <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">{profile?.full_name || profile?.username || 'Korusa member'}</h1>
                      <p className="mt-1 text-sm font-medium text-sun-primary">@{profile?.username || 'member'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                    {isOwnProfile ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={onSettingsClick}>Edit profile</Button>
                        <Button size="sm" variant="secondary" className="w-10 p-0" onClick={onSettingsClick} title="Profile settings"><Settings size={17} /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant={isFollowing ? 'secondary' : 'primary'} onClick={handleFollowToggle} disabled={followLoading || isBlocked}>
                          {isBlocked ? 'Blocked' : followLoading ? 'Working…' : isFollowing ? 'Unfollow' : followsViewer ? 'Follow back' : 'Follow'}
                        </Button>
                        <Button size="sm" variant="secondary" className="w-10 p-0" onClick={handleMessage} disabled={messageLoading} title={isBlocked ? 'Unblock to message' : isFriend ? 'Message' : 'Follow to start a conversation'}>
                          {messageLoading ? <Loader2 size={17} className="animate-spin" /> : <MessageCircle size={17} />}
                        </Button>
                        <div className="relative">
                          <Button size="sm" variant="secondary" className="w-10 p-0" onClick={() => setOptionsOpen(!optionsOpen)} title="Profile options">
                            <MoreHorizontal size={18} />
                          </Button>
                          {optionsOpen && (
                            <div className="absolute right-0 top-12 z-40 w-52 overflow-hidden rounded-2xl border border-sun-border bg-sun-surface p-1.5 shadow-xl">
                              <button type="button" onClick={() => void handleMuteToggle()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sun-surface-light">
                                <VolumeX size={17} />{isMuted ? 'Unmute user' : 'Mute user'}
                              </button>
                              <button type="button" onClick={() => { setReportOpen(true); setOptionsOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sun-surface-light">
                                <Flag size={17} />Report user
                              </button>
                              <button type="button" onClick={() => void handleBlockToggle()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-500/8">
                                <Ban size={17} />{isBlocked ? 'Unblock user' : 'Block user'}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-5 border-t border-sun-border pt-6 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    {/* whitespace-pre-line: the bio is written in a textarea, so a
                        link put on its own line should stay on its own line instead
                        of being folded into the sentence above it. */}
                    <p className="max-w-2xl whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-sun-text-main">
                      {profile?.bio
                        ? <LinkedText text={profile.bio} />
                        : isOwnProfile
                          ? 'Add a bio to introduce your work and interests. Any link you write there becomes tappable.'
                          : 'This member has not added a bio yet.'}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-primary/8 px-3 py-1.5 text-xs font-semibold text-sun-primary"><Sparkles size={14} />Korusa member</div>
                  </div>
                  <div className="flex items-center justify-center divide-x divide-sun-border rounded-2xl border border-sun-border bg-sun-surface-light">
                    <div className="px-4 py-3 text-center sm:px-5"><p className="font-display text-xl font-semibold">{posts.length}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-sun-text-muted">Posts</p></div>
                    <button type="button" onClick={() => setSubView('followers')} className="px-4 py-3 text-center hover:text-sun-primary sm:px-5"><p className="font-display text-xl font-semibold">{followers.length}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-sun-text-muted">Followers</p></button>
                    <button type="button" onClick={() => setSubView('following')} className="px-4 py-3 text-center hover:text-sun-primary sm:px-5"><p className="font-display text-xl font-semibold">{following.length}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-sun-text-muted">Following</p></button>
                  </div>
                </div>
              </div>
            </section>
            <section aria-labelledby="profile-posts-heading">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 id="profile-posts-heading" className="section-title">Posts</h2>
                  <p className="section-description mt-1">Updates, photos, and moments shared with the community.</p>
                </div>
                {isOwnProfile && <Button size="sm" onClick={() => navigate('/create')}>Create post</Button>}
              </div>

              {posts.length === 0 ? (
                <div className="surface-card flex flex-col items-center py-14 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-primary/10 text-sun-primary"><Sparkles size={24} /></div>
                  <h3 className="mt-4 text-base font-semibold">No posts yet</h3>
                  <p className="mt-1 max-w-sm text-sm text-sun-text-muted">{isOwnProfile ? 'Share your first update, photo, or moment.' : 'This member has not shared a post yet.'}</p>
                </div>
              ) : (
                <div className="relative space-y-5 before:absolute before:bottom-8 before:left-[19px] before:top-8 before:w-px before:bg-gradient-to-b before:from-sun-primary before:via-sun-border before:to-transparent sm:before:left-[27px]">
                  {posts.map((post, index) => (
                    <motion.article key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-5">
                      <div className="relative z-10 mt-5 flex h-10 w-10 items-center justify-center rounded-2xl border border-sun-primary/20 bg-sun-surface text-xs font-bold text-sun-primary shadow-sm sm:h-14 sm:w-14">
                        {String(posts.length - index).padStart(2, '0')}
                      </div>
                      <button type="button" onClick={() => setSelectedPost(post)} className="interactive-card w-full overflow-hidden text-left">
                        <div className="flex items-center justify-between border-b border-sun-border px-4 py-3 sm:px-5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-sun-text-muted"><CalendarDays size={14} className="text-sun-primary" />{formatPostDate(post.created_at)}</div>
                          <span className="rounded-full bg-sun-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sun-primary">Post</span>
                        </div>
                        <div className={`grid ${post.media_url ? 'md:grid-cols-[minmax(0,1fr)_240px]' : ''}`}>
                          <div className="p-4 sm:p-6">
                            <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-7 text-sun-text-main sm:text-[15px]">{post.content || 'A photo shared with the Korusa community.'}</p>
                            <div className="mt-5 flex items-center gap-2 text-[11px] font-medium text-sun-text-muted">{post.media_url ? <ImageIcon size={14} /> : <FileText size={14} />}{post.media_url ? 'Photo post' : 'Text post'}</div>
                          </div>
                          {post.media_url && (
                            <div className="h-52 overflow-hidden border-t border-sun-border bg-black md:h-full md:min-h-56 md:border-l md:border-t-0">
                              <img src={post.media_url} alt="" className="h-full w-full object-contain" />
                            </div>
                          )}
                        </div>
                      </button>
                    </motion.article>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        ) : (
          <motion.section key={subView} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-primary/10 text-sun-primary"><Users size={20} /></div>
              <div>
                <h2 className="section-title">{subView === 'followers' ? 'Followers' : 'Following'}</h2>
                <p className="section-description">{subView === 'followers' ? 'People connected to this member.' : 'People this member follows.'}</p>
              </div>
            </div>
            {renderUserList(subView === 'followers' ? followers : following, subView === 'followers' ? 'No followers yet.' : 'Not following anyone yet.')}
          </motion.section>
        )}
      </AnimatePresence>

      {coverStoryOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section className="w-full max-w-5xl overflow-hidden rounded-3xl bg-black shadow-2xl" role="dialog" aria-modal="true" aria-label="Cover photo">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
              <div>
                <p className="text-sm font-semibold">{profile?.full_name || profile?.username || 'Korusa member'}</p>
                <p className="text-xs text-white/60">Cover photo</p>
              </div>
              <button type="button" onClick={() => setCoverStoryOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close cover"><X size={19} /></button>
            </div>
            <div className="relative aspect-[16/7] overflow-hidden sm:aspect-[820/312]">
              {profile?.cover_url ? (
                <img
                  src={profile.cover_url}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${profile.cover_position_x ?? 50}% ${profile.cover_position_y ?? 50}%`,
                    transform: `scale(${profile.cover_zoom ?? 1})`,
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#24104f] via-sun-primary to-sun-secondary" />
              )}
            </div>
            <div className="bg-sun-surface p-5 text-sun-text-main">
              <h3 className="text-sm font-semibold">About this cover</h3>
              <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-sun-text-muted">
                {profile?.cover_description || 'No cover description has been added.'}
              </p>
            </div>
          </section>
        </div>
      )}

      {photoOpen && profile?.avatar_url && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo"
          onClick={() => setPhotoOpen(false)}
        >
          {/* stopPropagation so only the backdrop closes it - tapping the picture
              itself on a phone should not dismiss what you just opened. */}
          <section
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile.full_name || profile.username || 'Korusa member'}</p>
                <p className="text-xs text-white/60">Profile photo</p>
              </div>
              <button type="button" onClick={() => setPhotoOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photo"><X size={19} /></button>
            </div>
            {/* object-contain and a dvh cap: the header crops this picture to a
                square, and the point of opening it is to see the whole thing. */}
            <img
              src={profile.avatar_url}
              alt={profile.full_name || profile.username || 'Profile photo'}
              className="max-h-[70dvh] w-full bg-black object-contain"
            />
            {isOwnProfile && (
              <div className="bg-sun-surface p-4">
                <Button size="sm" variant="secondary" onClick={() => { setPhotoOpen(false); onSettingsClick?.(); }} icon={<Camera size={16} />}>Change photo</Button>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-sun-border bg-sun-surface shadow-2xl" role="dialog" aria-modal="true" aria-label="Profile post">
            <header className="flex items-center justify-between border-b border-sun-border p-4">
              <div className="flex items-center gap-3">
                <Avatar size="md" src={profile?.avatar_url || undefined} name={profile?.full_name || profile?.username || 'Member'} />
                <div><p className="text-sm font-semibold">{profile?.full_name || profile?.username}</p><p className="text-xs text-sun-text-muted">{formatPostDate(selectedPost.created_at)}</p></div>
              </div>
              <button type="button" onClick={() => setSelectedPost(null)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Close post"><X size={19} /></button>
            </header>
            {selectedPost.media_url && (
              <div className="flex max-h-[65vh] min-h-64 items-center justify-center bg-black">
                <img src={selectedPost.media_url} alt="" className="max-h-[65vh] w-full object-contain" />
              </div>
            )}
            <div className="p-4 sm:p-6">
              <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-7 text-sun-text-main">{selectedPost.content || 'Photo shared with the Korusa community.'}</p>
            </div>
          </section>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-3xl border border-sun-border bg-sun-surface p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="report-user-title">
            <div className="flex items-center justify-between">
              <div><h2 id="report-user-title" className="font-display text-xl font-semibold">Report user</h2><p className="text-xs text-sun-text-muted">Reports are sent privately to Korusa safety.</p></div>
              <button type="button" onClick={() => setReportOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="report-reason" className="mb-1.5 block text-xs font-semibold">Reason</label>
                <select id="report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="h-11 w-full rounded-xl border border-sun-border bg-sun-surface-light px-3 text-sm outline-none focus:border-sun-primary">
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="unsafe">Unsafe content or behavior</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="report-details" className="mb-1.5 block text-xs font-semibold">Details (optional)</label>
                <textarea id="report-details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Tell us what happened…" className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light p-3 text-sm outline-none focus:border-sun-primary" />
              </div>
              <Button className="w-full" variant="danger" onClick={() => void handleReportSubmit()} disabled={moderationLoading}>
                {moderationLoading ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </section>
        </div>
      )}

      {coverEditorOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-sun-border bg-sun-surface shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="cover-editor-title">
            <header className="flex shrink-0 items-center justify-between border-b border-sun-border p-5">
              <div><h2 id="cover-editor-title" className="font-display text-xl font-semibold">Cover story</h2><p className="text-xs text-sun-text-muted">Add an image and a short description.</p></div>
              <button type="button" onClick={() => setCoverEditorOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Close"><X size={18} /></button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <button type="button" onClick={() => coverInputRef.current?.click()} className="group relative flex aspect-[820/312] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-sun-primary/35 bg-sun-primary/5">
                {(coverPreview || profile?.cover_url) ? (
                  <>
                    <img
                      src={coverPreview || profile?.cover_url || ''}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${coverPositionX}% ${coverPositionY}%`,
                        transform: `scale(${coverZoom})`,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">Choose another image</span>
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-semibold text-sun-primary"><Camera size={18} />Choose cover image</span>
                )}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
              {(coverPreview || profile?.cover_url) && (
                <div className="space-y-3 rounded-2xl border border-sun-border bg-sun-surface-light p-4">
                  <p className="text-xs font-semibold">Adjust crop</p>
                  <label className="block text-[11px] text-sun-text-muted">
                    Horizontal position
                    <input type="range" min="0" max="100" value={coverPositionX} onChange={(event) => setCoverPositionX(Number(event.target.value))} className="mt-1 w-full accent-sun-primary" />
                  </label>
                  <label className="block text-[11px] text-sun-text-muted">
                    Vertical position
                    <input type="range" min="0" max="100" value={coverPositionY} onChange={(event) => setCoverPositionY(Number(event.target.value))} className="mt-1 w-full accent-sun-primary" />
                  </label>
                  <label className="block text-[11px] text-sun-text-muted">
                    Zoom ({coverZoom.toFixed(2)}x)
                    <input type="range" min="1" max="3" step="0.05" value={coverZoom} onChange={(event) => setCoverZoom(Number(event.target.value))} className="mt-1 w-full accent-sun-primary" />
                  </label>
                </div>
              )}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="cover-description" className="text-xs font-semibold">Cover description</label>
                  <span className="text-[10px] text-sun-text-muted">{coverDescription.length}/240</span>
                </div>
                <textarea id="cover-description" value={coverDescription} onChange={(event) => setCoverDescription(event.target.value)} maxLength={240} rows={4} placeholder="What does this cover represent?" className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light p-3 text-sm outline-none focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10" />
              </div>
            </div>
            <footer className="shrink-0 border-t border-sun-border bg-sun-surface p-4 sm:p-5">
              <Button className="w-full" onClick={() => void handleCoverSave()} disabled={coverSaving} icon={coverSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}>
                {coverSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

function formatPostDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
