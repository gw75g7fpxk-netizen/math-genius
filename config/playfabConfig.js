// PlayFab Integration for Math Genius
// Saves all player profiles and their story progress to the cloud.
// Microsoft Azure PlayFab – Title ID: 1934FB
//
// Google OAuth 2.0 Client ID (Web application type):
//   https://console.cloud.google.com/ → APIs & Services → Credentials

'use strict';

const PlayFabManager = {
    TITLE_ID: '1934FB',
    GOOGLE_CLIENT_ID: '959296849138-3n2bpfspbkr04kk2s23p8era65fol16i.apps.googleusercontent.com',

    isLoggedIn: false,
    playFabId: null,
    sessionTicket: null,
    displayName: null,

    // Initialize PlayFab SDK and restore any existing session
    initialize() {
        if (typeof PlayFab !== 'undefined') {
            PlayFab.settings.titleId = this.TITLE_ID;
        }
        this._restoreSession();
    },

    _restoreSession() {
        try {
            const raw = localStorage.getItem('mathgenius_playfabSession');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.playFabId && data.sessionTicket) {
                this.playFabId = data.playFabId;
                this.sessionTicket = data.sessionTicket;
                this.displayName = data.displayName || null;
                this.isLoggedIn = true;
                if (typeof PlayFab !== 'undefined') {
                    PlayFab.settings.sessionTicket = this.sessionTicket;
                }
                console.log('PlayFab: Session restored for', this.playFabId);
            }
        } catch (e) {
            // Clear any corrupted session data to prevent stale state
            try { localStorage.removeItem('mathgenius_playfabSession'); } catch (_) {}
            console.warn('PlayFab: Failed to restore session — cleared', e);
        }
    },

    _persistSession() {
        try {
            localStorage.setItem('mathgenius_playfabSession', JSON.stringify({
                playFabId: this.playFabId,
                sessionTicket: this.sessionTicket,
                displayName: this.displayName,
            }));
        } catch (e) {
            console.warn('PlayFab: Failed to persist session', e);
        }
    },

    _applySession(playFabId, sessionTicket, displayName) {
        this.playFabId = playFabId;
        this.sessionTicket = sessionTicket;
        this.displayName = displayName || null;
        this.isLoggedIn = true;
        if (typeof PlayFab !== 'undefined') {
            PlayFab.settings.sessionTicket = sessionTicket;
        }
        this._persistSession();
    },

    // Log out the current user
    logout() {
        this.playFabId = null;
        this.sessionTicket = null;
        this.displayName = null;
        this.isLoggedIn = false;
        try { localStorage.removeItem('mathgenius_playfabSession'); } catch (e) {}
        console.log('PlayFab: Logged out');
    },

    // Initiate Google Sign-In flow and authenticate with PlayFab
    loginWithGoogle(callback) {
        if (typeof google === 'undefined' || !google.accounts) {
            callback(new Error('Google Sign-In is not available. Check your connection.'), null);
            return;
        }
        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: this.GOOGLE_CLIENT_ID,
                scope: 'openid profile email',
                callback: (response) => {
                    if (response.error) {
                        callback(new Error(response.error_description || response.error), null);
                        return;
                    }
                    this._playfabLoginGoogle(response.access_token, callback);
                },
                error_callback: (err) => {
                    // Handles popup blocked / user closed window etc.
                    callback(new Error(err.message || 'Google Sign-In was cancelled or blocked'), null);
                },
            });
            client.requestAccessToken();
        } catch (e) {
            callback(new Error('Google Sign-In failed: ' + e.message), null);
        }
    },

    _playfabLoginGoogle(accessToken, callback) {
        if (typeof PlayFabClientSDK === 'undefined') {
            callback(new Error('PlayFab SDK not loaded'), null);
            return;
        }
        PlayFabClientSDK.LoginWithGoogleAccount({
            AccessToken: accessToken,
            TitleId: this.TITLE_ID,
            CreateAccount: true,
            InfoRequestParameters: { GetUserAccountInfo: true },
        }, (result, error) => {
            if (error) {
                callback(new Error(error.errorMessage || 'PlayFab Google login failed'), null);
                return;
            }
            const name = result.data.InfoResultPayload?.AccountInfo?.TitleInfo?.DisplayName || null;
            this._applySession(result.data.PlayFabId, result.data.SessionTicket, name);
            callback(null, result.data);
        });
    },

    // Save the full users array to PlayFab cloud (fire-and-forget).
    // Writing directly without a preceding read keeps the call to a single
    // network round-trip so that the write is reliably dispatched even if the
    // user navigates away immediately after completing a level.
    // Multi-device merge is handled by syncFromCloud (loginModal.js), which
    // reads the current cloud state, merges it with local data, and writes the
    // result to localStorage only.  The next explicit saveUsersToCloud call
    // (from a user action) then reliably writes the fully-merged state.
    saveUsersToCloud(users) {
        if (!this.isLoggedIn || typeof PlayFabClientSDK === 'undefined') return;
        PlayFabClientSDK.UpdateUserData({
            Data: { mathGeniusUsers: JSON.stringify(users) },
        }, (result, error) => {
            if (error) {
                console.warn('PlayFab: Cloud save failed —', error.errorMessage);
                // Session-related errors mean all future saves will also fail.
                // Log out now so the UI shows "not connected" and the user can
                // re-sign in to obtain a fresh session ticket.
                if (this._isSessionError(error)) {
                    this.logout();
                    if (typeof renderCloudLoginStatus === 'function') {
                        renderCloudLoginStatus();
                    }
                }
            } else {
                console.log('PlayFab: Players saved to cloud');
            }
        });
    },

    // Load the users array from PlayFab cloud
    loadUsersFromCloud(callback) {
        if (!this.isLoggedIn || typeof PlayFabClientSDK === 'undefined') {
            callback(new Error('Not logged in'), null);
            return;
        }
        try {
            PlayFabClientSDK.GetUserData({
                Keys: ['mathGeniusUsers'],
            }, (result, error) => {
                if (error) {
                    if (this._isSessionError(error)) {
                        this.logout();
                        if (typeof renderCloudLoginStatus === 'function') {
                            renderCloudLoginStatus();
                        }
                    }
                    callback(new Error(error.errorMessage || 'Cloud load failed'), null);
                    return;
                }
                const entry = result.data?.Data?.mathGeniusUsers;
                if (entry?.Value) {
                    try {
                        callback(null, JSON.parse(entry.Value));
                    } catch (e) {
                        callback(new Error('Failed to parse cloud save data'), null);
                    }
                } else {
                    callback(null, null); // No cloud save exists yet for this account
                }
            });
        } catch (e) {
            // Guard against synchronous throws from the PlayFab SDK (e.g. when the
            // SDK is in an invalid state).  Treat as a non-fatal error so callers
            // can continue; the try-catch in saveUsers already covers UpdateUserData.
            console.warn('PlayFab: GetUserData threw synchronously —', e);
            callback(new Error('GetUserData threw: ' + e.message), null);
        }
    },

    // Returns true when a PlayFab error indicates an invalid or expired session.
    _isSessionError(error) {
        // PlayFab errorCodes: 1001 = NotAuthenticated, 1014 = SessionTicketExpired,
        // 1142 = SessionNotFound.  These are the stable, versioned identifiers.
        const SESSION_ERROR_CODES = [1001, 1014, 1142];
        if (error.errorCode && SESSION_ERROR_CODES.includes(error.errorCode)) return true;
        // Also check the short error code string as a belt-and-suspenders fallback
        // in case a future SDK version reports an unrecognised numeric code.
        const msg = (error.errorMessage || '').toLowerCase();
        if (msg.includes('sessionticket') || msg.includes('not authenticated')) return true;
        return false;
    },
};
