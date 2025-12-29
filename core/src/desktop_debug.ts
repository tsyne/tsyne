/**
 * Desktop Debug Server
 *
 * HTTP server for remote debugging and inspection of the desktop environment.
 * Provides endpoints for querying widget trees, clicking widgets, launching apps, etc.
 */

import * as http from 'http';
import { App } from './app';
import { Window } from './window';
import { Inspector } from './inspector';
import { AppMetadata } from './app-metadata';
import { DesktopIcon, OpenApp } from './desktop_types';

/** Interface for desktop state access (implemented by Desktop class) */
export interface IDesktopDebugHost {
  readonly icons: DesktopIcon[];
  readonly openApps: Map<string, OpenApp>;
  readonly dockedApps: string[];
  readonly win: Window | null;
  launchApp(metadata: AppMetadata, filePath?: string): Promise<void>;
  updateRunningApps(): void;
}

/**
 * Debug server for remote desktop inspection and control
 */
export class DesktopDebugServer {
  private server: http.Server | null = null;
  private inspector: Inspector;
  private host: IDesktopDebugHost;
  private app: App;

  constructor(app: App, host: IDesktopDebugHost) {
    this.app = app;
    this.host = host;
    this.inspector = new Inspector(app.getContext().bridge);
  }

  /**
   * Start the debug HTTP server
   */
  start(port: number): void {
    this.server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${port}`);

      try {
        await this.handleRequest(url, res);
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    this.server.listen(port, '0.0.0.0', () => {
      console.log(`[desktop] Debug server listening on http://0.0.0.0:${port}`);
    });
  }

  /**
   * Stop the debug server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  /**
   * Handle an incoming HTTP request
   */
  private async handleRequest(url: URL, res: http.ServerResponse): Promise<void> {
    const { host } = this;

    if (url.pathname === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({
        endpoints: {
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
          '/icons': 'List all desktop icons (available apps)',
          '/launch?name=appName': 'Launch app by name',
          '/apps': 'List open/running apps',
          '/state': 'Get desktop state',
          '/app/switchTo?id=appId': 'Bring app to front',
          '/app/quit?id=appId': 'Quit app by id',
        }
      }, null, 2));

    } else if (url.pathname === '/windows') {
      const windows = await this.inspector.listWindows();
      res.writeHead(200);
      res.end(JSON.stringify({ windows }, null, 2));

    } else if (url.pathname === '/tree') {
      if (!host.win) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.win.id);
      res.writeHead(200);
      res.end(JSON.stringify({ tree }, null, 2));

    } else if (url.pathname.startsWith('/tree/')) {
      const windowId = url.pathname.slice(6);
      const tree = await this.inspector.getWindowTree(windowId);
      res.writeHead(200);
      res.end(JSON.stringify({ tree }, null, 2));

    } else if (url.pathname.startsWith('/widget/')) {
      const widgetId = decodeURIComponent(url.pathname.slice(8));
      if (!host.win) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.win.id);
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
      if (!host.win) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'No main window' }));
        return;
      }
      const tree = await this.inspector.getWindowTree(host.win.id);
      const widget = this.findWidgetAtPoint(tree, x, y);
      res.writeHead(200);
      res.end(JSON.stringify({ x, y, widget: widget || null }, null, 2));

    } else if (url.pathname === '/click') {
      const id = url.searchParams.get('id');
      const x = url.searchParams.get('x');
      const y = url.searchParams.get('y');
      let widgetId = id;

      if (!widgetId && x && y && host.win) {
        const tree = await this.inspector.getWindowTree(host.win.id);
        const clickedWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
        if (clickedWidget) widgetId = clickedWidget.id;
      }
      if (!widgetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No widget found' }));
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

      if (!widgetId && x && y && host.win) {
        const tree = await this.inspector.getWindowTree(host.win.id);
        const clickedWidget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
        if (clickedWidget) widgetId = clickedWidget.id;
      }
      if (!widgetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No widget found' }));
        return;
      }
      await this.app.getContext().bridge.send('doubleTapWidget', { widgetId });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, doubleClicked: widgetId }, null, 2));

    } else if (url.pathname === '/launch') {
      const name = url.searchParams.get('name');
      if (!name) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing name= param' }));
        return;
      }

      const icon = host.icons.find(i =>
        i.metadata.name.toLowerCase() === name.toLowerCase() ||
        i.metadata.name.toLowerCase().includes(name.toLowerCase())
      );

      if (!icon) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'App not found', name }));
        return;
      }

      try {
        await host.launchApp(icon.metadata);
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          launched: icon.metadata.name,
          filePath: icon.metadata.filePath
        }, null, 2));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({
          error: 'Launch failed',
          name: icon.metadata.name,
          details: String(err)
        }));
      }

    } else if (url.pathname === '/type') {
      const id = url.searchParams.get('id');
      const x = url.searchParams.get('x');
      const y = url.searchParams.get('y');
      const text = url.searchParams.get('text') || '';
      let widgetId = id;

      if (!widgetId && x && y && host.win) {
        const tree = await this.inspector.getWindowTree(host.win.id);
        const widget = this.findWidgetAtPoint(tree, parseFloat(x), parseFloat(y));
        if (widget) widgetId = widget.id;
      }
      if (!widgetId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'No widget found' }));
        return;
      }
      await this.app.getContext().bridge.send('typeText', { widgetId, text });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, typed: text, into: widgetId }, null, 2));

    } else if (url.pathname === '/icons') {
      const icons = host.icons.map(icon => ({
        name: icon.metadata.name,
        filePath: icon.metadata.filePath,
        category: icon.metadata.category,
        x: icon.x,
        y: icon.y
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ icons, count: icons.length }, null, 2));

    } else if (url.pathname === '/apps') {
      const apps: any[] = [];
      for (const [id, app] of host.openApps) {
        apps.push({ id, name: app.metadata.name });
      }
      res.writeHead(200);
      res.end(JSON.stringify({ apps }, null, 2));

    } else if (url.pathname === '/state') {
      res.writeHead(200);
      res.end(JSON.stringify({
        iconCount: host.icons.length,
        openAppCount: host.openApps.size,
        dockedApps: host.dockedApps,
      }, null, 2));

    } else if (url.pathname === '/app/switchTo') {
      const appId = url.searchParams.get('id');

      if (!appId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing id= param' }));
        return;
      }

      if (!host.openApps.has(appId)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'App not found', id: appId }));
        return;
      }

      const openApp = host.openApps.get(appId)!;
      await openApp.tsyneWindow.bringToFront();
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        action: 'switchTo',
        appId,
        appName: openApp.metadata.name,
      }, null, 2));

    } else if (url.pathname === '/app/quit') {
      const appId = url.searchParams.get('id');

      if (!appId) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing id= param' }));
        return;
      }

      if (!host.openApps.has(appId)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'App not found', id: appId }));
        return;
      }

      const openApp = host.openApps.get(appId)!;
      const appName = openApp.metadata.name;
      await openApp.tsyneWindow.close();
      host.openApps.delete(appId);
      host.updateRunningApps();
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        action: 'quit',
        quitAppId: appId,
        quitAppName: appName,
      }, null, 2));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Find the deepest widget containing the given absolute coordinates.
   */
  private findWidgetAtPoint(node: any, x: number, y: number): any | null {
    const inBounds = node.visible !== false &&
      x >= node.absX && x < node.absX + node.w &&
      y >= node.absY && y < node.absY + node.h;
    if (!inBounds) return null;

    if (node.children && node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const childMatch = this.findWidgetAtPoint(node.children[i], x, y);
        if (childMatch) return childMatch;
      }
    }
    return node;
  }
}
