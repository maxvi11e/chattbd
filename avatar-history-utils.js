/**
 * Avatar Image History Utilities
 * Helper functions for managing avatar image versions
 */

const AvatarHistory = {
  /**
   * Add a new image to the avatar's history
   * @param {object} supabase - Supabase client instance
   * @param {string} avatarId - Avatar UUID
   * @param {string} imageUrl - URL of the new image
   * @param {string} createdFrom - Source: 'initial', 'regenerate', 'edit', 'restore'
   * @param {string} editPrompt - Optional prompt used for generation
   * @param {object} traitsSnapshot - Optional snapshot of traits at creation
   * @param {string} videoUrl - Optional video animation URL
   * @returns {Promise<{success: boolean, historyId: string|null, error: any}>}
   */
  async addToHistory(supabase, avatarId, imageUrl, createdFrom = 'initial', editPrompt = null, traitsSnapshot = null, videoUrl = null) {
    try {
      const { data, error } = await supabase.rpc('add_avatar_image_to_history', {
        p_avatar_id: avatarId,
        p_image_url: imageUrl,
        p_created_from: createdFrom,
        p_edit_prompt: editPrompt,
        p_traits_snapshot: traitsSnapshot,
        p_video_url: videoUrl
      });

      if (error) throw error;

      return { success: true, historyId: data, error: null };
    } catch (error) {
      console.error('Error adding to avatar history:', error);
      return { success: false, historyId: null, error };
    }
  },

  /**
   * Get the image history for an avatar
   * @param {object} supabase - Supabase client instance
   * @param {string} avatarId - Avatar UUID
   * @param {number} limit - Maximum number of versions to return (default: 20)
   * @returns {Promise<{success: boolean, history: Array|null, error: any}>}
   */
  async getHistory(supabase, avatarId, limit = 20) {
    try {
      const { data, error } = await supabase.rpc('get_avatar_image_history', {
        p_avatar_id: avatarId,
        p_limit: limit
      });

      if (error) throw error;

      return { success: true, history: data || [], error: null };
    } catch (error) {
      console.error('Error fetching avatar history:', error);
      return { success: false, history: null, error };
    }
  },

  /**
   * Restore a previous image version
   * @param {object} supabase - Supabase client instance
   * @param {string} avatarId - Avatar UUID
   * @param {string} historyId - History entry UUID to restore
   * @returns {Promise<{success: boolean, error: any}>}
   */
  async restoreVersion(supabase, avatarId, historyId) {
    try {
      const { data, error } = await supabase.rpc('restore_avatar_image_version', {
        p_avatar_id: avatarId,
        p_history_id: historyId
      });

      if (error) throw error;

      return { success: data === true, error: null };
    } catch (error) {
      console.error('Error restoring avatar version:', error);
      return { success: false, error };
    }
  },

  /**
   * Get the current version for an avatar
   * @param {object} supabase - Supabase client instance
   * @param {string} avatarId - Avatar UUID
   * @returns {Promise<{success: boolean, currentVersion: object|null, error: any}>}
   */
  async getCurrentVersion(supabase, avatarId) {
    try {
      const { data, error } = await supabase
        .from('avatar_image_history')
        .select('*')
        .eq('avatar_id', avatarId)
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      return { success: true, currentVersion: data, error: null };
    } catch (error) {
      console.error('Error fetching current version:', error);
      return { success: false, currentVersion: null, error };
    }
  },

  /**
   * Delete old history entries (keep only most recent N versions)
   * @param {object} supabase - Supabase client instance
   * @param {string} avatarId - Avatar UUID
   * @param {number} keepCount - Number of most recent versions to keep
   * @returns {Promise<{success: boolean, deletedCount: number, error: any}>}
   */
  async pruneHistory(supabase, avatarId, keepCount = 20) {
    try {
      // Get all versions ordered by version number descending
      const { data: allVersions, error: fetchError } = await supabase
        .from('avatar_image_history')
        .select('id, version_number')
        .eq('avatar_id', avatarId)
        .order('version_number', { ascending: false });

      if (fetchError) throw fetchError;

      if (!allVersions || allVersions.length <= keepCount) {
        return { success: true, deletedCount: 0, error: null };
      }

      // Get IDs of versions to delete (those beyond keepCount)
      const idsToDelete = allVersions.slice(keepCount).map(v => v.id);

      const { error: deleteError } = await supabase
        .from('avatar_image_history')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      return { success: true, deletedCount: idsToDelete.length, error: null };
    } catch (error) {
      console.error('Error pruning avatar history:', error);
      return { success: false, deletedCount: 0, error };
    }
  }
};

// Export for use in browser and Node.js
if (typeof window !== 'undefined') {
  window.AvatarHistory = AvatarHistory;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvatarHistory;
}
