/**
 * Desktop Debug Server
 *
 * Thin adapter that delegates to the shared DebugServer for core widget
 * inspection endpoints, and adds desktop-specific routes (/icons, /launch,
 * /apps, /state, /app/switchTo, /app/quit).
 */

import * as http from 'http';
import { App } from 'tsyne';
import { Window } from 'tsyne';
import { AppMetadata } from 'tsyne';
import { DebugServer, IDebugHost } from 'tsyne';
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
 * Debug server for remote desktop inspection and control.
 * Wraps the shared DebugServer and adds desktop-specific endpoints.
 */
export class DesktopDebugServer {
  private debugServer: DebugServer;

  constructor(app: App, host: IDesktopDebugHost, port: number) {
    const debugHost: IDebugHost = {
      get mainWindow() { return host.win; },

      async handleCustomEndpoint(url: URL, res: http.ServerResponse): Promise<boolean> {
        if (url.pathname === '/icons') {
          const icons = host.icons.map(icon => ({
            name: icon.metadata.name,
            filePath: icon.metadata.filePath,
            category: icon.metadata.category,
            x: icon.x,
            y: icon.y
          }));
          res.writeHead(200);
          res.end(JSON.stringify({ icons, count: icons.length }, null, 2));
          return true;

        } else if (url.pathname === '/launch') {
          const name = url.searchParams.get('name');
          if (!name) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing name= param' }));
            return true;
          }
          const icon = host.icons.find(i =>
            i.metadata.name.toLowerCase() === name.toLowerCase() ||
            i.metadata.name.toLowerCase().includes(name.toLowerCase())
          );
          if (!icon) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', name }));
            return true;
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
          return true;

        } else if (url.pathname === '/apps') {
          const apps: any[] = [];
          for (const [id, app] of host.openApps) {
            apps.push({ id, name: app.metadata.name });
          }
          res.writeHead(200);
          res.end(JSON.stringify({ apps }, null, 2));
          return true;

        } else if (url.pathname === '/state') {
          res.writeHead(200);
          res.end(JSON.stringify({
            iconCount: host.icons.length,
            openAppCount: host.openApps.size,
            dockedApps: host.dockedApps,
          }, null, 2));
          return true;

        } else if (url.pathname === '/app/switchTo') {
          const appId = url.searchParams.get('id');
          if (!appId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing id= param' }));
            return true;
          }
          if (!host.openApps.has(appId)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', id: appId }));
            return true;
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
          return true;

        } else if (url.pathname === '/app/quit') {
          const appId = url.searchParams.get('id');
          if (!appId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing id= param' }));
            return true;
          }
          if (!host.openApps.has(appId)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'App not found', id: appId }));
            return true;
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
          return true;
        }

        return false;
      },

      getCustomEndpoints() {
        return {
          '/icons': 'List all desktop icons (available apps)',
          '/launch?name=appName': 'Launch app by name',
          '/apps': 'List open/running apps',
          '/state': 'Get desktop state',
          '/app/switchTo?id=appId': 'Bring app to front',
          '/app/quit?id=appId': 'Quit app by id',
        };
      }
    };

    this.debugServer = new DebugServer(app, debugHost, { port, label: 'desktop' });
  }

  start(): void {
    this.debugServer.start();
  }

  stop(): void {
    this.debugServer.stop();
  }
}
