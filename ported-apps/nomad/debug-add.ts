import { TsyneTest } from 'tsyne';
import { buildNomadApp, NomadUI } from './nomad';
import type { App, Window } from 'tsyne';

async function main() {
  const t = new TsyneTest({ headed: false });
  let nomadUI: NomadUI;
  
  await t.createApp((app: App) => {
    app.window({ title: 'Nomad', width: 340, height: 600 }, (win: Window) => {
      nomadUI = buildNomadApp(app, win);
    });
  });
  const ctx = t.getContext();
  
  await new Promise(r => setTimeout(r, 300));
  
  console.log('Initial cities:', nomadUI!.getCities().map(c => c.name));
  await t.screenshot('./screenshots/01-initial.png');
  
  // Remove Edinburgh first
  console.log('Removing Edinburgh...');
  await ctx.getById('nomad-menu-edinburgh').click();
  await new Promise(r => setTimeout(r, 300));
  console.log('Cities after remove:', nomadUI!.getCities().map(c => c.name));
  await t.screenshot('./screenshots/02-after-remove.png');
  
  // Try to add Paris via the dropdown
  console.log('Clicking ADD A PLACE dropdown...');
  await ctx.getById('nomad-add-icon').click();  // Click near the dropdown
  await new Promise(r => setTimeout(r, 500));
  await t.screenshot('./screenshots/03-dropdown-open.png');
  
  console.log('Final cities:', nomadUI!.getCities().map(c => c.name));
  
  await t.cleanup();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
