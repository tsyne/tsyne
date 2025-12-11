/**
 * Resource Fetcher
 *
 * Downloads HTTP resources (images, etc.) to local temp files for use by Fyne
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { URL } from 'url';

/**
 * Resource cache entry
 */
interface CacheEntry {
  localPath: string;
  url: string;
  timestamp: number;
}

/**
 * Resource Fetcher
 * Downloads and caches resources from HTTP servers
 */
export class ResourceFetcher {
  private cacheDir: string;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheMaxAge = 3600000; // 1 hour in milliseconds

  constructor() {
    // Create cache directory in system temp
    this.cacheDir = path.join(os.tmpdir(), 'tsyne-resource-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Fetch a resource and return local path
   * @param resourceUrl - URL or path to resource
   * @param baseUrl - Base URL to resolve relative paths against
   * @returns Local filesystem path to cached resource
   */
  async fetchResource(resourceUrl: string, baseUrl: string): Promise<string> {
    // Resolve relative URLs
    const fullUrl = this.resolveUrl(resourceUrl, baseUrl);

    // Check cache first
    const cached = this.cache.get(fullUrl);
    if (cached && this.isCacheValid(cached)) {
      console.log(`[ResourceFetcher] Cache hit: ${fullUrl} -> ${cached.localPath}`);
      return cached.localPath;
    }

    // Download resource
    console.log(`[ResourceFetcher] Fetching: ${fullUrl}`);
    const localPath = await this.downloadResource(fullUrl);

    // Cache it
    this.cache.set(fullUrl, {
      localPath,
      url: fullUrl,
      timestamp: Date.now()
    });

    return localPath;
  }

  /**
   * Fetch multiple resources in parallel
   */
  async fetchResources(
    resourceUrls: string[],
    baseUrl: string
  ): Promise<Map<string, string>> {
    const resourceMap = new Map<string, string>();

    // Fetch all resources in parallel
    const results = await Promise.all(
      resourceUrls.map(async (url) => {
        try {
          const localPath = await this.fetchResource(url, baseUrl);
          return { url, localPath, success: true };
        } catch (error) {
          console.error(`[ResourceFetcher] Failed to fetch ${url}:`, error);
          return { url, localPath: '', success: false };
        }
      })
    );

    // Build map of successful fetches
    for (const result of results) {
      if (result.success) {
        resourceMap.set(result.url, result.localPath);
      }
    }

    return resourceMap;
  }

  /**
   * Resolve relative URL against base URL
   */
  private resolveUrl(resourceUrl: string, baseUrl: string): string {
    try {
      // If resourceUrl is already absolute, use it as-is
      if (resourceUrl.startsWith('http://') || resourceUrl.startsWith('https://')) {
        return resourceUrl;
      }

      // Otherwise resolve against base URL
      const base = new URL(baseUrl);
      const resolved = new URL(resourceUrl, base);
      return resolved.href;
    } catch (error) {
      console.error(`[ResourceFetcher] URL resolution failed: ${resourceUrl} + ${baseUrl}`, error);
      return resourceUrl;
    }
  }

  /**
   * Download resource from HTTP/HTTPS to local file
   */
  private async downloadResource(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`[ResourceFetcher] Starting download: ${url}`);
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      // Generate cache file path from URL hash
      const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
      const ext = path.extname(urlObj.pathname) || '.dat';
      const localPath = path.join(this.cacheDir, `${hash}${ext}`);

      // Make HTTP request with 5 second timeout
      const req = client.get(url, (res) => {
        console.log(`[ResourceFetcher] Got response: HTTP ${res.statusCode}`);

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }

        // Write to file
        const fileStream = fs.createWriteStream(localPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`[ResourceFetcher] Downloaded: ${url} -> ${localPath}`);
          resolve(localPath);
        });

        fileStream.on('error', (err) => {
          console.error(`[ResourceFetcher] File stream error:`, err);
          fs.unlink(localPath, () => {}); // Clean up partial file
          reject(err);
        });
      });

      req.on('error', (err) => {
        console.error(`[ResourceFetcher] Request error:`, err);
        reject(err);
      });

      // Add 5 second timeout for HTTP request
      req.setTimeout(5000, () => {
        console.error(`[ResourceFetcher] Request timeout for ${url}`);
        req.destroy();
        reject(new Error(`Request timeout: ${url}`));
      });
    });
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.cacheMaxAge && fs.existsSync(entry.localPath);
  }

  /**
   * Clear the resource cache
   */
  clearCache(): void {
    this.cache.clear();
    // Optionally delete cache files
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    } catch (error) {
      console.error('[ResourceFetcher] Failed to clear cache:', error);
    }
  }
}
