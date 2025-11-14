/**
 * Browser Compatibility Globals Test
 *
 * This example demonstrates the browser-like globals that Tsyne provides:
 * - localStorage (persistent storage)
 * - sessionStorage (in-memory storage)
 * - navigator (browser-like navigator object)
 * - alert() and confirm() dialog functions
 */

import { app } from '../src/index';

app({ title: 'Browser Globals Test' }, (a) => {
  a.window({ title: 'Browser Globals Test', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('=== Browser Compatibility Globals Test ===');
        a.separator();

        // Test navigator
        a.label(`Navigator User Agent: ${navigator.userAgent}`);
        a.label(`Navigator Platform: ${navigator.platform}`);
        a.label(`Navigator Language: ${navigator.language}`);
        a.label(`Navigator Online: ${navigator.onLine}`);
        a.label(`Navigator CPUs: ${navigator.hardwareConcurrency}`);
        a.separator();

        // Test localStorage
        a.button('Test localStorage', () => {
          // Set some data
          localStorage.setItem('name', 'John Doe');
          localStorage.setItem('age', '30');
          localStorage.setItem('city', 'San Francisco');

          // Read it back
          const name = localStorage.getItem('name');
          const age = localStorage.getItem('age');
          const city = localStorage.getItem('city');

          console.log('localStorage test:');
          console.log('  name:', name);
          console.log('  age:', age);
          console.log('  city:', city);
          console.log('  length:', localStorage.length);

          alert(`localStorage contains:\nName: ${name}\nAge: ${age}\nCity: ${city}`);
        });

        a.button('Clear localStorage', () => {
          localStorage.clear();
          console.log('localStorage cleared');
          alert('localStorage has been cleared');
        });

        a.separator();

        // Test sessionStorage
        a.button('Test sessionStorage', () => {
          // Set some data
          sessionStorage.setItem('sessionId', '12345');
          sessionStorage.setItem('tempData', 'This will be lost when app closes');

          // Read it back
          const sessionId = sessionStorage.getItem('sessionId');
          const tempData = sessionStorage.getItem('tempData');

          console.log('sessionStorage test:');
          console.log('  sessionId:', sessionId);
          console.log('  tempData:', tempData);
          console.log('  length:', sessionStorage.length);

          alert(`sessionStorage contains:\nSession ID: ${sessionId}\nTemp Data: ${tempData}`);
        });

        a.button('Clear sessionStorage', () => {
          sessionStorage.clear();
          console.log('sessionStorage cleared');
          alert('sessionStorage has been cleared');
        });

        a.separator();

        // Test alert
        a.button('Test alert()', () => {
          alert('This is an alert dialog!');
        });

        // Test confirm
        a.button('Test confirm()', async () => {
          const result = await confirm('Do you want to continue?');
          console.log('confirm() returned:', result);
          alert(`You clicked: ${result ? 'OK' : 'Cancel'}`);
        });

        a.separator();

        // Test storage persistence
        a.button('Check localStorage persistence', () => {
          const count = localStorage.getItem('launchCount');
          const newCount = count ? parseInt(count) + 1 : 1;
          localStorage.setItem('launchCount', newCount.toString());
          alert(`This app has been launched ${newCount} time(s).\n\nThis data persists across app restarts!`);
        });
      });
    });

    win.show();
  });
});
