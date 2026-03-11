'use strict';
/**
 * Unit tests for PlayFabManager session persistence and proactive refresh
 * (config/playfabConfig.js).
 *
 * We load PlayFabManager by evaluating playfabConfig.js in a minimal vm
 * context so that every test always runs against the real implementation.
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ── Helpers ──────────────────────────────────────────────────────

/** Simple in-memory localStorage mock. */
function buildLocalStorage(initial = {}) {
    const store = Object.assign({}, initial);
    return {
        getItem:    key         => (store[key] !== undefined ? store[key] : null),
        setItem:    (key, val)  => { store[key] = val; },
        removeItem: key         => { delete store[key]; },
        _store:     store,
    };
}

/**
 * Build a fresh PlayFabManager from the real playfabConfig.js source.
 *
 * @param {object} opts
 * @param {object} [opts.localStorage]         - localStorage stub
 * @param {object} [opts.google]               - google.accounts.oauth2 stub
 * @param {object} [opts.PlayFabClientSDK]     - PlayFab SDK stub
 */
function buildPlayFabManager({
    localStorage        = buildLocalStorage(),
    google              = undefined,
    PlayFabClientSDK    = undefined,
    renderCloudLoginStatus = jest.fn(),
    showCloudToast      = jest.fn(),
} = {}) {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'config', 'playfabConfig.js'), 'utf8'
    );
    const srcWithExport = src + '\n__result__ = PlayFabManager;';
    const context = vm.createContext({
        localStorage,
        google,
        PlayFab: undefined,
        PlayFabClientSDK,
        renderCloudLoginStatus,
        showCloudToast,
        console,
        setTimeout: (fn, ms) => { context._pendingTimeout = { fn, ms }; },
        __result__: undefined,
    });
    vm.runInContext(srcWithExport, context);
    return { mgr: context.__result__, context };
}

// ── _restoreSession ───────────────────────────────────────────────

describe('PlayFabManager._restoreSession', () => {
    test('restores googleEmail from persisted session', () => {
        const session = {
            playFabId: 'pfid-123',
            sessionTicket: 'ticket-abc',
            displayName: 'Alice',
            googleEmail: 'alice@example.com',
            sessionObtainedAt: Date.now() - 1000,
        };
        const ls = buildLocalStorage({
            mathgenius_playfabSession: JSON.stringify(session),
        });
        const { mgr } = buildPlayFabManager({ localStorage: ls });
        mgr._restoreSession();
        expect(mgr.googleEmail).toBe('alice@example.com');
    });

    test('restores sessionObtainedAt from persisted session', () => {
        const ts = Date.now() - 5000;
        const session = {
            playFabId: 'pfid-123',
            sessionTicket: 'ticket-abc',
            sessionObtainedAt: ts,
        };
        const ls = buildLocalStorage({
            mathgenius_playfabSession: JSON.stringify(session),
        });
        const { mgr } = buildPlayFabManager({ localStorage: ls });
        mgr._restoreSession();
        expect(mgr.sessionObtainedAt).toBe(ts);
    });

    test('googleEmail defaults to null when not present in stored data', () => {
        const session = { playFabId: 'pfid-123', sessionTicket: 'ticket-abc' };
        const ls = buildLocalStorage({
            mathgenius_playfabSession: JSON.stringify(session),
        });
        const { mgr } = buildPlayFabManager({ localStorage: ls });
        mgr._restoreSession();
        expect(mgr.googleEmail).toBeNull();
    });
});

// ── _applySession / _persistSession ──────────────────────────────

describe('PlayFabManager._applySession', () => {
    test('stores googleEmail and sessionObtainedAt in memory', () => {
        const ls = buildLocalStorage();
        const { mgr } = buildPlayFabManager({ localStorage: ls });
        const before = Date.now();
        mgr._applySession('pfid-1', 'ticket-1', 'Bob', 'bob@example.com');
        const after = Date.now();
        expect(mgr.googleEmail).toBe('bob@example.com');
        expect(mgr.sessionObtainedAt).toBeGreaterThanOrEqual(before);
        expect(mgr.sessionObtainedAt).toBeLessThanOrEqual(after);
    });

    test('persists googleEmail and sessionObtainedAt to localStorage', () => {
        const ls = buildLocalStorage();
        const { mgr } = buildPlayFabManager({ localStorage: ls });
        mgr._applySession('pfid-1', 'ticket-1', 'Bob', 'bob@example.com');
        const stored = JSON.parse(ls.getItem('mathgenius_playfabSession'));
        expect(stored.googleEmail).toBe('bob@example.com');
        expect(typeof stored.sessionObtainedAt).toBe('number');
    });

    test('round-trips googleEmail through persist + restore', () => {
        const ls = buildLocalStorage();
        const { mgr } = buildPlayFabManager({ localStorage: ls });
        mgr._applySession('pfid-1', 'ticket-1', 'Carol', 'carol@example.com');

        // Simulate page reload: create a new manager reading the same localStorage
        const { mgr: mgr2 } = buildPlayFabManager({ localStorage: ls });
        mgr2._restoreSession();
        expect(mgr2.googleEmail).toBe('carol@example.com');
    });
});

// ── silentRefreshWithGoogle (login_hint) ──────────────────────────

describe('PlayFabManager.silentRefreshWithGoogle', () => {
    test('passes login_hint to initTokenClient when googleEmail is set', () => {
        const initSpy = jest.fn().mockReturnValue({ requestAccessToken: jest.fn() });
        const google = {
            accounts: { oauth2: { initTokenClient: initSpy } },
        };
        const { mgr } = buildPlayFabManager({ google });
        mgr.googleEmail = 'dave@example.com';
        mgr.silentRefreshWithGoogle(() => {});
        expect(initSpy).toHaveBeenCalledTimes(1);
        const opts = initSpy.mock.calls[0][0];
        expect(opts.login_hint).toBe('dave@example.com');
        expect(opts.prompt).toBe('none');
    });

    test('login_hint is undefined when googleEmail is null', () => {
        const initSpy = jest.fn().mockReturnValue({ requestAccessToken: jest.fn() });
        const google = {
            accounts: { oauth2: { initTokenClient: initSpy } },
        };
        const { mgr } = buildPlayFabManager({ google });
        mgr.googleEmail = null;
        mgr.silentRefreshWithGoogle(() => {});
        const opts = initSpy.mock.calls[0][0];
        expect(opts.login_hint).toBeUndefined();
    });

    test('calls callback with error when Google SDK is unavailable', done => {
        const { mgr } = buildPlayFabManager({ google: undefined });
        mgr.silentRefreshWithGoogle(err => {
            expect(err).toBeTruthy();
            expect(err.message).toMatch(/unavailable/i);
            done();
        });
    });
});

// ── loginWithGoogle (login_hint for returning users) ─────────────

describe('PlayFabManager.loginWithGoogle', () => {
    test('passes login_hint to initTokenClient when googleEmail is stored', () => {
        const initSpy = jest.fn().mockReturnValue({ requestAccessToken: jest.fn() });
        const google = { accounts: { oauth2: { initTokenClient: initSpy } } };
        const { mgr } = buildPlayFabManager({ google });
        mgr.googleEmail = 'eve@example.com';
        mgr.loginWithGoogle(() => {});
        expect(initSpy).toHaveBeenCalledTimes(1);
        const opts = initSpy.mock.calls[0][0];
        expect(opts.login_hint).toBe('eve@example.com');
    });

    test('login_hint is undefined when no prior email is stored', () => {
        const initSpy = jest.fn().mockReturnValue({ requestAccessToken: jest.fn() });
        const google = { accounts: { oauth2: { initTokenClient: initSpy } } };
        const { mgr } = buildPlayFabManager({ google });
        mgr.googleEmail = null;
        mgr.loginWithGoogle(() => {});
        const opts = initSpy.mock.calls[0][0];
        expect(opts.login_hint).toBeUndefined();
    });
});

// ── _maybeProactiveRefresh ────────────────────────────────────────

describe('PlayFabManager._maybeProactiveRefresh', () => {
    test('does nothing when sessionObtainedAt is null', () => {
        const { mgr, context } = buildPlayFabManager();
        mgr.sessionObtainedAt = null;
        mgr._maybeProactiveRefresh();
        expect(context._pendingTimeout).toBeUndefined();
    });

    test('does nothing when session is recent (< threshold)', () => {
        const { mgr, context } = buildPlayFabManager();
        // Session obtained just now — well within the 23 h window
        mgr.sessionObtainedAt = Date.now() - 1000;
        mgr._maybeProactiveRefresh();
        expect(context._pendingTimeout).toBeUndefined();
    });

    test('schedules a setTimeout when session is older than threshold', () => {
        const { mgr, context } = buildPlayFabManager();
        // Session obtained 24 hours ago — past the 23 h threshold
        mgr.sessionObtainedAt = Date.now() - 24 * 60 * 60 * 1000;
        mgr._maybeProactiveRefresh();
        expect(context._pendingTimeout).toBeDefined();
        expect(typeof context._pendingTimeout.fn).toBe('function');
    });

    test('the scheduled refresh calls silentRefreshWithGoogle', () => {
        const initSpy = jest.fn().mockReturnValue({ requestAccessToken: jest.fn() });
        const google = { accounts: { oauth2: { initTokenClient: initSpy } } };
        const { mgr, context } = buildPlayFabManager({ google });
        mgr.googleEmail = 'frank@example.com';
        mgr.sessionObtainedAt = Date.now() - 24 * 60 * 60 * 1000;
        mgr._maybeProactiveRefresh();
        // Invoke the scheduled callback synchronously (simulating timer fire)
        context._pendingTimeout.fn();
        expect(initSpy).toHaveBeenCalledTimes(1);
        const opts = initSpy.mock.calls[0][0];
        expect(opts.prompt).toBe('none');
        expect(opts.login_hint).toBe('frank@example.com');
    });
});
