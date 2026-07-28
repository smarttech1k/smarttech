import { supabase } from './supabase';

export type MessagingAiAction =
  | 'rewrite'
  | 'fix_grammar'
  | 'translate'
  | 'change_tone'
  | 'summarize'
  | 'suggest_replies'
  | 'hashtags'
  | 'caption'
  | 'explain'
  | 'search';

export async function runMessagingAi(
  action: MessagingAiAction,
  input: string,
  options: { tone?: string; language?: string; context?: string } = {},
) {
  const { data, error } = await supabase.functions.invoke('korusa-ai', {
    body: { action, input, ...options },
  });
  if (error) throw new Error(error.message || 'Korusa AI is unavailable.');
  if (!data?.output) throw new Error('Korusa AI returned an empty response.');
  return String(data.output);
}
