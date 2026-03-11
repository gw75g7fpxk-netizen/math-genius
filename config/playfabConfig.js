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

    // PlayFab session tickets expire after ~24 h.  Attempt a proactive silent
    // refresh once the stored session is older than this threshold so the daily
    // "please sign in again" popup never appears.
    SESSION_REFRESH_THRESHOLD_MS: 23 * 60 * 60 * 1000,  // 23 hours

    isLoggedIn: false,
    playFabId: null,
    sessionTicket: null,
    displayName: null,
    googleEmail: null,        // stored as login_hint for silent re-auth
    sessionObtainedAt: null,  // ms epoch; used to detect near-expiry sessions

    // Initialize PlayFab SDK and restore any existing session
    initialize() {
        if (typeof PlayFab !== 'undefined') {
            PlayFab.settings.titleId = this.TITLE_ID;
        }
        this._restoreSession();
        // Proactively refresh a near-expiry session in the background so the
        // user is never shown the "please sign in again" popup mid-session.
        if (this.isLoggedIn) {
            this._maybeProactiveRefresh();
        }
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
                this.googleEmail = data.googleEmail || null;
                this.sessionObtainedAt = data.sessionObtainedAt || null;
                this.isLoggedIn = true;
                if (typeof PlayFab !== 'undefined') {
                    // The PlayFab JS SDK authenticates API calls via
                    // PlayFab._internalSettings.sessionTicket — not the public
                    // PlayFab.settings.sessionTicket.  Both must be set when
                    // restoring a persisted session after a page reload, otherwise
                    // every API call throws "Must be logged in to call this method"
                    // (the SDK throws a bare string, not an Error, which is why the
                    // error shows as "GetUserData threw: undefined" in the toast —
                    // strings have no .message property).
                    PlayFab.settings.sessionTicket = this.sessionTicket;
                    if (PlayFab._internalSettings) {
                        PlayFab._internalSettings.sessionTicket = this.sessionTicket;
                    }
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
                googleEmail: this.googleEmail,
                sessionObtainedAt: this.sessionObtainedAt,
            }));
        } catch (e) {
            console.warn('PlayFab: Failed to persist session', e);
        }
    },

    _applySession(playFabId, sessionTicket, displayName, googleEmail) {
        this.playFabId = playFabId;
        this.sessionTicket = sessionTicket;
        this.displayName = displayName || null;
        this.googleEmail = googleEmail || null;
        this.sessionObtainedAt = Date.now();
        this.isLoggedIn = true;
        if (typeof PlayFab !== 'undefined') {
            PlayFab.settings.sessionTicket = sessionTicket;
            if (PlayFab._internalSettings) {
                PlayFab._internalSettings.sessionTicket = sessionTicket;
            }
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
                // Provide the stored email as a hint so returning users don't
                // have to pick their account from a list every time.
                login_hint: this.googleEmail || undefined,
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
            const name  = result.data.InfoResultPayload?.AccountInfo?.TitleInfo?.DisplayName || null;
            // Prefer the Google-linked email; fall back to the PlayFab private email.
            // Stored so it can be passed as login_hint on silent re-auth, which helps
            // the Google Identity Services library identify the account without any
            // user interaction — preventing the daily "sign in again" popup.
            const email = result.data.InfoResultPayload?.AccountInfo?.GoogleInfo?.GoogleEmail
                       || result.data.InfoResultPayload?.AccountInfo?.PrivateInfo?.Email
                       || null;
            this._applySession(result.data.PlayFabId, result.data.SessionTicket, name, email);
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
                if (typeof showCloudToast === 'function') {
                    showCloudToast('⚠️ Save error: ' + (error.errorMessage || 'Save failed'), true);
                }
            } else {
                console.log('PlayFab: Players saved to cloud');
            }
        });
    },

    // Load the users array from PlayFab cloud.
    // _retried is internal — prevents infinite retry loops when silent re-auth
    // was attempted but the refreshed session also fails immediately.
    loadUsersFromCloud(callback, _retried = false) {
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
                        if (!_retried) {
                            // Session ticket expired.  Try a silent Google re-auth so the
                            // user doesn't have to manually tap "Sign in with Google" again.
                            this.silentRefreshWithGoogle((refreshErr) => {
                                if (refreshErr) {
                                    // Silent re-auth failed (e.g. browser blocks third-party
                                    // requests, or the user is not signed into Google).
                                    // Log out and show sign-in UI so they can reconnect.
                                    console.warn('PlayFab: Silent re-auth failed —', refreshErr.message);
                                    this.logout();
                                    if (typeof renderCloudLoginStatus === 'function') {
                                        renderCloudLoginStatus();
                                    }
                                    callback(new Error(error.errorMessage || 'Cloud load failed'), null);
                                } else {
                                    // Fresh session obtained — retry the load exactly once.
                                    this.loadUsersFromCloud(callback, true);
                                }
                            });
                            return;
                        }
                        // Already retried with a fresh session and still failing — log out.
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
            // SDK throws a bare string like "Must be logged in to call this method"
            // rather than an Error object).
            const msg = (e && e.message) ? e.message : String(e);
            console.warn('PlayFab: GetUserData threw synchronously —', e);
            callback(new Error('GetUserData threw: ' + msg), null);
        }
    },

    // Attempt to silently get a fresh Google access token and re-authenticate
    // with PlayFab.  Uses prompt:'none' so no popup or consent dialog is shown.
    // Passes login_hint (the user's stored Google email) to help the Google
    // Identity Services library identify the correct account without any user
    // interaction — this is the key fix for the daily "sign in again" popup on
    // mobile, where GIS cannot use third-party cookies to determine the account.
    // Succeeds transparently when the user is still signed into Google and their
    // consent is still valid.  Fails immediately (calling callback with an error)
    // if user interaction would be required (e.g. iOS Safari with ITP, user
    // signed out of Google, or consent revoked) — callers fall back to showing
    // the "Sign in with Google" UI.
    // Calls callback(error) — error is null on success.
    silentRefreshWithGoogle(callback) {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
            callback(new Error('Google SDK unavailable'));
            return;
        }
        // Guard against the callback being invoked multiple times by the SDK.
        let settled = false;
        const done = (err) => {
            if (settled) return;
            settled = true;
            callback(err || null);
        };
        try {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: this.GOOGLE_CLIENT_ID,
                scope: 'openid profile email',
                prompt: 'none',
                // login_hint tells GIS which Google account to re-authenticate
                // without asking the user to pick.  Critical for mobile browsers
                // (iOS Safari) where third-party cookies are blocked.
                login_hint: this.googleEmail || undefined,
                callback: (response) => {
                    if (response.error) {
                        done(new Error(response.error_description || response.error));
                        return;
                    }
                    this._playfabLoginGoogle(response.access_token, (loginErr) => {
                        done(loginErr || null);
                    });
                },
                error_callback: (err) => {
                    done(new Error((err && err.message) || 'Silent refresh failed'));
                },
            });
            client.requestAccessToken();
        } catch (e) {
            done(new Error('Silent refresh threw: ' + e.message));
        }
    },

    // Proactively refresh the PlayFab session in the background when it is
    // near expiry (older than SESSION_REFRESH_THRESHOLD_MS).  Called once at
    // startup with a small delay so the Google Identity Services script has
    // time to finish loading.  If the refresh fails the session is left as-is;
    // the existing per-call retry in loadUsersFromCloud acts as a safety net.
    _maybeProactiveRefresh() {
        if (!this.sessionObtainedAt) return;
        const age = Date.now() - this.sessionObtainedAt;
        if (age < this.SESSION_REFRESH_THRESHOLD_MS) return;
        // Defer slightly so the Google Identity Services SDK can finish loading.
        setTimeout(() => {
            console.log('PlayFab: Session is older than 23 h — attempting background refresh');
            this.silentRefreshWithGoogle((err) => {
                if (err) {
                    console.warn('PlayFab: Background refresh failed —', err.message);
                    // Leave the session intact; the next API call will trigger
                    // its own silent-refresh via loadUsersFromCloud's retry logic.
                } else {
                    console.log('PlayFab: Session refreshed in background');
                }
            });
        }, 3000);
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
