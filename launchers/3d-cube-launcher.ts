/**
 * 3D Cube Launcher - Test launching 3D Cube with InnerWindow
 */

import { app, resolveTransport, App, Window, InnerWindowAdapter, DesktopMDI } from 'tsyne';
import { create3DCubeApp } from '../ported-apps/3d-cube/index';

app(resolveTransport(), { title: '3D Cube Launcher' }, async (a: App) => {
  a.window({ title: '3D Cube Launcher', width: 800, height: 700 }, (win: Window) => {
    let mdi: DesktopMDI;

    win.setContent(() => {
      a.vbox(() => {
        a.button('Launch 3D Cube').onClick(() => {
          console.log('[Launcher] Button clicked');

          const innerWin = new InnerWindowAdapter(
            a.getContext(),
            mdi,
            win,
            { title: '3D Cube' }
          );

          console.log('[Launcher] Created InnerWindowAdapter');
          create3DCubeApp(a, innerWin);
          console.log('[Launcher] Called create3DCubeApp');
        });

        mdi = a.desktopMDI();
      });
    });
    win.show();
  });
});
