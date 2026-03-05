import { TsyneTest } from 'tsyne';
import { buildClaudeUsageApp, UsageStore, parseUsageResponse, formatRelativeTime, formatTimeAgo } from './index';
import PouchDB from 'pouchdb';
import PouchDBMemoryAdapter from 'pouchdb-adapter-memory';
import * as child_process from 'child_process';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  exec: jest.fn(),
}));

PouchDB.plugin(PouchDBMemoryAdapter);

let dbCounter = 0;

function createMemoryDB(): PouchDB.Database {
  return new PouchDB(`test-claude-usage-${Date.now()}-${dbCounter++}`, { adapter: 'memory' });
}

// ============================================================================
// Unit tests for helpers (no bridge needed)
// ============================================================================

describe('parseUsageResponse', () => {
  it('maps snake_case API fields to camelCase', () => {
    const raw = {
      five_hour: { utilization: 45.2, resets_at: '2025-01-01T12:00:00Z' },
      seven_day: { utilization: 68.0, resets_at: '2025-01-05T12:00:00Z' },
      seven_day_opus: null,
      seven_day_sonnet: null,
      extra_usage: {
        is_enabled: true,
        utilization: 30,
        used_credits: 12.50,
        monthly_limit: 100.00,
      },
    };
    const result = parseUsageResponse(raw);
    expect(result.fiveHour?.utilization).toBe(45.2);
    expect(result.fiveHour?.resetsAt).toBe('2025-01-01T12:00:00Z');
    expect(result.sevenDay?.utilization).toBe(68);
    expect(result.extraUsage?.isEnabled).toBe(true);
    expect(result.extraUsage?.usedCredits).toBe(12.50);
    expect(result.extraUsage?.monthlyLimit).toBe(100);
  });

  it('handles null/missing fields gracefully', () => {
    const result = parseUsageResponse({});
    expect(result.fiveHour).toBeNull();
    expect(result.sevenDay).toBeNull();
    expect(result.extraUsage).toBeNull();
  });

  it('also accepts already-camelCase input (for tests)', () => {
    const raw = {
      fiveHour: { utilization: 10, resetsAt: '2025-01-01T12:00:00Z' },
      sevenDay: { utilization: 20 },
    };
    const result = parseUsageResponse(raw);
    expect(result.fiveHour?.utilization).toBe(10);
    expect(result.sevenDay?.utilization).toBe(20);
  });
});

describe('formatRelativeTime', () => {
  it('formats future time as relative', () => {
    const future = new Date(Date.now() + 3 * 3600000 + 50 * 60000).toISOString();
    const result = formatRelativeTime(future);
    expect(result).toMatch(/3 hr/);
    expect(result).toMatch(/min/);
  });

  it('returns "now" for past dates', () => {
    expect(formatRelativeTime(new Date(Date.now() - 1000).toISOString())).toBe('now');
  });
});

describe('formatTimeAgo', () => {
  it('formats past time as relative', () => {
    const past = new Date(Date.now() - 63000).toISOString(); // 1 min 3 sec ago
    const result = formatTimeAgo(past);
    expect(result).toMatch(/1 min/);
    expect(result).toMatch(/ago/);
  });

  it('returns "just now" for very recent', () => {
    expect(formatTimeAgo(new Date().toISOString())).toBe('just now');
  });
});

// ============================================================================
// UsageStore PouchDB persistence tests
// ============================================================================

describe('UsageStore persistence', () => {
  let pouchdb: PouchDB.Database;

  afterEach(async () => {
    if (pouchdb) await pouchdb.destroy();
  });

  it('should persist data points to PouchDB and reload them', async () => {
    pouchdb = createMemoryDB();

    // Write data via store1
    const store1 = new UsageStore(pouchdb);
    await store1.initialize();
    store1.setUsage({
      fiveHour: { utilization: 45, resetsAt: '2025-01-01T12:00:00Z' },
      sevenDay: { utilization: 20, resetsAt: '2025-01-05T12:00:00Z' },
      sevenDayOpus: null,
      sevenDaySonnet: null,
      extraUsage: null,
    });

    // Give fire-and-forget write time to complete
    await new Promise(r => setTimeout(r, 100));

    // Read data via store2 from the same DB
    const store2 = new UsageStore(pouchdb);
    await store2.initialize();
    const history = store2.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].pct5h).toBeCloseTo(0.45);
    expect(history[0].pct7d).toBeCloseTo(0.20);
  });

  it('should prune data points older than 30 days on initialize', async () => {
    pouchdb = createMemoryDB();

    // Insert an old data point directly into PouchDB
    const oldTimestamp = new Date(Date.now() - 31 * 86400 * 1000).toISOString();
    const recentTimestamp = new Date().toISOString();
    await pouchdb.bulkDocs([
      { _id: `dp-${oldTimestamp}`, type: 'datapoint', timestamp: oldTimestamp, pct5h: 0.5, pct7d: 0.3 },
      { _id: `dp-${recentTimestamp}`, type: 'datapoint', timestamp: recentTimestamp, pct5h: 0.6, pct7d: 0.4 },
    ]);

    const store = new UsageStore(pouchdb);
    await store.initialize();
    const history = store.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].pct5h).toBeCloseTo(0.6);

    // Verify old doc was actually deleted from PouchDB
    const result = await pouchdb.allDocs({ startkey: 'dp-', endkey: 'dp-\ufff0' });
    expect(result.rows.length).toBe(1);
  });
});

// ============================================================================
// Integration tests (require bridge)
// ============================================================================

function createMockDB(): PouchDB.Database {
  return {
    allDocs: () => Promise.resolve({ rows: [] }),
    put: () => Promise.resolve({ ok: true, id: '', rev: '' }),
    bulkDocs: () => Promise.resolve([]),
  } as any;
}

describe('Claude Usage Bar', () => {
  let tsyneTest: TsyneTest;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
    // Mock fetch
    global.fetch = jest.fn() as any;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Clean up token file for tests
    const fs = require('fs');
    const path = require('path');
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const tokenFile = path.join(home, '.config', 'claude-usage-bar', 'token');
    if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
  });

  it('should show sign in screen when unauthenticated', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildClaudeUsageApp(app, createMockDB());
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('sign-in-btn').shouldExist();
    await ctx.assertHasText('Sign in to view your usage.');
  });

  it('should transition to awaiting code screen when sign in is clicked', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildClaudeUsageApp(app, createMockDB());
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('sign-in-btn').click();

    await ctx.assertHasText('Paste the code from your browser:');
    await ctx.getById('code-entry').shouldExist();
  });

  it('should show error if token exchange fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid grant',
    });

    const testApp = await tsyneTest.createApp((app) => {
      buildClaudeUsageApp(app, createMockDB());
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('sign-in-btn').click();
    await ctx.getById('code-entry').type('mycode');
    await ctx.getById('submit-code-btn').click();

    await ctx.getById('error-label').within(1000).shouldContain('Token exchange failed: 400 Invalid grant');
  });

  it('should show usage data after successful sign in (snake_case API)', async () => {
    // 1. Mock token exchange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'fake-token' }),
    });

    // 2. Mock usage fetch — returns snake_case like the real API
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        five_hour: { utilization: 45, resets_at: '2025-01-01T12:00:00Z' },
        seven_day: { utilization: 20, resets_at: '2025-01-05T12:00:00Z' },
        extra_usage: { is_enabled: false }
      }),
    });

    const testApp = await tsyneTest.createApp((app) => {
      buildClaudeUsageApp(app, createMockDB());
    });
    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('sign-in-btn').click();
    await ctx.getById('code-entry').type('mycode');
    await ctx.getById('submit-code-btn').click();

    await ctx.waitForCondition(async () => {
        return await ctx.hasText('45%') && await ctx.hasText('20%');
    }, { timeout: 2000 });

    await ctx.assertHasText('45%');
    await ctx.assertHasText('20%');
    await ctx.assertHasText('5-Hour Window');
    await ctx.assertHasText('7-Day Window');
  });
});
