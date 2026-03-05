import { App, Window } from 'tsyne';
import { cvg } from 'cosyne';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';

/**
 * Claude Usage Bar - Tsyne Port
 *
 * @tsyne-app:name Claude Usage
 * @tsyne-app:icon <svg viewBox="0 0 248 248"><path d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z" fill="currentColor"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder buildClaudeUsageApp
 * @tsyne-app:args app,pouchdb
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface UsageBucket {
  utilization: number | null;
  resetsAt: string | null;
}

export interface ExtraUsage {
  isEnabled: boolean;
  utilization: number | null;
  usedCredits: number | null;
  monthlyLimit: number | null;
}

export interface UsageResponse {
  fiveHour: UsageBucket | null;
  sevenDay: UsageBucket | null;
  sevenDayOpus: UsageBucket | null;
  sevenDaySonnet: UsageBucket | null;
  extraUsage: ExtraUsage | null;
}

export interface UsageDataPoint {
  id: string;
  timestamp: string; // ISO string
  pct5h: number;
  pct7d: number;
}

export interface DataPointDoc {
  _id: string;
  _rev?: string;
  type: 'datapoint';
  timestamp: string;
  pct5h: number;
  pct7d: number;
}

export enum TimeRange {
  Hour1 = '1h',
  Hour6 = '6h',
  Day1 = '1d',
  Day7 = '7d',
  Day30 = '30d',
}

const TIME_RANGE_INTERVALS: Record<TimeRange, number> = {
  [TimeRange.Hour1]: 3600,
  [TimeRange.Hour6]: 6 * 3600,
  [TimeRange.Day1]: 86400,
  [TimeRange.Day7]: 7 * 86400,
  [TimeRange.Day30]: 30 * 86400,
};

const TIME_RANGE_POINTS: Record<TimeRange, number> = {
  [TimeRange.Hour1]: 120,
  [TimeRange.Hour6]: 180,
  [TimeRange.Day1]: 200,
  [TimeRange.Day7]: 200,
  [TimeRange.Day30]: 200,
};

// ============================================================================
// HELPERS
// ============================================================================

/** Map snake_case API JSON to camelCase TypeScript interfaces */
export function parseUsageResponse(raw: any): UsageResponse {
  if (!raw) return { fiveHour: null, sevenDay: null, sevenDayOpus: null, sevenDaySonnet: null, extraUsage: null };
  const parseBucket = (b: any): UsageBucket | null => {
    if (!b) return null;
    return { utilization: b.utilization ?? null, resetsAt: b.resets_at ?? b.resetsAt ?? null };
  };
  const parseExtra = (e: any): ExtraUsage | null => {
    if (!e) return null;
    return {
      isEnabled: e.is_enabled ?? e.isEnabled ?? false,
      utilization: e.utilization ?? null,
      usedCredits: e.used_credits ?? e.usedCredits ?? null,
      monthlyLimit: e.monthly_limit ?? e.monthlyLimit ?? null,
    };
  };
  return {
    fiveHour: parseBucket(raw.five_hour ?? raw.fiveHour),
    sevenDay: parseBucket(raw.seven_day ?? raw.sevenDay),
    sevenDayOpus: parseBucket(raw.seven_day_opus ?? raw.sevenDayOpus),
    sevenDaySonnet: parseBucket(raw.seven_day_sonnet ?? raw.sevenDaySonnet),
    extraUsage: parseExtra(raw.extra_usage ?? raw.extraUsage),
  };
}

/** Format a future date as relative time, e.g. "3 hr, 50 min" */
export function formatRelativeTime(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day`);
  if (hours > 0) parts.push(`${hours} hr`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} min`);
  return parts.join(', ');
}

/** Format a past date as relative time, e.g. "1 min, 3 sec ago" */
export function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 1000) return 'just now';
  const totalSec = Math.floor(diff / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (remainMins > 0) parts.push(`${remainMins} min`);
  if (secs > 0 && hours === 0) parts.push(`${secs} sec`);
  return (parts.length > 0 ? parts.join(', ') : '0 sec') + ' ago';
}

const CLAUDE_LOGO_PATH = "M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z";

// ============================================================================
// USAGE STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export class UsageStore {
  private db: PouchDB.Database<DataPointDoc>;
  private revCache: Map<string, string> = new Map();
  private usage: UsageResponse | null = null;
  private history: UsageDataPoint[] = [];
  private isAuthenticated = false;
  private isAwaitingCode = false;
  private lastError: string | null = null;
  private lastUpdated: string | null = null;
  private changeListeners: ChangeListener[] = [];
  private selectedRange: TimeRange = TimeRange.Day1;
  private initialized = false;

  constructor(db: PouchDB.Database) {
    this.db = db as PouchDB.Database<DataPointDoc>;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Load all data points from PouchDB
    const result = await this.db.allDocs({
      include_docs: true,
      startkey: 'dp-',
      endkey: 'dp-\ufff0',
    });

    const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
    const expired: DataPointDoc[] = [];

    for (const row of result.rows) {
      if (row.doc) {
        const doc = row.doc as unknown as DataPointDoc;
        if (doc._rev) this.revCache.set(doc._id, doc._rev);
        if (new Date(doc.timestamp).getTime() <= thirtyDaysAgo) {
          expired.push(doc);
        } else {
          this.history.push({
            id: doc._id,
            timestamp: doc.timestamp,
            pct5h: doc.pct5h,
            pct7d: doc.pct7d,
          });
        }
      }
    }

    // Prune expired docs from PouchDB
    if (expired.length > 0) {
      const toDelete = expired.map(doc => ({
        _id: doc._id,
        _rev: this.revCache.get(doc._id)!,
        _deleted: true as const,
      }));
      await this.db.bulkDocs(toDelete as any);
      for (const doc of expired) this.revCache.delete(doc._id);
    }

  }

  // State Getters
  getUsage() { return this.usage; }
  getHistory() { return [...this.history]; }
  getIsAuthenticated() { return this.isAuthenticated; }
  getIsAwaitingCode() { return this.isAwaitingCode; }
  getLastError() { return this.lastError; }
  getLastUpdated() { return this.lastUpdated; }
  getSelectedRange() { return this.selectedRange; }

  // State Setters
  setUsage(usage: UsageResponse | null) {
    this.usage = usage;
    if (usage) {
      this.lastUpdated = new Date().toISOString();
      this.recordDataPoint(
        (usage.fiveHour?.utilization ?? 0) / 100,
        (usage.sevenDay?.utilization ?? 0) / 100
      );
    }
    this.notifyChange();
  }

  setIsAuthenticated(val: boolean) {
    this.isAuthenticated = val;
    this.notifyChange();
  }

  setIsAwaitingCode(val: boolean) {
    this.isAwaitingCode = val;
    this.notifyChange();
  }

  setLastError(err: string | null) {
    this.lastError = err;
    this.notifyChange();
  }

  setSelectedRange(range: TimeRange) {
    this.selectedRange = range;
    this.notifyChange();
  }

  private recordDataPoint(pct5h: number, pct7d: number) {
    const timestamp = new Date().toISOString();
    const id = `dp-${timestamp}`;
    const point: UsageDataPoint = { id, timestamp, pct5h, pct7d };
    this.history.push(point);
    this.pruneHistory();
    this.putDoc({ _id: id, type: 'datapoint', timestamp, pct5h, pct7d });
  }

  private putDoc(doc: DataPointDoc): void {
    const rev = this.revCache.get(doc._id);
    const toWrite = rev ? { ...doc, _rev: rev } : { ...doc };
    this.db.put(toWrite).then((result) => {
      if (result.ok && result.rev) {
        this.revCache.set(doc._id, result.rev);
      }
    }).catch(() => {
      // Fire-and-forget
    });
  }

  private pruneHistory() {
    const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
    const expired = this.history.filter(p => new Date(p.timestamp).getTime() <= thirtyDaysAgo);
    this.history = this.history.filter(p => new Date(p.timestamp).getTime() > thirtyDaysAgo);

    // Bulk-delete expired docs from PouchDB
    if (expired.length > 0) {
      const toDelete = expired
        .filter(p => this.revCache.has(p.id))
        .map(p => ({ _id: p.id, _rev: this.revCache.get(p.id)!, _deleted: true as const }));
      if (toDelete.length > 0) {
        this.db.bulkDocs(toDelete as any).catch(() => {});
        for (const p of expired) this.revCache.delete(p.id);
      }
    }
  }

  getDownsampledPoints(range: TimeRange): UsageDataPoint[] {
    const interval = TIME_RANGE_INTERVALS[range];
    const targetCount = TIME_RANGE_POINTS[range];
    const now = Date.now();
    const start = now - interval * 1000;

    const filtered = this.history.filter(p => new Date(p.timestamp).getTime() > start);
    if (filtered.length <= targetCount) return filtered;

    const bucketDuration = (interval * 1000) / targetCount;
    const buckets: UsageDataPoint[][] = Array.from({ length: targetCount }, () => []);

    for (const p of filtered) {
      const offset = new Date(p.timestamp).getTime() - start;
      let index = Math.floor(offset / bucketDuration);
      if (index < 0) index = 0;
      if (index >= targetCount) index = targetCount - 1;
      buckets[index].push(p);
    }

    return buckets.map((bucket, i) => {
      if (bucket.length === 0) return null;
      const avgPct5h = bucket.reduce((sum, p) => sum + p.pct5h, 0) / bucket.length;
      const avgPct7d = bucket.reduce((sum, p) => sum + p.pct7d, 0) / bucket.length;
      const avgTime = bucket.reduce((sum, p) => sum + new Date(p.timestamp).getTime(), 0) / bucket.length;
      return {
        id: `bucket-${i}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date(avgTime).toISOString(),
        pct5h: avgPct5h,
        pct7d: avgPct7d,
      };
    }).filter(p => p !== null) as UsageDataPoint[];
  }

  // Observable Pattern
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }
}

// ============================================================================
// USAGE SERVICE (Logic)
// ============================================================================

export class UsageService {
  private pollingTimer: NodeJS.Timeout | null = null;
  private clientId = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
  private redirectUri = "https://console.anthropic.com/oauth/code/callback";
  private tokenEndpoint = "https://console.anthropic.com/v1/oauth/token";
  private usageEndpoint = "https://api.anthropic.com/api/oauth/usage";
  private codeVerifier: string | null = null;
  private oauthState: string | null = null;

  constructor(private store: UsageStore) {
    this.store.setIsAuthenticated(this.loadToken() !== null);
  }

  // Polling
  startPolling() {
    if (this.pollingTimer) return;
    this.fetchUsage();
    this.pollingTimer = setInterval(() => this.fetchUsage(), 60000);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // OAuth Flow
  startOAuthFlow() {
    const verifier = this.generateCodeVerifier();
    const challenge = this.generateCodeChallenge(verifier);
    const state = this.generateCodeVerifier();

    this.codeVerifier = verifier;
    this.oauthState = state;

    const url = new URL("https://claude.ai/oauth/authorize");
    url.searchParams.set("code", "true");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("scope", "user:profile user:inference");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async submitOAuthCode(rawCode: string) {
    const parts = rawCode.trim().split("#");
    const code = parts[0];
    if (parts.length > 1) {
      if (parts[1] !== this.oauthState) {
        this.store.setLastError("OAuth state mismatch — try again");
        this.store.setIsAwaitingCode(false);
        return;
      }
    }

    if (!this.codeVerifier) {
      this.store.setLastError("No pending OAuth flow");
      this.store.setIsAwaitingCode(false);
      return;
    }

    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          state: this.oauthState || "",
          client_id: this.clientId,
          redirect_uri: this.redirectUri,
          code_verifier: this.codeVerifier,
        })
      });

      if (!response.ok) {
        const text = await response.text();
        this.store.setLastError(`Token exchange failed: ${response.status} ${text}`);
        return;
      }

      const json: any = await response.json();
      const accessToken = json.access_token;
      if (!accessToken) {
        this.store.setLastError("Could not parse token response");
        return;
      }

      this.saveToken(accessToken);
      this.store.setIsAuthenticated(true);
      this.store.setIsAwaitingCode(false);
      this.store.setLastError(null);
      await this.fetchUsage();
      this.startPolling();
    } catch (e: any) {
      this.store.setLastError("Token exchange error: " + e.message);
    }
  }

  signOut() {
    this.deleteToken();
    this.store.setIsAuthenticated(false);
    this.store.setUsage(null);
    this.stopPolling();
  }

  // API Fetch
  async fetchUsage() {
    const token = this.loadToken();
    if (!token) {
      this.store.setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(this.usageEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'anthropic-beta': 'oauth-2025-04-20'
        }
      });

      if (response.status === 401) {
        this.store.setLastError("Session expired — please sign in again");
        this.signOut();
        return;
      }

      if (!response.ok) {
        this.store.setLastError(`HTTP ${response.status}`);
        return;
      }

      const raw = await response.json();
      console.log('[claude-usage] API response:', JSON.stringify(raw, null, 2));
      const usage = parseUsageResponse(raw);
      this.store.setUsage(usage);
      this.store.setLastError(null);
    } catch (e: any) {
      this.store.setLastError(e.message);
    }
  }

  // PKCE Helpers
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  // Token persistence
  private getTokenPath() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const dir = path.join(home, '.config', 'claude-usage-bar');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'token');
  }

  private saveToken(token: string) {
    const filePath = this.getTokenPath();
    fs.writeFileSync(filePath, token, { mode: 0o600 });
  }

  private loadToken(): string | null {
    const filePath = this.getTokenPath();
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
    return null;
  }

  private deleteToken() {
    const filePath = this.getTokenPath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

function renderUsageBucket(a: any, label: string, bucket: UsageBucket | null) {
  const pct = (bucket?.utilization ?? 0) / 100;
  const color = pct < 0.6 ? "#2ecc71" : pct < 0.8 ? "#f1c40f" : "#e74c3c";
  const barW = 310;
  const barH = 16;

  a.vbox(() => {
    a.hbox(() => {
      a.label(label);
      a.spacer();
      a.label(`${Math.round(pct * 100)}%`);
    });
    // Colored progress bar via CVG
    cvg(a, { width: barW, height: barH, viewBox: `0 0 ${barW} ${barH}` }, (s) => {
      s.rect({ x: 0, y: 0, width: barW, height: barH, rx: 4, fill: "#e0e0e0" });
      if (pct > 0) {
        s.rect({ x: 0, y: 0, width: Math.max(4, barW * pct), height: barH, rx: 4, fill: color });
      }
    });
    if (bucket?.resetsAt) {
      a.label(`Resets ${formatRelativeTime(bucket.resetsAt)}`);
    }
  });
}

function renderChart(a: any, points: UsageDataPoint[], range: TimeRange) {
  const width = 330;
  const height = 140;
  const leftPad = 10;
  const rightPad = 40;
  const topPad = 10;
  const bottomPad = 20;
  const chartW = width - leftPad - rightPad;
  const chartH = height - topPad - bottomPad;

  if (points.length < 2) {
    a.center(() => a.label("Collecting history data..."));
    return;
  }

  cvg(a, { width, height, viewBox: `0 0 ${width} ${height}` }, (s) => {
    // Background
    s.rect(0, 0, width, height).fill("#f8f9fa").stroke("#dee2e6");

    // Horizontal grid lines + Y-axis labels
    [0, 0.25, 0.5, 0.75, 1].forEach(yPct => {
      const y = topPad + chartH - yPct * chartH;
      s.line(leftPad, y, leftPad + chartW, y).stroke("#e0e0e0", 0.5);
      s.text({ x: leftPad + chartW + 4, y: y + 4, fill: "#888", fontSize: 9 }, `${Math.round(yPct * 100)}%`);
    });

    // Draw data lines
    const drawLine = (color: string, getter: (p: UsageDataPoint) => number) => {
      let pathStr = "";
      points.forEach((p, i) => {
        const x = leftPad + (i / (points.length - 1)) * chartW;
        const y = topPad + chartH - getter(p) * chartH;
        pathStr += (i === 0 ? "M" : "L") + ` ${x} ${y}`;
      });
      s.path({ d: pathStr }).stroke(color, 2).fill("none");
    };

    drawLine("#3498db", p => p.pct5h);
    drawLine("#e67e22", p => p.pct7d);
  });
}

// ============================================================================
// MAIN APP BUILDER
// ============================================================================

export function buildClaudeUsageApp(a: any, pouchdb: PouchDB.Database) {
  const store = new UsageStore(pouchdb);
  const service = new UsageService(store);
  let winRef: any = null;

  const updateUI = async () => {
    if (winRef) winRef.setContent(buildContent);
  };

  store.subscribe(updateUI);

  const buildContent = () => {
    const isAuthenticated = store.getIsAuthenticated();
    const isAwaitingCode = store.getIsAwaitingCode();
    const usage = store.getUsage();
    const error = store.getLastError();

    a.padded(() => {
      a.vbox(() => {
        a.hbox(() => {
          // Claude Logo using CVG
          cvg(a, { width: 24, height: 24, viewBox: "0 0 248 248" }, (s) => {
            s.path({ d: CLAUDE_LOGO_PATH, fill: "#d97757" });
          });
          a.label("Claude Usage", undefined, undefined, undefined, { bold: true });
        });

        a.separator();

        if (!isAuthenticated) {
          if (isAwaitingCode) {
            a.label("Paste the code from your browser:");
            const codeEntry = a.entry("code#state").withId("code-entry");
            a.hbox(() => {
              a.button("Cancel", { onClick: () => store.setIsAwaitingCode(false) });
              a.spacer();
              a.button("Submit", { onClick: async () => {
                const code = await codeEntry.getText();
                await service.submitOAuthCode(code);
              } }).withId("submit-code-btn");
            });
          } else {
            a.label("Sign in to view your usage.");
            a.button("Sign in with Claude", { onClick: () => {
              const url = service.startOAuthFlow();
              // Open URL in system browser
              const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
              exec(`${cmd} '${url}'`);
              store.setIsAwaitingCode(true);
            } }).withId("sign-in-btn");
          }
        } else {
          renderUsageBucket(a, "5-Hour Window", usage?.fiveHour ?? null);
          a.separator();
          renderUsageBucket(a, "7-Day Window", usage?.sevenDay ?? null);
          
          if (usage?.extraUsage?.isEnabled) {
            a.separator();
            const extra = usage.extraUsage;
            a.vbox(() => {
              a.label("Extra Usage");
              a.hbox(() => {
                a.label(`$${extra.usedCredits?.toFixed(2)} / $${extra.monthlyLimit?.toFixed(2)}`);
                a.spacer();
                a.label(`${Math.round((extra.utilization ?? 0))}%`);
              });
              a.progressbar((extra.utilization ?? 0) / 100);
            });
          }

          a.separator();
          // Segmented time range picker via CVG
          const ranges = Object.values(TimeRange);
          const segW = 50;
          const segH = 28;
          const totalW = segW * ranges.length;
          const selected = store.getSelectedRange();
          cvg(a, { width: totalW, height: segH, viewBox: `0 0 ${totalW} ${segH}` }, (s: any) => {
            s.enableEvents();
            // Background pill
            s.rect({ x: 0, y: 0, width: totalW, height: segH, rx: 6, fill: "#e0e0e0" });
            ranges.forEach((range, i) => {
              const x = i * segW;
              const isSelected = range === selected;
              // Selected highlight
              if (isSelected) {
                s.rect({ x: x + 2, y: 2, width: segW - 4, height: segH - 4, rx: 5, fill: "#3498db" });
              }
              // Clickable hit area
              s.rect({ x, y: 0, width: segW, height: segH, fill: "transparent" })
                .onClick(() => store.setSelectedRange(range));
              // Label
              s.text({ x: x + segW / 2, y: segH / 2 + 5, fill: isSelected ? "#ffffff" : "#333333", fontSize: 13, textAnchor: "middle" }, range);
            });
          });
          
          renderChart(a, store.getDownsampledPoints(store.getSelectedRange()), store.getSelectedRange());

          // Chart legend
          a.hbox(() => {
            cvg(a, { width: 10, height: 10, viewBox: "0 0 10 10" }, (s) => {
              s.circle(5, 5, 4).fill("#3498db");
            });
            a.label(" 5h");
            a.spacer();
            cvg(a, { width: 10, height: 10, viewBox: "0 0 10 10" }, (s) => {
              s.circle(5, 5, 4).fill("#e67e22");
            });
            a.label(" 7d");
            a.spacer();
          });

          a.separator();
          a.hbox(() => {
            if (store.getLastUpdated()) {
              a.label(`Updated ${formatTimeAgo(store.getLastUpdated()!)}`);
            }
            a.spacer();
            a.button("Refresh", { onClick: () => service.fetchUsage() }).withId("refresh-btn");
            a.button("Sign Out", { onClick: () => service.signOut() }).withId("sign-out-btn");
          });
        }

        if (error) {
          a.label(error, undefined, "error").withId("error-label");
        }
      });
    });
  };

  return a.window({ title: 'Claude Usage', width: 360, height: 600 }, (win: any) => {
    winRef = win;
    win.setContent(buildContent);
    win.show();
    setTimeout(async () => {
      await store.initialize();
      if (store.getIsAuthenticated()) {
        service.startPolling();
      }
    }, 0);
  });
}

// Standalone execution
if (require.main === module) {
  const PouchDB = require('pouchdb');
  const os = require('os');
  const { app, resolveTransport, standaloneShutdownStrategy } = require('tsyne');
  const dbPath = path.join(os.homedir(), '.tsyne', 'data', 'claude-usage');
  const pouchdb = new PouchDB(dbPath);
  const appInstance = app(resolveTransport(), { title: 'Claude Usage' }, (a: any) => {
    buildClaudeUsageApp(a, pouchdb);
  });
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
