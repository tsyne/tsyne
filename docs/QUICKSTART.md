# Tsyne Quick Start Guide

Get up and running with Tsyne in 5 minutes!

## Installation

For complete installation instructions, see **[INSTALLATION.md](INSTALLATION.md)**.

**Quick options:**

**Development (building from source):**
```bash
git clone https://github.com/paul-hammant/tsyne.git
cd tsyne
npm install
npm run build
```

**Standalone installation (recommended for users):**
```bash
# Download and run the installer
curl -O https://raw.githubusercontent.com/paul-hammant/tsyne/main/scripts/install.sh
chmod +x install.sh
./install.sh

# Then use 'tsyne' command anywhere
tsyne my-app.ts
```

**npm package (coming soon):**
```bash
npm install tsyne  # Not yet published to npm
```

## Your First App

Create a file called `hello.js`:

```javascript
const { app, window, vbox, button, label } = require('tsyne');

app({ title: "Hello Tsyne" }, () => {
  window({ title: "Hello World" }, () => {
    vbox(() => {
      label("Welcome to Tsyne!");
      button("Click Me", () => {
        console.log("Button clicked!");
      });
    });
  });
});
```

Run it:

```bash
node hello.js
```

## Building from Source

If you want to build Tsyne from source:

```bash
# Clone the repository
git clone https://github.com/paul-hammant/tsyne.git
cd tsyne

# Run the build script
./build.sh

# Or manually:
npm install
cd bridge && go mod download && go build -o ../bin/tsyne-bridge && cd ..
npm run build
```

## More Examples

### Counter App

```javascript
const { app, window, vbox, hbox, button, label } = require('tsyne');

let countLabel;
let count = 0;

function updateCounter() {
  countLabel.setText(`Count: ${count}`);
}

app({ title: "Counter" }, () => {
  window({ title: "Counter" }, () => {
    vbox(() => {
      countLabel = label("Count: 0");

      hbox(() => {
        button("-", () => { count--; updateCounter(); });
        button("Reset", () => { count = 0; updateCounter(); });
        button("+", () => { count++; updateCounter(); });
      });
    });
  });
});
```

### Text Input

```javascript
const { app, window, vbox, button, label, entry } = require('tsyne');

let nameEntry;
let greetingLabel;

app({ title: "Greeter" }, () => {
  window({ title: "What's your name?" }, () => {
    vbox(() => {
      label("Enter your name:");
      nameEntry = entry("Your name here");

      button("Greet", async () => {
        const name = await nameEntry.getText();
        await greetingLabel.setText(`Hello, ${name}!`);
      });

      greetingLabel = label("");
    });
  });
});
```

## Available Widgets

- **`label(text)`** - Display text
- **`button(text, onClick)`** - Clickable button
- **`entry(placeholder)`** - Text input field

## Available Layouts

- **`vbox(() => { ... })`** - Vertical stack
- **`hbox(() => { ... })`** - Horizontal stack

## Tips

1. **Keep references**: Save widgets to variables if you need to update them later
2. **Async methods**: `getText()` is async, use `await`
3. **Nested layouts**: You can nest `vbox` and `hbox` as deep as needed
4. **Event handlers**: Button clicks are synchronous, but you can use `async` functions

## Next Steps

- Check out the [examples/](examples/) directory for more complete examples
- Read the [README.md](README.md) for full documentation
- See [ARCHITECTURE.md](ARCHITECTURE.md) to understand how Tsyne works
- Review [CONTRIBUTING.md](CONTRIBUTING.md) to contribute new features

## Troubleshooting

**"Cannot find module 'tsyne'"**
- Make sure you've run `npm install tsyne`
- If building from source, run `npm run build`

**Bridge executable not found**
- Run `npm run build:bridge` to compile the Go bridge
- Ensure Go 1.21+ is installed

**Window doesn't appear**
- Make sure you're calling the app function with a builder
- Check that you've defined at least one window inside the app builder

**Linux: Missing dependencies**
```bash
# Debian/Ubuntu
sudo apt-get install libgl1-mesa-dev xorg-dev

# Fedora
sudo dnf install libXcursor-devel libXrandr-devel mesa-libGL-devel libXi-devel
```

## Platform-Specific Notes

### macOS
- Requires Xcode Command Line Tools: `xcode-select --install`
- App will appear in the dock when running

### Linux
- Requires X11 development libraries (see above)
- Wayland is supported through XWayland

### Windows
- Requires MinGW-w64 for CGO compilation
- Recommend using Git Bash or WSL for building

## Getting Help

- **Documentation**: Check the README and ARCHITECTURE docs
- **Examples**: Look at the example apps in `examples/`
- **Issues**: Report bugs at https://github.com/paul-hammant/tsyne/issues
