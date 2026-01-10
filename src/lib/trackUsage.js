import { supabase } from './supabase';

export const trackUsage = async (actionType, metadata = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : 'guest';

    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: userId,
        action_type: actionType,
        metadata: metadata
      }]);

    if (error) {
      console.error('Error tracking usage:', error);
    }
  } catch (err) {
    console.error('Failed to track usage:', err);
  }
};