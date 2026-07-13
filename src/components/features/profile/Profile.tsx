import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Settings,
  Grid,
  Bookmark,
  MapPin,
  Link as LinkIcon,
  Award,
  MoreVertical,
  Lock,
  Play,
  Heart,
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { BlockUserModal, ReportModal } from '../../shared/Modals';
import { BackButton } from '../../ui/BackButton';
import { supabase } from '../../../lib/supabase';

type ProfileRecord = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
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

export const ProfileView = ({
  onSettingsClick,
  onBack,
}: {
  onSettingsClick?: () => void;
  onBack?: () => void;
}) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [subView, setSubView] = useState<'main' | 'followers' | 'following'>('main');

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [followers, setFollowers] = useState<FollowListItem[]>([]);
  const [following, setFollowing] = useState<FollowListItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isOwnProfile = id === 'me' || (!!profile && viewerId === profile.id);

  const handleBack = () => {
    if (subView !== 'main') {
      setSubView('main');
    } else if (onBack) {
      onBack();
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('You must be signed in.');

      setViewerId(user.id);

      let targetProfile: ProfileRecord | null = null;

      if (id === 'me') {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  targetProfile = data;
} else {
  if (!id) {
    throw new Error('Profile identifier is missing.');
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const profileQuery = supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url');

  const { data, error } = isUuid
    ? await profileQuery.eq('id', id).single()
    : await profileQuery.eq('username', id).single();

  if (error) throw error;
  targetProfile = data;
}

      setProfile(targetProfile);

      const targetProfileId = targetProfile.id;

      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, media_url, content, created_at')
        .eq('user_id', targetProfileId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(userPosts || []);

      const { data: followerRows, error: followersError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetProfileId);

      if (followersError) throw followersError;

      const { data: followingRows, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', targetProfileId);

      if (followingError) throw followingError;

      const followerIds = (followerRows || []).map((row) => row.follower_id);
      const followingIds = (followingRows || []).map((row) => row.following_id);

      if (followerIds.length > 0) {
        const { data: followerProfiles, error: followerProfilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followerIds);

        if (followerProfilesError) throw followerProfilesError;
        setFollowers(followerProfiles || []);
      } else {
        setFollowers([]);
      }

      if (followingIds.length > 0) {
        const { data: followingProfiles, error: followingProfilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followingIds);

        if (followingProfilesError) throw followingProfilesError;
        setFollowing(followingProfiles || []);
      } else {
        setFollowing([]);
      }

      if (user.id !== targetProfileId) {
        const { data: relationship, error: relationshipError } = await supabase
          .from('follows')
          .select('follower_id, following_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetProfileId)
          .maybeSingle();

        if (relationshipError) throw relationshipError;
        setIsFollowing(!!relationship);
      } else {
        setIsFollowing(false);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [id]);

  const handleFollowToggle = async () => {
    if (!viewerId || !profile || isOwnProfile) return;

    try {
      setFollowLoading(true);
      setErrorMessage('');

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', viewerId)
          .eq('following_id', profile.id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: viewerId,
          following_id: profile.id,
        });

        if (error) throw error;
        setIsFollowing(true);
      }

      await loadProfileData();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update follow state.');
    } finally {
      setFollowLoading(false);
    }
  };

  const renderUserList = (items: FollowListItem[], emptyLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="text-sm text-sun-text-muted py-8 text-center">
          {emptyLabel}
        </div>
      );
    }

    return (
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
        {items.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center justify-between p-4 rounded-3xl bg-sun-surface-light border border-sun-border/30 hover:border-sun-primary/30 transition-all hover:bg-sun-surface duration-300"
          >
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => navigate(`/profile/${user.username || user.id}`)}
            >
              <div className="relative">
                <Avatar
                  size="md"
                  src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`}
                  className="ring-2 ring-sun-border group-hover:ring-sun-primary/50 transition-all"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-sun-text-main group-hover:text-sun-primary transition-colors">
                  {user.full_name || user.username || 'Unknown User'}
                </h4>
                <p className="text-[9px] text-sun-text-muted font-bold lowercase opacity-60">
                  @{user.username || 'unknown'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {(onBack || subView !== 'main') && (
        <div className="mb-4">
          <BackButton
            onClick={handleBack}
            label={subView === 'main' ? 'Back' : 'Profile'}
            sticky={true}
          />
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <AnimatePresence mode="wait">
        {subView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <BlockUserModal
              isOpen={isBlockModalOpen}
              onClose={() => setIsBlockModalOpen(false)}
              userName={profile?.username || 'user'}
            />
            <ReportModal
              isOpen={isReportModalOpen}
              onClose={() => setIsReportModalOpen(false)}
              targetType="user"
            />

            <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-[2.5rem] p-1 bg-gradient-to-tr from-sun-primary to-transparent border border-white/10 shadow-2xl">
                  <Avatar
                    size="full"
                    src={profile?.avatar_url || 'https://i.pravatar.cc/400?u=me'}
                    className="!rounded-[2.2rem]"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-sun-primary text-black p-2 rounded-2xl shadow-xl shadow-sun-primary/20 border-4 border-sun-bg">
                  <Award size={18} className="fill-current" />
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-center md:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">
                    {profile?.username || 'profile'}
                  </h1>
                  <div className="flex gap-2 justify-center">
                    {isOwnProfile ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="!rounded-xl px-6"
                          onClick={onSettingsClick}
                        >
                          Edit Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="!rounded-xl w-10 p-0 bg-sun-text-main/5 hover:bg-sun-primary hover:text-black transition-all"
                          onClick={onSettingsClick}
                          title="Profile Settings"
                        >
                          <Settings size={18} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant={isFollowing ? 'secondary' : 'primary'}
                          className="!rounded-xl px-6"
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                        >
                          {followLoading
                            ? 'Working...'
                            : isFollowing
                            ? 'Following'
                            : 'Follow'}
                        </Button>

                        <div className="relative group">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="!rounded-xl w-10 p-0 bg-sun-text-main/5 hover:bg-sun-text-main/10 transition-all"
                            title="More Options"
                          >
                            <MoreVertical size={18} />
                          </Button>
                          <div className="absolute right-0 top-full mt-2 w-48 bg-sun-bg border border-sun-border rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <button
                              onClick={() => setIsReportModalOpen(true)}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-sun-text-main hover:bg-white/5 transition-colors"
                            >
                              Report User
                            </button>
                            <button
                              onClick={() => setIsBlockModalOpen(true)}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/5 transition-colors"
                            >
                              Block User
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-8 sm:gap-12">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xl font-display font-bold">{posts.length}</span>
                    <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">
                      Posts
                    </span>
                  </div>
                  <div
                    onClick={() => setSubView('followers')}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className="text-xl font-display font-bold">{followers.length}</span>
                    <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">
                      Followers
                    </span>
                  </div>
                  <div
                    onClick={() => setSubView('following')}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className="text-xl font-display font-bold">{following.length}</span>
                    <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">
                      Following
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold">{profile?.full_name || 'Unnamed User'}</h2>
                    <p className="text-xs text-sun-text-muted uppercase tracking-widest font-black">
                      Community Member
                    </p>
                  </div>
                  <p className="text-sm text-sun-text-main leading-relaxed max-w-md font-medium">
                    {profile?.bio || 'No bio yet.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sun-text-muted">
                      <MapPin size={14} className="text-sun-primary" />
                      Unspecified
                    </div>
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sun-primary">
                      <LinkIcon size={14} />
                      @{profile?.username || 'profile'}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="border-t border-sun-border pt-0 flex justify-center gap-8 sm:gap-16">
              {[
                { id: 'posts', icon: Grid, label: 'Posts' },
                { id: 'saved', icon: Bookmark, label: 'Saved' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'posts' | 'saved')}
                  className={`flex items-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative transition-colors ${
                    activeTab === tab.id
                      ? 'text-sun-text-main'
                      : 'text-sun-text-muted hover:text-sun-text-main/70'
                  }`}
                >
                  <tab.icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profile-tab"
                      className="absolute top-0 left-0 right-0 h-0.5 bg-sun-text-main rounded-b-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-sm text-sun-text-muted">Loading posts...</div>
            ) : activeTab === 'posts' ? (
              <div className="grid grid-cols-3 gap-1 sm:gap-8">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative aspect-square rounded-[1rem] sm:rounded-[2rem] overflow-hidden group border border-white/5 bg-sun-surface"
                  >
                    {post.media_url ? (
                      <img
                        src={post.media_url}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt="Post Media"
                      />
                    ) : (
                      <div className="w-full h-full p-4 flex items-center justify-center text-center text-xs text-sun-text-main leading-relaxed">
                        {post.content}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2 text-white font-bold">
                        {post.media_url ? (
                          <Play size={20} className="fill-current" />
                        ) : (
                          <Heart size={20} className="fill-current" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-sun-surface border border-sun-border rounded-[2rem] flex items-center justify-center mx-auto text-sun-text-muted/20">
                  <Lock size={40} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Private Collection</h3>
                  <p className="text-[10px] text-sun-text-muted font-medium max-w-[200px] mx-auto">
                    Only you can see your saved posts.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {subView === 'followers' && (
          <motion.div
            key="followers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold">Followers</h2>
              <p className="text-sm text-sun-text-muted">Users following this profile.</p>
            </div>
            {renderUserList(followers, 'No followers yet.')}
          </motion.div>
        )}

        {subView === 'following' && (
          <motion.div
            key="following"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold">Following</h2>
              <p className="text-sm text-sun-text-muted">Users this profile follows.</p>
            </div>
            {renderUserList(following, 'Not following anyone yet.')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};