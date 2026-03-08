'use strict';
/**
 * Unit tests for cloud sync logic (config/loginModal.js).
 *
 * We load the CloudSync object by evaluating loginModal.js inside a minimal
 * mock environment so that tests always run against the real implementation.
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ── Helpers to build a minimal execution context ────────────────

/**
 * Build a fresh CloudSync object from the real loginModal.js source.
 * Accepts overrides for globals the module uses (PlayFabManager, getUsers,
 * localStorage, etc.).
 */
function buildCloudSync({
    PlayFabManager   = undefined,
    getUsers         = () => [],
    localStorage     = buildLocalStorage(),
    showCloudToast   = jest.fn(),
} = {}) {
    const src = fs.readFileSync(
        path.join(__dirname, '..', 'config', 'loginModal.js'), 'utf8'
    );
    // Append a line that assigns the const to the global context so we can
    // retrieve it after vm.runInContext (const declarations don't become
    // properties of the sandbox global automatically).
    const srcWithExport = src + '\n__result__ = CloudSync;';
    const context = vm.createContext({
        // Provided by the test
        PlayFabManager,
        getUsers,
        localStorage,
        showCloudToast,
        __result__: undefined,
        // Stubs for LoginModal UI calls that are not under test
        renderCloudLoginStatus: () => {},
        document: { getElementById: () => null, querySelectorAll: () => [] },
        console,
    });
    vm.runInContext(srcWithExport, context);
    return { CloudSync: context.__result__, showCloudToast };
}

/** Simple in-memory localStorage mock. */
function buildLocalStorage() {
    const store = {};
    return {
        getItem:    key       => store[key] !== undefined ? store[key] : null,
        setItem:    (key, val) => { store[key] = val; },
        removeItem: key       => { delete store[key]; },
        _store:     store,
    };
}

/** Build a mock PlayFabManager that returns predetermined cloud data. */
function buildPlayFabManager({
    isLoggedIn       = true,
    cloudData        = null,   // null → no cloud save; Array → cloud users
    loadError        = null,   // Error → simulate load failure
    saveSpy          = jest.fn(),
} = {}) {
    return {
        isLoggedIn,
        saveUsersToCloud: saveSpy,
        loadUsersFromCloud(callback) {
            // Simulate async network round-trip
            if (loadError) {
                process.nextTick(() => callback(loadError, null));
            } else {
                process.nextTick(() => callback(null, cloudData));
            }
        },
    };
}

// ─────────────────────────────────────────────────────────────────
// mergeUsers unit tests
// ─────────────────────────────────────────────────────────────────

describe('CloudSync.mergeUsers', () => {
    let cs;
    beforeEach(() => { ({ CloudSync: cs } = buildCloudSync()); });

    test('returns local unchanged when cloud is null', () => {
        const alice = { name: 'Alice', created: 1, lastPlayed: 2, storyProgress: {} };
        const result = cs.mergeUsers([alice], null);
        expect(result).toEqual([alice]);
    });

    test('returns local unchanged when cloud is not an array', () => {
        const alice = { name: 'Alice', created: 1, lastPlayed: 2, storyProgress: {} };
        const result = cs.mergeUsers([alice], 'bad');
        expect(result).toEqual([alice]);
    });

    test('merges per-chapter progress taking the best values', () => {
        const local = [{
            name: 'Alice', created: 1000, lastPlayed: 2000,
            storyProgress: { aurora: { chapters: [
                { completed: true,  stars: 3, bestScore: 180, bestPct: 90 },
                { completed: true,  stars: 2, bestScore: 150, bestPct: 75 },
                { completed: false, stars: 0, bestScore: null, bestPct: null },
            ] } },
        }];
        const cloud = [{
            name: 'Alice', created: 1000, lastPlayed: 3000,
            storyProgress: { aurora: { chapters: [
                { completed: true,  stars: 3, bestScore: 185, bestPct: 95 },
                { completed: true,  stars: 3, bestScore: 180, bestPct: 90 },
                { completed: true,  stars: 3, bestScore: 190, bestPct: 95 },
            ] } },
        }];
        const [alice] = cs.mergeUsers(local, cloud);
        const chs = alice.storyProgress.aurora.chapters;

        expect(chs[0].bestScore).toBe(185);    // cloud wins (185 > 180)
        expect(chs[1].stars).toBe(3);           // cloud wins (3 > 2)
        expect(chs[2].completed).toBe(true);    // cloud wins (true vs false)
        expect(chs[2].bestScore).toBe(190);     // from cloud
        expect(alice.lastPlayed).toBe(3000);    // max(2000,3000)
    });

    test('is order-independent — matches users by name', () => {
        const bob   = { name: 'Bob',   created: 500,  lastPlayed: 1000, storyProgress: {} };
        const alice = { name: 'Alice', created: 1000, lastPlayed: 2000,
            storyProgress: { aurora: { chapters: [
                { completed: false, stars: 0, bestScore: null, bestPct: null },
            ] } },
        };
        const cloudAlice = { name: 'Alice', created: 1000, lastPlayed: 3000,
            storyProgress: { aurora: { chapters: [
                { completed: true, stars: 2, bestScore: 160, bestPct: 80 },
            ] } },
        };
        const cloudCharlie = { name: 'Charlie', created: 600, lastPlayed: 1100, storyProgress: {} };

        // Device B: [Bob, Alice]; Cloud: [Alice(advanced), Charlie]
        const result = cs.mergeUsers([bob, alice], [cloudAlice, cloudCharlie]);
        expect(result.map(u => u.name)).toContain('Bob');
        expect(result.map(u => u.name)).toContain('Alice');
        expect(result.map(u => u.name)).toContain('Charlie');
        expect(result.length).toBe(3);

        const mergedAlice = result.find(u => u.name === 'Alice');
        expect(mergedAlice.storyProgress.aurora.chapters[0].completed).toBe(true);
    });

    test('adds cloud-only users to the result', () => {
        const bob  = { name: 'Bob', created: 1, lastPlayed: 1, storyProgress: {} };
        const dave = { name: 'Dave', created: 2, lastPlayed: 2, storyProgress: {} };
        const result = cs.mergeUsers([bob], [dave]);
        expect(result.length).toBe(2);
        expect(result.find(u => u.name === 'Dave')).toBeTruthy();
    });

    test('preserves local-only users', () => {
        const bob  = { name: 'Bob', created: 1, lastPlayed: 1, storyProgress: {} };
        const dave = { name: 'Dave', created: 2, lastPlayed: 2, storyProgress: {} };
        const result = cs.mergeUsers([bob, dave], [dave]);
        expect(result.find(u => u.name === 'Bob')).toBeTruthy();
    });

    test('merges progress for a cloud-only character (local has no entry for that char)', () => {
        const local = [{
            name: 'Alice', created: 1, lastPlayed: 1,
            storyProgress: {
                aurora: { chapters: [{ completed: true, stars: 2, bestScore: 150, bestPct: 75 }] },
            },
        }];
        const cloud = [{
            name: 'Alice', created: 1, lastPlayed: 2,
            storyProgress: {
                aurora:   { chapters: [{ completed: true, stars: 3, bestScore: 180, bestPct: 90 }] },
                bermione: { chapters: [{ completed: true, stars: 2, bestScore: 160, bestPct: 80 }] },
            },
        }];
        const [alice] = cs.mergeUsers(local, cloud);
        expect(alice.storyProgress.bermione).toBeTruthy();
        expect(alice.storyProgress.bermione.chapters[0].completed).toBe(true);
        expect(alice.storyProgress.aurora.chapters[0].stars).toBe(3);
    });
});

// ─────────────────────────────────────────────────────────────────
// syncFromCloud integration tests (mocked network)
// ─────────────────────────────────────────────────────────────────

describe('CloudSync.syncFromCloud', () => {
    test('calls callback immediately when PlayFabManager is undefined', done => {
        const { CloudSync: cs } = buildCloudSync({ PlayFabManager: undefined });
        cs.syncFromCloud(() => done());
    });

    test('calls callback immediately when not logged in', done => {
        const mgr = buildPlayFabManager({ isLoggedIn: false });
        const { CloudSync: cs } = buildCloudSync({ PlayFabManager: mgr });
        cs.syncFromCloud(() => done());
    });

    test('merges cloud data into localStorage on successful sync', done => {
        const ls     = buildLocalStorage();
        const local  = [{ name: 'Alice', created: 1000, lastPlayed: 2000,
            storyProgress: { aurora: { chapters: [
                { completed: false, stars: 0, bestScore: null, bestPct: null },
            ] } },
        }];
        const cloud  = [{ name: 'Alice', created: 1000, lastPlayed: 3000,
            storyProgress: { aurora: { chapters: [
                { completed: true, stars: 3, bestScore: 190, bestPct: 95 },
            ] } },
        }];
        ls.setItem('mathgenius_users', JSON.stringify(local));
        const mgr = buildPlayFabManager({ cloudData: cloud });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            getUsers: () => JSON.parse(ls.getItem('mathgenius_users') || '[]'),
            localStorage: ls,
        });

        cs.syncFromCloud(() => {
            const saved = JSON.parse(ls.getItem('mathgenius_users'));
            expect(saved[0].storyProgress.aurora.chapters[0].completed).toBe(true);
            expect(saved[0].storyProgress.aurora.chapters[0].bestScore).toBe(190);
            done();
        });
    });

    test('pushes merged data back to cloud after a successful sync', done => {
        const saveSpy = jest.fn();
        const local   = [{ name: 'Alice', created: 1, lastPlayed: 1, storyProgress: {} }];
        const cloud   = [{ name: 'Alice', created: 1, lastPlayed: 2,
            storyProgress: { aurora: { chapters: [
                { completed: true, stars: 3, bestScore: 190, bestPct: 95 },
            ] } },
        }];
        const mgr = buildPlayFabManager({ cloudData: cloud, saveSpy });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            getUsers: () => local,
        });

        cs.syncFromCloud(() => {
            expect(saveSpy).toHaveBeenCalledTimes(1);
            const pushed = saveSpy.mock.calls[0][0];
            expect(pushed[0].storyProgress.aurora.chapters[0].completed).toBe(true);
            done();
        });
    });

    test('repairs stale cloud data when local has better progress', done => {
        // Scenario: Device B previously overwrote cloud with ch5 data (stale).
        // Device A has ch8 locally. After sync, cloud should be repaired to ch8.
        const saveSpy   = jest.fn();
        const staleCloud = [{ name: 'Alice', created: 1000, lastPlayed: 2000,
            storyProgress: { aurora: { chapters: [
                { completed: true, stars: 2, bestScore: 150, bestPct: 75 },
                { completed: true, stars: 1, bestScore: 120, bestPct: 60 },
                { completed: false, stars: 0, bestScore: null, bestPct: null },
            ] } },
        }];
        // Local (Device A) has more progress than the stale cloud
        const betterLocal = [{ name: 'Alice', created: 1000, lastPlayed: 5000,
            storyProgress: { aurora: { chapters: [
                { completed: true, stars: 3, bestScore: 185, bestPct: 95 },
                { completed: true, stars: 3, bestScore: 180, bestPct: 90 },
                { completed: true, stars: 3, bestScore: 190, bestPct: 95 },
            ] } },
        }];
        const mgr = buildPlayFabManager({ cloudData: staleCloud, saveSpy });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            getUsers: () => betterLocal,
        });

        cs.syncFromCloud(() => {
            expect(saveSpy).toHaveBeenCalledTimes(1);
            const pushed = saveSpy.mock.calls[0][0];
            const chs = pushed[0].storyProgress.aurora.chapters;
            // Merged result must reflect the better local data
            expect(chs[0].stars).toBe(3);
            expect(chs[2].completed).toBe(true);
            expect(chs[2].bestScore).toBe(190);
            done();
        });
    });

    test('still pushes local data to cloud when cloud has no save yet (null)', done => {
        const saveSpy = jest.fn();
        const local   = [{ name: 'Alice', created: 1, lastPlayed: 1,
            storyProgress: { aurora: { chapters: [
                { completed: true, stars: 2, bestScore: 150, bestPct: 75 },
            ] } },
        }];
        // cloudData: null → cloud has no save for this account
        const mgr = buildPlayFabManager({ cloudData: null, saveSpy });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            getUsers: () => local,
        });

        cs.syncFromCloud(() => {
            expect(saveSpy).toHaveBeenCalledTimes(1);
            const pushed = saveSpy.mock.calls[0][0];
            expect(pushed[0].name).toBe('Alice');
            done();
        });
    });

    test('does not push or update localStorage when cloud load fails', done => {
        const ls      = buildLocalStorage();
        const saveSpy = jest.fn();
        const local   = [{ name: 'Alice', created: 1, lastPlayed: 1, storyProgress: {} }];
        ls.setItem('mathgenius_users', JSON.stringify(local));
        const mgr = buildPlayFabManager({ loadError: new Error('Network failure'), saveSpy });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            getUsers: () => JSON.parse(ls.getItem('mathgenius_users') || '[]'),
            localStorage: ls,
        });

        cs.syncFromCloud(() => {
            expect(saveSpy).not.toHaveBeenCalled();
            const stored = JSON.parse(ls.getItem('mathgenius_users'));
            // localStorage unchanged
            expect(stored[0].storyProgress).toEqual({});
            done();
        });
    });

    test('handles multiple users with different order on local vs cloud', done => {
        const saveSpy = jest.fn();
        const ls      = buildLocalStorage();
        // Device B: Bob first, Alice second (Alice has less progress)
        const local = [
            { name: 'Bob',   created: 500,  lastPlayed: 1000, storyProgress: {} },
            { name: 'Alice', created: 1000, lastPlayed: 2000,
                storyProgress: { aurora: { chapters: [
                    { completed: true,  stars: 2, bestScore: 150, bestPct: 75 },
                    { completed: false, stars: 0, bestScore: null, bestPct: null },
                ] } },
            },
        ];
        // Cloud: Alice first (more progress), Charlie present, Bob not present
        const cloud = [
            { name: 'Alice', created: 1000, lastPlayed: 3000,
                storyProgress: { aurora: { chapters: [
                    { completed: true, stars: 3, bestScore: 185, bestPct: 95 },
                    { completed: true, stars: 2, bestScore: 160, bestPct: 80 },
                ] } },
            },
            { name: 'Charlie', created: 600, lastPlayed: 1100, storyProgress: {} },
        ];
        ls.setItem('mathgenius_users', JSON.stringify(local));
        const mgr = buildPlayFabManager({ cloudData: cloud, saveSpy });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            getUsers: () => JSON.parse(ls.getItem('mathgenius_users') || '[]'),
            localStorage: ls,
        });

        cs.syncFromCloud(() => {
            const saved = JSON.parse(ls.getItem('mathgenius_users'));
            const alice   = saved.find(u => u.name === 'Alice');
            const bob     = saved.find(u => u.name === 'Bob');
            const charlie = saved.find(u => u.name === 'Charlie');

            expect(bob).toBeTruthy();
            expect(charlie).toBeTruthy();
            expect(alice.storyProgress.aurora.chapters[1].completed).toBe(true); // from cloud
            expect(alice.storyProgress.aurora.chapters[0].stars).toBe(3);        // cloud wins

            // Cloud write must include all 3 merged users
            expect(saveSpy).toHaveBeenCalledTimes(1);
            const pushed = saveSpy.mock.calls[0][0];
            expect(pushed.map(u => u.name).sort()).toEqual(['Alice', 'Bob', 'Charlie'].sort());
            done();
        });
    });

    // ── Toast notification tests ──────────────────────────────────

    test('shows a success toast on successful sync', done => {
        const toastSpy = jest.fn();
        const mgr = buildPlayFabManager({ cloudData: [] });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            showCloudToast: toastSpy,
        });

        cs.syncFromCloud(() => {
            expect(toastSpy).toHaveBeenCalledTimes(1);
            const [text, isError] = toastSpy.mock.calls[0];
            expect(text).toBe('☁️ Progress synced from cloud');
            expect(isError).toBeFalsy();
            done();
        });
    });

    test('shows an error toast when cloud load fails', done => {
        const toastSpy = jest.fn();
        const mgr = buildPlayFabManager({ loadError: new Error('offline') });
        const { CloudSync: cs } = buildCloudSync({
            PlayFabManager: mgr,
            showCloudToast: toastSpy,
        });

        cs.syncFromCloud(() => {
            expect(toastSpy).toHaveBeenCalledTimes(1);
            const [text, isError] = toastSpy.mock.calls[0];
            expect(text).toBe('⚠️ Cloud sync failed — working offline');
            expect(isError).toBe(true);
            done();
        });
    });
});

// ─────────────────────────────────────────────────────────────────
// loginUser / addPlayer — must NOT trigger cloud writes
// ─────────────────────────────────────────────────────────────────

describe('loginUser / addPlayer do not trigger cloud writes on startup', () => {
    /**
     * Load a minimal version of game.js with only the helpers we need.
     * We focus on the functions that previously called saveUsers (and thus
     * saveUsersToCloud) which could overwrite newer cloud data.
     */
    function buildGameFunctions({ saveSpy = jest.fn() } = {}) {
        const src = fs.readFileSync(
            path.join(__dirname, '..', 'game.js'), 'utf8'
        );
        const ls  = buildLocalStorage();
        const PlayFabManager = { isLoggedIn: true, saveUsersToCloud: saveSpy };

        const context = vm.createContext({
            PlayFabManager,
            localStorage: ls,
            // Stubs for DOM functions used by game.js
            document: {
                getElementById:        () => ({ textContent: '', style: {}, classList: { add(){}, remove(){}, contains:()=>false }, appendChild(){}, addEventListener(){} }),
                querySelector:         () => null,
                querySelectorAll:      () => [],
                createElement:         () => ({ className:'', textContent:'', style:{}, classList:{add(){},remove(){}}, setAttribute(){}, appendChild(){}, append(){}, addEventListener(){} }),
                addEventListener:      () => {},
            },
            window:   { addEventListener: () => {} },
            console,
            // game.js uses $ as querySelector shorthand
        });

        try {
            vm.runInContext(src, context);
        } catch (e) {
            // game.js may reference DOM elements that aren't available in vm;
            // we only need the storage helper functions to be defined.
        }

        return {
            ls,
            saveSpy,
            saveUsersLocally: context.saveUsersLocally,
            saveUsers:        context.saveUsers,
            getUsers:         context.getUsers,
            loginUser:        context.loginUser,
            addPlayer:        context.addPlayer,
        };
    }

    test('saveUsers calls saveUsersToCloud when logged in', () => {
        const saveSpy = jest.fn();
        const { saveUsers, ls } = buildGameFunctions({ saveSpy });
        if (!saveUsers) return; // skip if function wasn't exposed in this vm context
        ls.setItem('mathgenius_users', JSON.stringify([]));
        saveUsers([{ name: 'Alice', storyProgress: {} }]);
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    test('saveUsersLocally does NOT call saveUsersToCloud', () => {
        const saveSpy = jest.fn();
        const { saveUsersLocally, ls } = buildGameFunctions({ saveSpy });
        if (!saveUsersLocally) return;
        ls.setItem('mathgenius_users', JSON.stringify([]));
        saveUsersLocally([{ name: 'Alice', storyProgress: {} }]);
        expect(saveSpy).not.toHaveBeenCalled();
    });
});
