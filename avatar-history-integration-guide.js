/**
 * Example Integration Guide for Avatar Image History
 * 
 * This file shows how to integrate the avatar history feature into your existing pages.
 */

// ============================================================================
// 1. EDIT.HTML - When regenerating or editing an avatar
// ============================================================================

// In the regenerateBot() function, after successfully generating a new image:
async function regenerateBot() {
  // ... existing regeneration code ...
  
  const result = await response.json();
  
  if (response.ok && result.dataUrl) {
    // Upload the new image
    const url = await uploadAvatarImage({
      dataUrl: result.dataUrl,
      userId: user.id,
      fileName: `${currentBot.name}-edit.png`
    });
    
    // Add to history BEFORE updating the main avatar record
    await AvatarHistory.addToHistory(
      supabase,
      currentBot.id,
      url,
      'regenerate', // or 'edit'
      editPrompt.value.trim(), // The prompt used
      currentBot.traits // Current traits snapshot
    );
    
    // Update the avatar's main image_url
    const { data: updatedBot, error } = await supabase
      .from('avatars')
      .update({ 
        image_url: url,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentBot.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Prune old history (keep last 20 versions)
    await AvatarHistory.pruneHistory(supabase, currentBot.id, 20);
    
    currentBot = updatedBot;
    displayBot(updatedBot);
  }
}

// ============================================================================
// 2. CREATE.HTML - When creating a new avatar
// ============================================================================

// After successfully creating and saving a new avatar:
async function createNewAvatar() {
  // ... existing creation code ...
  
  const { data: avatarData, error: avatarError } = await supabase
    .from('avatars')
    .insert({
      user_id: user.id,
      name: finalBotName,
      image_url: url,
      traits: { /* ... */ }
    })
    .select()
    .single();
  
  if (!avatarError) {
    // Add the initial image to history
    await AvatarHistory.addToHistory(
      supabase,
      avatarData.id,
      url,
      'initial',
      pending.prompt, // Original creation prompt
      avatarData.traits
    );
  }
}

// ============================================================================
// 3. EDIT.HTML - Add History Viewer UI
// ============================================================================

// Add this HTML to edit.html (after the bot preview section):
/*
<div id="historyPanel" class="history-panel" style="display:none;">
  <div class="history-header">
    <h3>Image History</h3>
    <button id="closeHistoryBtn" class="close-btn">×</button>
  </div>
  <div id="historyGrid" class="history-grid">
    <!-- History items will be populated here -->
  </div>
</div>

<button id="showHistoryBtn" class="action-btn">View History</button>
*/

// Add this CSS:
/*
.history-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: var(--bg);
  border-left: 1px solid #333;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.history-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.history-item.current {
  border-color: var(--ink);
}

.history-item:hover {
  transform: scale(1.05);
  border-color: rgba(255,255,255,0.5);
}

.history-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.history-item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.8);
  padding: 8px;
  font-size: 11px;
  color: #fff;
}

.history-item-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: var(--ink);
  color: var(--bg);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}
*/

// Add this JavaScript to edit.html:
async function loadImageHistory() {
  if (!currentBot) return;
  
  const { success, history, error } = await AvatarHistory.getHistory(
    supabase,
    currentBot.id,
    20
  );
  
  if (!success) {
    console.error('Failed to load history:', error);
    return;
  }
  
  const historyGrid = document.getElementById('historyGrid');
  historyGrid.innerHTML = '';
  
  history.forEach(item => {
    const div = document.createElement('div');
    div.className = `history-item ${item.is_current ? 'current' : ''}`;
    div.innerHTML = `
      ${item.is_current ? '<span class="history-item-badge">CURRENT</span>' : ''}
      <img src="${item.image_url}" alt="Version ${item.version_number}" />
      <div class="history-item-info">
        <div>Version ${item.version_number}</div>
        <div>${new Date(item.created_at).toLocaleDateString()}</div>
        ${item.edit_prompt ? `<div style="font-size:10px;opacity:0.8;">${item.edit_prompt.slice(0,30)}...</div>` : ''}
      </div>
    `;
    
    div.addEventListener('click', async () => {
      if (item.is_current) return;
      
      if (confirm(`Restore version ${item.version_number}?`)) {
        const { success } = await AvatarHistory.restoreVersion(
          supabase,
          currentBot.id,
          item.id
        );
        
        if (success) {
          // Reload the bot to show restored version
          await loadBot(currentBot.id);
          // Reload history to update UI
          await loadImageHistory();
        } else {
          alert('Failed to restore version');
        }
      }
    });
    
    historyGrid.appendChild(div);
  });
}

// Wire up the buttons
document.getElementById('showHistoryBtn')?.addEventListener('click', () => {
  document.getElementById('historyPanel').style.display = 'block';
  loadImageHistory();
});

document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
  document.getElementById('historyPanel').style.display = 'none';
});

// ============================================================================
// 4. API INTEGRATION - Update generate-avatar.js and regenerate-avatar.js
// ============================================================================

// These API endpoints should now return metadata that can be used for history:
// - The prompt used
// - The traits/settings
// - The art style
// This metadata will be stored in the history table for reference

// Example in regenerate-avatar.js:
/*
return new Response(JSON.stringify({
  success: true,
  dataUrl: finalImage,
  metadata: {
    prompt: editPrompt,
    originalPrompt: originalPrompt,
    artStyle: artStyle,
    traitsSnapshot: traits
  }
}));
*/

// ============================================================================
// SUMMARY
// ============================================================================

/*
Implementation Steps:

1. Run avatar-history-migration.sql in Supabase SQL Editor
2. Add avatar-history-utils.js to your project
3. Update edit.html to call AvatarHistory.addToHistory() when regenerating
4. Update create.html to call AvatarHistory.addToHistory() on initial creation
5. Add history viewer UI to edit.html (optional but recommended)
6. Test the functionality

Benefits:
- Users can see all previous versions of their avatar
- Users can restore any previous version with one click
- History includes metadata (prompt used, timestamp, etc.)
- Automatic cleanup of old versions (configurable)
- Full cascade delete support (history deleted when avatar deleted)
- Proper RLS security (users only see their own history)
*/
