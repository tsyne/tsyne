import { app, resolveTransport  } from '../core/src';

/**
 * Keyable Demo - Demonstrates the desktop.Keyable interface
 *
 * Shows: onKeyDown, onKeyUp
 * Use case: Keyboard input tracker / mini typing game
 */

app(resolveTransport(), { title: "Keyable Demo" }, (a) => {
  a.window({ title: "Keyable Demo - Keyboard Tracker", width: 550, height: 550 }, () => {
    // State tracking
    let keyHistory: string[] = [];
    let currentlyPressed: Set<string> = new Set();
    let keyPressCount = 0;
    let lastKeyTime: number | null = null;

    let statusLabel: any;
    let currentKeysLabel: any;
    let historyLabel: any;
    let statsLabel: any;
    let wpmLabel: any;

    a.vbox(() => {
      a.label("=== Keyable Interface Demo ===");
      a.label("Focus a button, then press keys to track input!");
      a.separator();

      // Status display
      statusLabel = a.label("Status: Click a button to focus it");
      currentKeysLabel = a.label("Currently pressed: (none)");
      historyLabel = a.label("Key history: (empty)");
      statsLabel = a.label("Total key presses: 0");
      wpmLabel = a.label("Keys per second: -");

      a.separator();
      a.label("Main Keyboard Input Area:");
      a.label("(Click this button, then type!)");

      // Main keyboard input button
      const inputBtn = a.button("[ Click here, then type! ]").onClick(() => {
        statusLabel.setText("Button clicked - now type on your keyboard!");
      });

      inputBtn.onKeyDown((event) => {
        const key = event.key;
        currentlyPressed.add(key);
        keyPressCount++;

        // Calculate keys per second
        const now = Date.now();
        if (lastKeyTime) {
          const timeDiff = (now - lastKeyTime) / 1000;
          if (timeDiff > 0 && timeDiff < 5) { // Ignore gaps > 5 seconds
            const kps = (1 / timeDiff).toFixed(1);
            wpmLabel.setText(`Keys per second: ${kps}`);
          }
        }
        lastKeyTime = now;

        // Update displays
        statusLabel.setText(`Key DOWN: "${key}"`);
        currentKeysLabel.setText(`Currently pressed: ${[...currentlyPressed].join(' + ') || '(none)'}`);
        statsLabel.setText(`Total key presses: ${keyPressCount}`);

        // Add to history (keep last 20)
        keyHistory.push(key);
        if (keyHistory.length > 20) {
          keyHistory.shift();
        }
        historyLabel.setText(`Key history: ${keyHistory.join(' ')}`);

        // Update button text
        inputBtn.setText(`Last key: ${key}`);

        console.log(`KeyDown: "${key}" - ${currentlyPressed.size} keys held`);
      });

      inputBtn.onKeyUp((event) => {
        const key = event.key;
        currentlyPressed.delete(key);

        statusLabel.setText(`Key UP: "${key}"`);
        currentKeysLabel.setText(`Currently pressed: ${[...currentlyPressed].join(' + ') || '(none)'}`);

        console.log(`KeyUp: "${key}" - ${currentlyPressed.size} keys remaining`);
      });

      a.separator();
      a.label("Arrow Key Navigator:");

      // Simple arrow key demo
      let position = { x: 0, y: 0 };
      let posLabel: any;

      a.hbox(() => {
        posLabel = a.label("Position: (0, 0)");
      });

      const arrowBtn = a.button("[ Use Arrow Keys ]").onClick(() => {
        statusLabel.setText("Arrow button focused - use arrow keys!");
      });

      arrowBtn.onKeyDown((event) => {
        const key = event.key;
        let moved = false;

        switch (key) {
          case 'Up':
            position.y--;
            moved = true;
            break;
          case 'Down':
            position.y++;
            moved = true;
            break;
          case 'Left':
            position.x--;
            moved = true;
            break;
          case 'Right':
            position.x++;
            moved = true;
            break;
        }

        if (moved) {
          posLabel.setText(`Position: (${position.x}, ${position.y})`);
          arrowBtn.setText(`Arrow: ${key}`);
          console.log(`Arrow navigation: ${key} -> (${position.x}, ${position.y})`);
        }
      });

      a.separator();
      a.label("Key Combination Detector:");

      const comboBtn = a.button("[ Try key combos: Shift+A, Ctrl+S ]").onClick(() => {
        statusLabel.setText("Combo button focused - try modifier + key!");
      });

      comboBtn.onKeyDown((event) => {
        const key = event.key;
        // Fyne sends modifier keys as separate events
        // Common modifiers include: Shift, Control, Alt, Super
        if (key === 'LeftShift' || key === 'RightShift') {
          comboBtn.setText("Shift held...");
        } else if (key === 'LeftControl' || key === 'RightControl') {
          comboBtn.setText("Ctrl held...");
        } else if (key === 'LeftAlt' || key === 'RightAlt') {
          comboBtn.setText("Alt held...");
        } else {
          // Check if any modifiers were recently pressed
          const modifiers = [...currentlyPressed].filter(k =>
            k.includes('Shift') || k.includes('Control') || k.includes('Alt')
          );
          if (modifiers.length > 0) {
            comboBtn.setText(`Combo: ${modifiers.join('+')}+${key}`);
            console.log(`Key combo detected: ${modifiers.join('+')}+${key}`);
          } else {
            comboBtn.setText(`Key: ${key}`);
          }
        }
        currentlyPressed.add(key);
      });

      comboBtn.onKeyUp((event) => {
        currentlyPressed.delete(event.key);
        if (currentlyPressed.size === 0) {
          comboBtn.setText("[ Try key combos: Shift+A, Ctrl+S ]");
        }
      });

      a.separator();

      // Reset button
      a.button("Reset All").onClick(() => {
        keyHistory = [];
        currentlyPressed.clear();
        keyPressCount = 0;
        lastKeyTime = null;
        position = { x: 0, y: 0 };

        statusLabel.setText("Status: All reset!");
        currentKeysLabel.setText("Currently pressed: (none)");
        historyLabel.setText("Key history: (empty)");
        statsLabel.setText("Total key presses: 0");
        wpmLabel.setText("Keys per second: -");
        posLabel.setText("Position: (0, 0)");
        inputBtn.setText("[ Click here, then type! ]");
        arrowBtn.setText("[ Use Arrow Keys ]");
        comboBtn.setText("[ Try key combos: Shift+A, Ctrl+S ]");

        console.log("All keyboard tracking reset");
      });

      a.separator();
      a.label("Instructions:");
      a.label("• Click a button to focus it");
      a.label("• Type on keyboard to see key events");
      a.label("• Use arrow keys in the navigator");
    });
  });
});

console.log("\n=== Keyable Demo ===");
console.log("Demonstrates: desktop.Keyable interface");
console.log("Methods: onKeyDown(), onKeyUp()");
console.log("========================\n");
