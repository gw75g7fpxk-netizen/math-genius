// Login Modal Controller for Math Genius
// Manages the optional Google sign-in overlay and cloud sync of all player profiles.
// Works with PlayFabManager (config/playfabConfig.js).
//
// A single sign-in syncs ALL local player profiles (and their story progress) to the
// cloud, and merges any cloud profiles back into the device's local storage.

'use strict';

// ── Cloud sync helpers ────────────────────────────────────────

const CloudSync = {
    // Merge story-progress for a single character: take the best result per chapter.
    _mergeCharProgress(local, cloud) {
        if (!cloud) return local;
        if (!local) return cloud;
        const localChapters = local.chapters || [];
        const cloudChapters = cloud.chapters || [];
        const chapters = [];
        const len = Math.max(localChapters.length, cloudChapters.length);
        for (let i = 0; i < len; i++) {
            const l = localChapters[i];
            const c = cloudChapters[i];
            if (!l) { chapters.push(c); continue; }
            if (!c) { chapters.push(l); continue; }
            chapters.push({
                completed:  l.completed  || c.completed,
                stars:      Math.max(l.stars      || 0, c.stars      || 0),
                bestScore:  Math.max(l.bestScore  || 0, c.bestScore  || 0),
                bestPct:    Math.max(l.bestPct    || 0, c.bestPct    || 0),
            });
        }
        return { chapters };
    },

    // Merge storyProgress objects from two user records.
    _mergeStoryProgress(local, cloud) {
        if (!cloud) return local || {};
        if (!local) return cloud;
        const merged = Object.assign({}, local);
        for (const charId of Object.keys(cloud)) {
            merged[charId] = this._mergeCharProgress(local[charId], cloud[charId]);
        }
        return merged;
    },

    // Merge two user records with the same name, keeping the best of each.
    _mergeUser(local, cloud) {
        return {
            name:          local.name,
            created:       Math.min(local.created  || Date.now(), cloud.created  || Date.now()),
            lastPlayed:    Math.max(local.lastPlayed || 0, cloud.lastPlayed || 0),
            settings:      local.settings || cloud.settings || undefined,
            storyProgress: this._mergeStoryProgress(local.storyProgress, cloud.storyProgress),
        };
    },

    // Merge two users arrays; cloud users not present locally are added.
    mergeUsers(local, cloud) {
        if (!cloud || !Array.isArray(cloud)) return local;
        const merged = local.map(u => {
            const match = cloud.find(c => c.name === u.name);
            return match ? this._mergeUser(u, match) : u;
        });
        // Add any cloud users that don't exist locally
        for (const cloudUser of cloud) {
            if (!merged.find(u => u.name === cloudUser.name)) {
                merged.push(cloudUser);
            }
        }
        return merged;
    },

    // After login: load cloud users, merge with local, persist the result.
    // callback() is called when complete (with or without error).
    syncFromCloud(callback) {
        if (typeof PlayFabManager === 'undefined' || !PlayFabManager.isLoggedIn) {
            if (callback) callback();
            return;
        }
        PlayFabManager.loadUsersFromCloud((error, cloudUsers) => {
            if (error) {
                console.warn('PlayFab: Failed to load cloud players —', error.message);
                if (callback) callback();
                return;
            }
            // getUsers / saveUsers are defined in game.js (loaded before first use)
            const local  = (typeof getUsers  === 'function') ? getUsers()  : [];
            const merged = this.mergeUsers(local, cloudUsers);
            if (typeof saveUsers === 'function') saveUsers(merged);
            console.log('PlayFab: Players synced from cloud');
            if (callback) callback();
        });
    },
};

// ── Login Modal UI ────────────────────────────────────────────

const LoginModal = {
    _onClose: null,

    // Show the modal. onClose is called when the modal is dismissed.
    show(onClose) {
        this._onClose = onClose || null;
        const modal = document.getElementById('mg-login-modal');
        if (!modal) return;
        this._refresh();
        modal.style.display = 'flex';
    },

    hide() {
        const modal = document.getElementById('mg-login-modal');
        if (modal) modal.style.display = 'none';
        if (this._onClose) {
            const cb = this._onClose;
            this._onClose = null;
            cb();
        }
    },

    _refresh() {
        const loggedIn  = typeof PlayFabManager !== 'undefined' && PlayFabManager.isLoggedIn;
        const optionsEl = document.getElementById('mg-login-options');
        const statusEl  = document.getElementById('mg-login-status-panel');
        const userEl    = document.getElementById('mg-login-user-label');
        const msgEl     = document.getElementById('mg-login-message');
        if (optionsEl) optionsEl.style.display = loggedIn ? 'none' : 'block';
        if (statusEl)  statusEl.style.display  = loggedIn ? 'block' : 'none';
        if (msgEl)     msgEl.textContent = '';
        if (loggedIn && userEl) {
            const name = PlayFabManager.displayName || PlayFabManager.playFabId || 'your account';
            userEl.textContent = 'Connected: ' + name;
        }
    },

    _setMessage(text, color) {
        const el = document.getElementById('mg-login-message');
        if (!el) return;
        el.textContent = text;
        el.style.color = color || '';
    },

    _setButtons(enabled) {
        const btns = document.querySelectorAll('#mg-login-modal button');
        btns.forEach(b => {
            b.disabled = !enabled;
            b.style.opacity = enabled ? '' : '0.5';
            b.style.cursor  = enabled ? '' : 'default';
        });
    },

    triggerGoogle() {
        if (typeof PlayFabManager === 'undefined') {
            this._setMessage('Service unavailable. Try again later.', 'var(--danger)');
            return;
        }
        this._setButtons(false);
        this._setMessage('Connecting to Google…');
        PlayFabManager.loginWithGoogle((error) => {
            this._setButtons(true);
            if (error) {
                this._setMessage(error.message, 'var(--danger)');
                return;
            }
            this._setMessage('Signed in! Syncing progress…', 'var(--success)');
            CloudSync.syncFromCloud(() => {
                setTimeout(() => this.hide(), 1000);
            });
        });
    },

    triggerLogout() {
        if (typeof PlayFabManager !== 'undefined') {
            PlayFabManager.logout();
        }
        this._refresh();
        this.hide();
    },
};
