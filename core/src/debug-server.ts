/**
 * Shared Debug Server
 *
 * HTTP server for remote debugging and inspection of Tsyne applications.
 * Provides core endpoints for widget tree queries, clicking, typing,
 * screenshots, and window management. Launchers add their own custom
 * endpoints (e.g., /apps, /launch, /state) via the IDebugHost interface.
 *
 * Auth: TSYNE_DEBUG_TOKEN env > explicit token > random. Always enforced.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { App } from './app';
import { Window } from './window';
import { Inspector } from './inspector';

/**
 * Interface for debug host (implemented by launchers like Desktop, PhoneTop,
 * or the simple DebugLauncher for standalone apps).
 */
export interface IDebugHost {
  /** Main window for tree queries, screenshot, resize */
  readonly mainWindow: Window | null;
  /** Handle launcher-specific endpoints; return true if handled */
  handleCustomEndpoint?(url: URL, res: http.ServerResponse): Promise<boolean>;
  /** Extra endpoint docs for the / index */
  getCustomEndpoints?(): Record<string, string>;
}

export interface DebugServerOptions {
  port: number;
  token?: string;
  bindAddress?: string;
  label?: string;
}

/**
 * Shared debug server with auth, core widget endpoints, and extensible
 * custom endpoints via IDebugHost.
 */
export class DebugServer {
  private server: http.Server | null = null;
  private sockets: Set<import('net').Socket> = new Set();
  private inspector: Inspector;
  private host: IDebugHost;
  private app: App;
  private token: string;
  private port: number;
  private bindAddress: string;
  private label: string;

  constructor(app: App, host: IDebugHost, options: DebugServerOptions) {
    this.app = app;
    this.host = host;
    this.port = options.port;
    this.bindAddress = options.bindAddress || '0.0.0.0';
    this.label = options.label || 'debug';
    this.inspector = new Inspector(app.getContext().bridge);

    // Auth: env > explicit > random
    this.token = process.env.TSYNE_DEBUG_TOKEN
      || options.token
      || crypto.randomBytes(16).toString('hex');
    console.log(`[${this.label}] Debug token: ${this.token}`);
  }

  getToken(): string {
    return this.token;
  }

  start(): void {
    this.server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${this.port}`);

      // Check authentication (query param or header)
      const tokenParam = url.searchParams.get('token');
      const tokenHeader = req.headers['x-debug-token'] as string | undefined;
      const providedToken = tokenParam || tokenHeader;

      if (providedToken !== this.token) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized - invalid or missing token' }));
        return;
      }

      try {
        await this.handleRequest(url, res);
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    // Track connections for clean shutdown
    this.server.on('connection', (socket) => {
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
    });

    this.server.listen(this.port, this.bindAddress, () => {
      console.log(`[${this.label}] Debug server listening on http://${this.bindAddress}:${this.port}`);
    });
  }

  stop(): void {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  /**
   * Find the deepest widget containing the given absolute coordinates.
   * If the deepest widget has a path-style ID (e.g., "root.0.0.1"), walks up
   * the parent chain to find the nearest clickable ancestor with a bridge ID.
   */
  public findWidgetAtPoint(node: any, x: number, y: number, clickableParent?: any): any | null {
    const inBounds = node.visible !== false &&
      x >= node.absX && x < node.absX + node.w &&
      y >= node.absY && y < node.absY + node.h;

    if (!inBounds) return null;

    // Track clickable parents (widgets with bridge-style IDs that can be clicked)
    const isBridgeId = node.id && node.id.startsWith('_');
    const isClickable = node.type === 'ClickableContainer' || node.type === 'Button' || node.type === 'TsyneButton';
    const newClickableParent = (isBridgeId && isClickable) ? node : clickableParent;

    if (node.children && node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const childMatch = this.findWidgetAtPoint(node.children[i], x, y, newClickableParent);
        if (childMatch) return childMatch;
      }
    }

    // If this widget has a path-style ID (not clickable), return the clickable parent instead
    const hasPathStyleId = node.id && node.id.startsWith('root.');
    if (hasPathStyleId && newClickableParent) {
      return newClickableParent;
    }

    return node;
  }

  private async handleRequest(url: URL, res: http.ServerResponse): Promise<void> {
    const { host } = this;

    // Try custom endpoints first (host can handle launcher-specific routes)
    if (host.handleCustomEndpoint) {
      const handled = await host.handleCustomEndpoint(url, res);
      if (handled) return;
    }

    // Core endpoints
    if (url.pathname === '/') {
      const coreEndpoints: Record<string, string> = {
        '/': 'This index',
        '/windows': 'List all window IDs',
        '/tree': 'Get widget tree for main window',
        '/tree/:windowId': 'Get widget tree for a window',
        '/widget/:id': 'Get single widget by ID (internal or custom)',
        '/widget-at?x=N&y=N': 'Find widget at coordinates',
        '/click?x=N&y=N': 'Click widget at coordinates',
        '/click?id=widgetId': 'Click widget by ID',
        '/doubleClick?id=widgetId': 'Double-click widget by ID',
        '/doubleClick?x=N&y=N': 'Double-click widget at coordinates',
        '/type?id=widgetId&text=hello': 'Type text into widget',
        '/type?x=N&y=N&text=hello': 'Type text into widget at coordinates',
        '/screenshot': 'Capture window screenshot (returns base64 PNG)',
        '/window/size': 'Get window dimensions',
        '/window/resize?w=N&h=N': 'Resize main window',
      };
      const customEndpoints = host.getCustomEndpoints?.() || {};

      res.writeHead(200);
      res.end(JSON.stringify({ endpoints: { ...coreEndpoints, ...customEndpoints } }, null, 2));

    } else if (url.pathname === '/windows') {
      const windows = await this.inspector.listWindows();
      res.writeHead(200);
      res.end(JSON.stringify({ windows }, null, 2));

    } else if (url.pathname === '/tree') {
      if (!host.mainWindow) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.mainWindow.id);
      res.writeHead(200);
      res.end(JSON.stringify({ tree }, null, 2));

    } else if (url.pathname.startsWith('/tree/')) {
      const windowId = url.pathname.slice(6);
      const tree = await this.inspector.getWindowTree(windowId);
      res.writeHead(200);
      res.end(JSON.stringify({ tree }, null, 2));

    } else if (url.pathname.startsWith('/widget/')) {
      const widgetId = decodeURIComponent(url.pathname.slice(8));
      if (!host.mainWindow) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.mainWindow.id);
      const widget = this.inspector.findById(tree, widgetId)
                  || this.inspector.findByCustomId(tree, widgetId);
      if (!widget) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Widget not found', id: widgetId }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ widget }, null, 2));

    } else if (url.pathname === '/widget-at') {
      const x = parseFloat(url.searchParams.get('x') || '0');
      const y = parseFloat(url.searchParams.get('y') || '0');
      if (!host.mainWindow) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.mainWindow.id);
      const widget = this.findWidgetAtPoint(tree, x, y);
      res.writeHead(200);
      res.end(JSON.stringify({ x, y, widget: widget || null }, null, 2));

    } else if (url.pathname === '/click') {
      const id = url.searchParams.get('id');
      const x = url.searchParams.get('x');
      const y = url.searchParams.get('y');
      let widgetId = id;

      if (!widgetId && x && y && host.mainWindow) {
        const tree = await this.inspector.getWindowTree(host.mainWindow.id);
        const clickedWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
        if (clickedWidget) widgetId = clickedWidget.id;
      }
      if (!widgetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No widget found. Provide id= or x=&y= params' }));
        return;
      }
      await this.app.getContext().bridge.send('clickWidget', { widgetId });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, clicked: widgetId }, null, 2));

    } else if (url.pathname === '/doubleClick') {
      const id = url.searchParams.get('id');
      const x = url.searchParams.get('x');
      const y = url.searchParams.get('y');
      let widgetId = id;

      if (!widgetId && x && y && host.mainWindow) {
        const tree = await this.inspector.getWindowTree(host.mainWindow.id);
        const clickedWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
        if (clickedWidget) widgetId = clickedWidget.id;
      }
      if (!widgetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No widget found. Provide id= or x=&y= params' }));
        return;
      }
      await this.app.getContext().bridge.send('doubleTapWidget', { widgetId });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, doubleClicked: widgetId }, null, 2));

    } else if (url.pathname === '/type') {
      const id = url.searchParams.get('id');
      const x = url.searchParams.get('x');
      const y = url.searchParams.get('y');
      const text = url.searchParams.get('text') || '';
      let widgetId = id;

      if (!widgetId && x && y && host.mainWindow) {
        const tree = await this.inspector.getWindowTree(host.mainWindow.id);
        const widget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
        if (widget) widgetId = widget.id;
      }
      if (!widgetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No widget found. Provide id= or x=&y= params' }));
        return;
      }
      await this.app.getContext().bridge.send('typeText', { widgetId, text });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, typed: text, into: widgetId }, null, 2));

    } else if (url.pathname === '/screenshot') {
      if (!host.mainWindow) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tempPath = path.join(os.tmpdir(), `tsyne-screenshot-${Date.now()}.png`);
      try {
        await host.mainWindow.screenshot(tempPath);
        const imageBuffer = fs.readFileSync(tempPath);
        const base64 = imageBuffer.toString('base64');
        fs.unlinkSync(tempPath);
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          format: 'png',
          encoding: 'base64',
          data: base64,
        }, null, 2));
      } catch (screenshotErr) {
        try { fs.unlinkSync(tempPath); } catch {}
        res.writeHead(500);
        res.end(JSON.stringify({ error: `Screenshot failed: ${screenshotErr}` }));
      }

    } else if (url.pathname === '/window/size') {
      if (!host.mainWindow) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.mainWindow.id);
      res.writeHead(200);
      res.end(JSON.stringify({ width: tree.w, height: tree.h }, null, 2));

    } else if (url.pathname === '/window/resize') {
      const w = parseInt(url.searchParams.get('w') || '0', 10);
      const h = parseInt(url.searchParams.get('h') || '0', 10);
      if (!w || !h) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing w= and h= params' }));
        return;
      }
      if (!host.mainWindow) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      await host.mainWindow.resize(w, h);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, width: w, height: h }, null, 2));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }
}
