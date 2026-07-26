import { supabase } from './supabase';

export type FriendSuggestion = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  follows_you: boolean;
  you_follow: boolean;
};

export async function getFriendSuggestions(limit = 8): Promise<FriendSuggestion[]> {
  const { data, error } = await supabase.rpc('get_friend_suggestions', {
    result_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as FriendSuggestion[];
}

export async function followUser(userId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('You must be signed in.');

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: userId,
  });
  if (error && error.code !== '23505') throw error;
}

export async function unfollowUser(userId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('You must be signed in.');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', userId);
  if (error) throw error;
}

export async function areFriends(firstUserId: string, secondUserId: string) {
  const { data, error } = await supabase.rpc('are_friends', {
    first_user_id: firstUserId,
    second_user_id: secondUserId,
  });
  if (error) throw error;
  return !!data;
}
