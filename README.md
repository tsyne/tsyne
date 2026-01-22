<p align="center">
  <img src="logo-full.svg" alt="Tsyne Logo" width="300">
</p>

<p align="center">
  <strong>An all-in-one markup and logic technology for Windows, Mac, and Linux (including Chromebook)</strong>
</p>

<p align="center">
  <a href="https://buildkite.com/paul-hammant/tsyne">
    <img src="https://badge.buildkite.com/4579634aaab70e5ce15dbec6cc68ce6aaa2891feca54345efb.svg" alt="Build status">
  </a>
  <br>
  <a href=".CI_TEST_RESULTS_SUMMARY.txt">📊 Latest Test Results</a>
</p>

<p align="center">
  <em>Logo is Tyne-bridge -ish with Fyne's colors as Tsyne has a 'bridge' to its Go+Fyne underpinnings</em>
</p>

---

## What is Tsyne?

**Primarily**, Tsyne is an all-in-one markup and logic technology for building desktop applications on **Windows, Mac, and Linux** (including Chromebook). Phones too (Android via an apk, and PostmarketOS - as a linux launcher, iOS - TODO). It brings the power of [Fyne](https://fyne.io/), a modern Go UI toolkit, to the TypeScript/Node.js ecosystem with an elegant, pseudo-declarative API that I've been [thinking about for 20+ years](https://paulhammant.com/ui-markup-nirvana/). Lisp is the holy grail here, and y'all should check out [Chris Hinsleys' ChrysaLisp](https://github.com/vygr/ChrysaLisp) for that, but I'm trying to work out how close we can get with TypeScript and without [S-expressions](https://en.wikipedia.org/wiki/S-expression).

**Secondarily**, Tsyne comes bundled with:
- **Selenium-alike testing technology** (TsyneTest) - A Playwright-inspired testing framework for headed/headless UI testing. Cheekily, that wrap's Fyne's testing tech.
- **WYSIWYG designer** - A visual UI builder because I've been [thinking about that for nearly 30 years](https://paulhammant.com/2013/03/28/interface-builders-alternative-lisp-timeline/) with a [Hackernews discussion](https://news.ycombinator.com/item?id=21828622). I acknowledge that many would say that doesn't need resurrecting - especially in the LLM age.
- **Tsyne Browser** - A dedicated browser for Tsyne pages, enabling server-driven "thin but fat" interactive experiences. Note: This browser doesn't speak HTML and regular browsers don't speak Tsyne. Browser experience backends enable server-driven desktop UIs where any backend language (Java, Ruby, Python, Go, Rust, Perl etc) can serve pages. Big topic, see [BROWSER_MODE doc](BROWSER_MODE.md)

## Why Tsyne?

- **Elegant Syntax**: Pseudo-declarative, terse UI markup with closures or blocks depending on your point of view.
- **Cross-Platform**: Build native standalone apps for macOS, Windows, and Linux from a single codebase
- **New Platform**: The same apps can be ALSO be part of a Desktop (launcher on top of Mac/Win/Lin) or Phonetop or Tablettop (TODO).
- **Type-Safe**: Full TypeScript support with complete type definitions. Sure sure, tranpilation happens unseen.
- **Powerful**: Mostly full access to Fyne's rich widget library and layout system
- **Testable**: Built-in testing framework (TsyneTest) with Selenium/Playwright-like API for headed/headless testing
- **Many single-script apps**: Complete desktop apps in one file - no complex project structure needed (like [calculator](examples/calculator.ts), [tic-tac-toe](examples/tictactoe.ts), [stopwatch](examples/17-stopwatch.ts), [dice roller](examples/18-dice-roller.ts))
- **Single-File Distribution**: Embed npm dependency declarations directly in source files (See [INLINE_DEPENDENCY_DECLARATIONS](docs/INLINE_DEPENDENCY_DECLARATIONS.md)) if using `tsyne.exe` in the PATH
- **npm Ecosystem**: Use any of npm's 2M+ packages that don't require browser DOM - share validators, API clients, and business logic with your web apps
- **Interpreted + Native**: TypeScript logic is interpreted for rapid iteration; rendering is compiled Go/Fyne for native performance. The trade-off is that requiring Node.js runtime, not single binary distribution. Well, if you want to go down that Tauri-esque road, its 100MB for "hello world"

## When Tsyne Is Not The Right Choice?

Tsyne isn't the right choice for every project. Consider these limitations:

- **Requires Node.js Runtime**: Pure Go/Fyne apps compile to single standalone binaries. Tsyne apps need Node.js installed, making distribution more complex.
- **IPC Overhead**: The JSON-RPC bridge between TypeScript and Go adds latency compared to native Fyne. For performance-critical UIs with rapid updates, native Fyne may be better.  First person shooters will be hard, though we have a Doom port already.
- **Partial Fyne Coverage**: Tsyne wraps ~50% of Fyne's widget API (see [ROADMAP.md](docs/ROADMAP.md)). Canvas drawing, system tray, and some specialized widgets are not yet available.
- **Fyne's Styling Limitations**: Per-widget color customization is limited by Fyne's architecture. Font styling works well, but colors require custom themes.  Specifically, I don't think you can go wild with the equivalent of `style='...'`. I could be wrong though. 

**When to use Fyne directly instead:**
- Single-binary desktop distribution
- Performance-critical real-time UIs
- Full access to Fyne's complete widget library
- Proper funded thing you're making to last a decade with features added continually, and Tsyne is still a big question mark.

## FAQ

**Q: How does browser mode differ from regular mode?**

Regular app mode creates standalone desktop applications. Browser mode loads TypeScript pages from HTTP servers dynamically over HTTPS, enabling server-driven UIs where the backend controls the UI (similar to traditional web apps but with native widgets). Pages are the main concept, The browser's back and forward buttons have meaning. This skips the Web1.0 era and jumps straight into Web2.0 but nothing is stopping you from coding a traditional web1.0 experience if you really wanted to - but you'd likely be in the wrong technology if that's your design. See [docs/BROWSER_MODE.md](docs/BROWSER_MODE.md).

**Q: Can Chrome, Firefox and Safari show browser-make pages?**

No, we have our own browser for that and yes we know that's a second-class experience. It could be that someone could make a plugin for Chrome/Edge/Firefox and/or Safari, but it could still be a second-class experience.

**Q: Can I use npm packages in my Tsyne app?**

Yes! Nearly any npm package that doesn't require browser DOM APIs will work. This includes validators, API clients, date libraries, and business logic packages. Share code between your Tsyne desktop app and web frontend. Share code between your Tsyne desktop app and your server-side NodeJS web applications.

**Q: How does testing work?**

Tsyne provides two testing frameworks:
- **TsyneTest** - For testing regular Tsyne apps/components ([docs/TESTING.md](docs/TESTING.md))
- **TsyneBrowserTest** - For testing browser mode pages ([docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md))

Both support headed and headless modes with an API inspired by Selenium/Playwright.

**Q: Can I style widgets with CSS?**

Sort of. Tsyne has a CSS-like styling system for fonts (family, size, style, weight). Per-widget colors are limited by Fyne's architecture - use **themes** for color customization. See the Widget Styling System section below.

**Q: Why TypeScript instead of Go for the UI logic?**

TypeScript provides rapid iteration (no compile step), access to npm's 2M+ packages, and familiar syntax for web developers. The trade-off is requiring Node.js runtime vs single-binary distribution.  For me (Paul) this was always about [pseudo-declarative UI markup languages that could be interpreted](https://paulhammant.com/categories#Pseudo-declarative_UIs) and the browser mode. Also, Paul loves pseudo-declarative markups and that was easier to code in TypeScript than in Go.

**Q: How do I debug my app?**

Use standard Node.js debugging: `node --inspect` or your IDE's debugger. Console.log works normally. For UI issues, enable `TSYNE_HEADED=1` during testing to see the actual UI [REVIEW NEEDED].

**Q: What percentage of Fyne is wrapped?**

About 50% of widgets and containers. See [docs/ROADMAP.md](docs/ROADMAP.md) for what's remaining. PRs welcome for missing features!

**Q: Can pages in browser mode communicate with the server beyond navigation?**

Pages are TypeScript code with full access to Node.js APIs. Use `fetch()`, `axios`, or any HTTP client to make API calls to your backend while the page is displayed.  They are not runninhg in the DOM (of Chrome, Firefox, Edge Safari, etc) so this isn't a WASM or build-for-DOM use of TS/JS, it is a NodeJs use of TS/JS. As such it's a unsandboxed nightmare so don't put anything live with this tech until that's solved.

**Q: Will Tsyne support the DOM's controls/widgets etc?**

No, this is tied to Fyne. Someone else can do a pure TypeScript pseudo-declarative markup that maybe can run in a regular browser somehow.

**Q: Do apps have to be single scripts?**

No, but demoing it is the price of admission for the long list of could-be 3rd phone operating systems. Be on the app, type in a single script "hello world" on the phone (like it is the 80's), save and press "run". I [whined about QML previously](https://paulhammant.com/2016/11/15/qmls-squandered-opportunity/)

**Q: Are APIs stable?**

No, anything can be renamed at any moment. If you're making apps right now, you're promising to keep up with the renames/refactorings as if you were co-located in the same repo

**Q: What patterns are important?**

Separation of Concerns, Inversion of Control (there's no DI container as such), Design for testability is better design anyway (a maxim),  We're agnoting on MVC, MVVM and all that. There is and should be some kernel-esqe separation for the joined together deployments on Phonetop and Desktop

**Q: JavaScript and WASM?**

Apps written in those? Probably, I've not tested or done any coding to specifically support that yet.

**Q: What are your plans**

This is a fun hobby. It's alpha quality and everything is changing the whole time right now. I really want to get it working smoothly on my Pixel 3a running Postmarket OS. And I mean look like it's taken over as it's the step/launcher/home. Obligatory guy at party meme: https://imgflip.com/i/ai2a1v. That said if Microsoft or Nokia want to give it another go call me - I am actually looking for work, and sick of the truly bizarre reasons for being declined.

**Q: How much was made by AI**

Nearly all of it. My 36 years of dev experience channeled into prompts. Claude Code mostly (CLI and Cloud/web). A little bit of Google's Jules.  A little more of Gemini 3 (and 2.5 before it), but the billing for that scares me versus Anthropic's). Some Codex and OpenAI via the pioneering Aider.chat. Its a struggle too, not a breeze. All of them have forgotten that I really like automated tests and need reminding - and other rules like "no fallback coding - hard fail or ask me." There are whole days of gaslighting by these tools.

I am only going to engage in conversations about Tsyne on Sub-Reddits that think "use your brain not an AI" is to be dissuaded and won't encourage people to smack AI use. 

## Installation

See **[docs/INSTALLATION.md](docs/INSTALLATION.md)** for complete installation instructions, including:
- Quick start for development
- Standalone installation (recommended for users)
- npm package installation (coming soon)
- Prerequisites and troubleshooting
- Platform support

## Quick Start

### TypeScript

Warning: this code might be a little out of date. You'll get the intention though - pseudo-declarative for the win.

```typescript
import { app } from 'tsyne';

app({ title: "Hello Tsyne" }, (app) => {
  app.window({ title: "Hello Tsyne" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label("Welcome to Tsyne!");
        app.button("Click Me").onClick(() => { console.log("Button clicked!"); });
      });
    });
    win.show();
  });
});
```

Tsyne works seamlessly with both TypeScript and JavaScript!

## Single-File Distribution even with deps

This builds on single file applications that required Node.js running tsx. 

Distribute standalone `.ts` apps with npm dependencies declared inline in a similar way as ([Groovy's Grapes](https://docs.groovy-lang.org/latest/html/documentation/grape.html) technology does it.

```typescript
#!/usr/bin/env tsyne

// @Grab('axios@^1.6.0')
// @Grab('date-fns@^3.0.0')

import axios from 'axios';
import { format } from 'date-fns';
import { app } from 'tsyne';

// The rest of your GUI app that neds axios and date-fns` 
```

Dependencies auto-resolve to `~/.tsyne/packages/` at runtime. See [docs/INLINE_DEPENDENCY_DECLARATIONS.md](docs/INLINE_DEPENDENCY_DECLARATIONS.md) for details.

**Dependency Resolution:** All apps share a single global cache (`~/.tsyne/packages/node_modules/`) with a centralized `package.json` and `package-lock.json`. npm handles version conflicts using its standard dependency resolution algorithm—the same way it resolves dependencies in any project. This means packages are reused across apps when versions are compatible, and npm installs multiple versions only when necessary to satisfy conflicting semver ranges.

Well, this is still a workd in progress.

## Elegant Syntax

Tsyne's API is designed to be elegant and terse, inspired by other pseudo-declarative markups. The syntax feels pseudo-declarative while retaining full imperative power:

**See [HISTORICAL.md](HISTORICAL.md) for the historical context and influences behind Tsyne's design.**

### Calculator Example

Calculator example is important to me because I'm forver comparing to [this one written in Ruby and Shoes UI tech](https://raw.githubusercontent.com/Alexanderlol/GS-Calc/master/calc.rb) by Alexanderlol on GitHub, and [this one for ChrysaLisp](https://github.com/vygr/ChrysaLisp/blob/master/apps/calculator/app.lisp) by Chris Hinsley).

### Calculator Variants

| Calculator | Lines | Purpose | Pseudo-Declarative Adherence |
|------------|-------|---------|------------------------------|
| [examples/smallest-calculator/smallest-calc.ts](examples/smallest-calculator/smallest-calc.ts) | 23 | Minimal viable calculator | **Excellent** - Pure nested builders, inline state, `for` loop for button grid |
| [examples/calculator.ts](examples/calculator.ts) | 64 | Intro example | **Excellent** - Clean `vbox`/`grid` nesting, `forEach` for buttons, instance-local state |
| [examples/15-tip-calculator.ts](examples/15-tip-calculator.ts) | 65 | Bill splitting | **Good** - Uses `vbox`/`hbox`, radiogroups, entry widgets; imperative `setText` updates |
| [examples/calculator-accessible.ts](examples/calculator-accessible.ts) | 160 | Accessibility basics | **Good** - TTS toggle, `.accessibility()` chains; module-level state (not instance-local) |
| [examples/full-calculator.ts](examples/full-calculator.ts) | 259 | Programmer's calc | **Excellent** - Multi-base (dec/hex/bin/oct), bitwise ops, helper functions for buttons |
| [examples/calculator-fully-accessible.ts](examples/calculator-fully-accessible.ts) | 277 | Full a11y | **Good** - Comprehensive ARIA, keyboard hints; module-level state, complex style management |
| [test-apps/calculator-advanced/calculator.ts](test-apps/calculator-advanced/calculator.ts) | 104 | Testing patterns (monolithic) | **Good** - IoC/DI with injected `App`, `hbox` rows (not grid); all logic inline |
| [test-apps/calculator-advanced/calculator-ui.ts](test-apps/calculator-advanced/calculator-ui.ts) | 73+107 | Testing patterns (separated) | **Excellent** - UI delegates to `calculator-logic.ts`; enables fast Jest unit tests + TsyneTest integration |

**Key pseudo-declarative patterns demonstrated:**
- **Nested builders**: `a.window(() => a.vbox(() => a.grid(4, () => ...)))`
- **Fluent chaining**: `a.button("7").onClick(...).withId(...).accessibility(...)`
- **Programmatic generation**: `[..."789"].forEach(n => a.button(n).onClick(...))`
- **Instance-local state**: State variables inside builder function, not module-level
- **Imperative updates**: `display.setText(value)` for simple cases (Pattern 1 from [pseudo-declarative docs](docs/pseudo-declarative-ui-composition.md))

**LoC target:** The [Ruby/Shoes calculator](https://raw.githubusercontent.com/Alexanderlol/GS-Calc/master/calc.rb) is 27 substantive lines. Our smallest-calc.ts achieves 23 lines - demonstrating that TypeScript + Tsyne can match or beat Ruby's famous terseness.

1. See a complete runnable single-script calculator here: [examples/calculator.ts](examples/calculator.ts) - 108 lines, monolithic pattern. See also its [test suite](examples/calculator.test.ts).

See a bigger list of examples with screenshots here: [examples/README.md](examples/README.md)

TODO: INLINE LIST OF APPS WITH STATS

## Testing with TsyneTest

Tsyne includes **TsyneTest**, a Playwright-like testing framework for testing your UI applications in headed or headless mode.

### Quick Test Example

```typescript
import { TsyneTest } from 'tsyne/test';

async function testCalculator() {
  // Create test instance (headless by default)
  const tsyneTest = new TsyneTest({ headed: false });

  // Build your app
  const testApp = tsyneTest.createApp((app) => {
    // ... build calculator UI ...
  });

  // Get test context
  const ctx = tsyneTest.getContext();
  await testApp.run();

  // Interact with the UI
  await ctx.getByExactText("5").click();
  await ctx.getByExactText("+").click();
  await ctx.getByExactText("3").click();
  await ctx.getByExactText("=").click();

  // Make assertions
  const display = ctx.getByType("label");
  await ctx.expect(display).toHaveText("8");

  // Clean up
  await tsyneTest.cleanup();
}
```

Of course, getByID(..) is always smarter.

See a bigger list of test examples with screenshots here: [examples/README.md](examples/README.md)

### Test Modes

**Headless (default)** - Fast, no UI, perfect for CI/CD:
```typescript
const tsyneTest = new TsyneTest({ headed: false });
```

**Headed** - Shows UI during testing, great for debugging:
```typescript
const tsyneTest = new TsyneTest({ headed: true });
```

### Locators and Assertions

TODO slim this down.

```typescript
// Find widgets by text
ctx.getByExactText("Submit")
ctx.getByText("Counter:") // partial match
ctx.getById("widget-id")   // by ID

// Find by type
ctx.getByType("button")
ctx.getByType("label")
ctx.getByType("entry")

// Actions
await locator.click()
await locator.type("text")
await locator.getText()

// Fluent-Selenium Style API - Text Assertions
await ctx.getByText("Submit").within(5000).click()  // Retry for 5 seconds
await ctx.getByText("Loading...").without(3000)     // Wait for disappearance
await ctx.getById("status").shouldBe("Success")     // Fluent assertion
await ctx.getById("message").shouldContain("error") // Partial match
await ctx.getById("email").shouldMatch(/^.+@.+$/)   // Regex match

// Fluent-Selenium Style API - Property Assertions
await ctx.getById("agree").shouldBeChecked()        // Checkbox state
await ctx.getById("volume").shouldHaveValue(75)     // Slider/entry value
await ctx.getById("submit").shouldBeEnabled()       // Enabled state
await ctx.getById("myWidget").shouldHaveType("button") // Widget type
await ctx.getById("modal").shouldBeVisible()        // Visibility

// Assertions (Traditional style)
await ctx.expect(locator).toHaveText("exact text")
await ctx.expect(locator).toContainText("partial")
await ctx.expect(locator).toBeVisible()
await ctx.expect(locator).toExist()
await ctx.expect(locator).toMatchText(/pattern/)

// Negative assertions
await ctx.expect(locator).toNotHaveText("wrong")
await ctx.expect(locator).toNotBeVisible()
await ctx.expect(locator).toNotExist()
```

### Running Tests

```bash
# Run tests in headless mode
npm test

# Run with visible UI
npm run test:calculator:headed
```

**See [docs/TESTING.md](docs/TESTING.md) for complete documentation and the [calculator test app](test-apps/calculator/) for a comprehensive example.**

**Testing examples:**
- **[examples/calculator.test.ts](examples/calculator.test.ts)** - Simple calculator tests (integration tests using TsyneTest)
- **[examples/locators.test.ts](examples/locators.test.ts)** - Comprehensive locator and assertion examples
- **[test-apps/calculator-advanced/calculator.test.ts](test-apps/calculator-advanced/calculator.test.ts)** - Advanced calculator integration tests
- **[test-apps/calculator-advanced/calculator-logic.test.ts](test-apps/calculator-advanced/calculator-logic.test.ts)** - Fast Jest unit tests for business logic

## Browser Testing with TsyneBrowserTest

Tsyne includes **TsyneBrowserTest**, a Playwright-inspired testing framework for testing Tsyne Browser pages. It automatically starts a test HTTP server and provides navigation helpers.

```typescript
import { browserTest } from 'tsyne';

browserTest(
  'Test /home',
  [
    { path: '/', code: `const { vbox, label } = tsyne; vbox(() => { label('Home'); });` },
    { path: '/about', code: `const { vbox, label } = tsyne; vbox(() => { label('About'); });` }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    bt.assertUrl('/');
    await bt.navigate('/about');
    bt.assertUrl('/about');
  }
);
```

**See [docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md)** for complete documentation including:
- Playwright-inspired locators, actions, and expectations
- Fluent-selenium style API (within, without, shouldBe, shouldContain)
- Integration with Jest, Mocha, Vitest
- Complete API reference and examples

## API Reference

For the complete API reference, see **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)**.

** A Quick Reference, though**

**Layouts:** `vbox`, `hbox`, `grid`, `scroll`, `hsplit`, `vsplit`, `tabs`, `center`, `border`, `gridwrap`

**Container Widgets:** `card`, `accordion`, `form`

**Basic Widgets:** `button`, `label`, `entry`, `multilineentry`, `passwordentry`

**Input Widgets:** `checkbox`, `select`, `slider`, `radiogroup`

**Display Widgets:** `progressbar`, `separator`, `hyperlink`

**Data Widgets:** `table`, `list`, `tree`, `richtext`, `image`, `toolbar`

**Dialogs:** `showInfo`, `showError`, `showConfirm`, `showFileOpen`, `showFileSave`

**Window Methods:** `resize`, `centerOnScreen`, `setFullScreen`, `setMainMenu`

**Widget Methods:** `setText`, `getText`, `hide`, `show`, `when`, `refresh`

## Theme Support

Tsyne supports light and dark themes that automatically apply to all widgets in your application. TODO link to Theme demo

See `examples/theme.ts` for a complete theme demonstration with various widgets.

## Browser Mode

Tsyne includes a [Swiby-inspired](https://paulhammant.com/blog/google-app-engine-for-java-with-rich-ruby-clients.html) (and others) browser system that loads **Tsyne TypeScript pages** from web servers dynamically, similar to how web browsers load HTML pages. This enables server-side page generation from any language (Spring, Sinatra, Flask, Express, etc.).

```bash
# Run the browser with a URL
npx tsyne-browser http://localhost:3000/
```

```typescript
// Example page (pages/index.ts)
const { vbox, label, button } = tsyne;

vbox(() => {
  label('Welcome to Tsyne Browser!');
  button('Go to About', () => {
    browserContext.changePage('/about');
  });
});
```

**See [docs/BROWSER_MODE.md](docs/BROWSER_MODE.md)** for complete documentation including:
- Browser API and BrowserContext
- Server implementations (Node.js, Python, Ruby, Java)
- Page format and navigation flow
- Examples and use cases

## State Management and Architectural Patterns

Tsyne provides powerful state management utilities and supports multiple architectural patterns (MVC, MVVM, MVP) for building scalable applications.

### State Passing and Two-Way Communication

Tsyne supports:
- **Passing state into components**: Initialize widgets with data from your application
- **Retrieving state back**: Get data from dialogs and forms (dialog pattern)
- **Two-way data binding**: Keep state synchronized with UI automatically
- **Observable state**: React to state changes automatically

### Quick State Management Examples

#### Observable State

```typescript
import { app, ObservableState } from 'tsyne';

const count = new ObservableState(0);
let countLabel: any;

// Subscribe to state changes
count.subscribe((newValue) => {
  countLabel?.setText(`Count: ${newValue}`);
});

app({ title: "State Demo" }, (app) => {
  app.window({ title: "State Demo" }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        countLabel = app.label("Count: 0");
        app.button("Increment").onClick(() => count.set(count.get() + 1));
      });
    });
    win.show();
  });
});
```

#### State Store (Centralized State)

```typescript
import { StateStore } from 'tsyne';

interface AppState {
  user: string;
  count: number;
}

const store = new StateStore<AppState>({
  user: 'Guest',
  count: 0
});

// Subscribe to all state changes
store.subscribe(state => {
  console.log('State changed:', state);
  updateUI(state);
});

// Update state
store.set('user', 'John');
store.update(s => ({ ...s, count: s.count + 1 }));
```

#### Dialog State Passing

```typescript
// Pass state into a dialog and get results back
const dialog = new ProfileDialog(currentProfile);
const result = await dialog.show();

if (result.confirmed) {
  store.update(state => ({
    ...state,
    profile: result.data
  }));
}
```

### Architectural Patterns

Tsyne supports standard UI architectural patterns:

| Pattern | Best For | Example |
|---------|----------|---------|
| **MVC** | Traditional desktop apps, Swing-like architecture | [mvc-counter.ts](examples/mvc-counter.ts) |
| **MVVM** | Data-heavy apps with automatic UI sync | [mvvm-todo.ts](examples/mvvm-todo.ts) |
| **MVP** | Maximum testability, swappable views | [mvp-login.ts](examples/mvp-login.ts) |
| **Data Binding** | Form inputs, real-time sync | [data-binding.ts](examples/data-binding.ts) |

TODO: do we really support data binding?

TODO links to examples.

## Architecture

Tsyne uses a unique architecture to bridge TypeScript and Go:

```
┌─────────────────────┐
│   Your TypeScript   │
│   Application       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Tsyne Client       │
│   (TypeScript)      │
└──────────┬──────────┘
           │ channel between two proesses
           ▼
┌─────────────────────┐
│   Tsyne Bridge       │
│   (Go + Fyne)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Native UI         │
│   (macOS/Win/Linux) │
└─────────────────────┘
```

1. **Tsyne Client** (TypeScript): Provides the pseudo-declarative API and spawns the bridge process
2. **Tsyne Bridge** (Go): Manages Fyne widgets and communicates via say Unix-domain sockets but it has alternates. Bidirectional
3. **Message Protocol**: MsgPack  or other

## Examples

> **100+ Examples Available!** See **[examples/README.md](examples/README.md)** for a comprehensive catalog of all examples organized by category, with direct links to source files and screenshots. Whether you're learning Tsyne basics or building complex applications, there's an example for you.

## Architecture Patterns

### Monolithic (Simple) vs Decomposed (Advanced)

Tsyne supports two architectural patterns for building applications:

| Pattern | When to Use | Testing Approach                              |
|---------|-------------|-----------------------------------------------|
| **Monolithic** | Demos, prototypes, < 200 lines | TsyneTest integration tests only              |
| **Decomposed** | Production, teams, complex logic | Jest unit tests + TsyneTest integration tests |

**Monolithic Example:**
```typescript
// All in one file
let count = 0;
let display: any;

function increment() {
  count++;
  display.setText(`Count: ${count}`);  // UI coupled with logic
}

app(() => {
  display = label("Count: 0");
  button("+", increment);
});
```

**Decomposed Example:**
```typescript
// calculator-logic.ts (testable with Jest!)
export class CalculatorLogic {
  private count = 0;

  increment(): number {
    return ++this.count;
  }

  getDisplay(): string {
    return `Count: ${this.count}`;
  }
}

// calculator-ui.ts
import { CalculatorLogic } from './calculator-logic';

export class CalculatorUI {
  private logic = new CalculatorLogic();
  private display: any;

  build() {
    this.display = label(this.logic.getDisplay());
    button("+", () => {
      this.logic.increment();
      this.display.setText(this.logic.getDisplay());
    });
  }
}

// calculator-logic.test.ts (Jest - fast!)
test('increment', () => {
  const calc = new CalculatorLogic();
  expect(calc.increment()).toBe(1);
  expect(calc.getDisplay()).toBe("Count: 1");
});
```

**Benefits of Decomposed Pattern:**
- ✅ Fast unit tests (100ms vs 3s)
- ✅ TDD-friendly
- ✅ Reusable logic
- ✅ Easy to maintain

**See [test-apps/README.md](test-apps/README.md) for complete comparison and migration guide.**

## Design Philosophy

Tsyne follows these design principles:

1. **Pseudo-declarative where possible**: UI structure is defined using nested function calls
2. **Imperative when needed**: Full TypeScript for event handlers and state management
3. **Terse and elegant**: Minimal boilerplate, maximum expressiveness
4. **Type-safe**: Complete TypeScript definitions for IDE support
5. **Easy to use**: Simple npm install, straightforward API

**See [HISTORICAL.md](HISTORICAL.md) for the frameworks and patterns that inspired Tsyne's design.**

## Building from Source

```bash
# Install dependencies
npm install

# Build the Go bridge
npm run build:bridge

# Build the TypeScript library
npm run build

# Run an example
./scripts/tsyne examples/hello.ts
```

## Requirements

- **Node.js**: 22.0.0 or higher
- **Go**: 1.24 or higher (for building the bridge) - we have our own fork for now (TODO)
- **Platform-specific dependencies**:
  - macOS: Xcode command line tools
  - Linux: X11 development libraries
  - Windows: MinGW-w64 (for CGO), or WSL2

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see [LICENSE](LICENSE) file for details

Note some the apps in this repo are other licenses, including GPL. Another day that's stop us from
zipping all into a single distribution, but for now we don't make a distribution (a binary that we 
publish) so we don't have to worry too much.

## Credits and Acknowledgments

### Core Technology

- **[Fyne](https://fyne.io/)** - The fantastic Go UI toolkit that powers Tsyne's native rendering
  - Created by Andrew Williams and the Fyne.io team - many local to me in Edinburgh
  - Provides cross-platform native widgets, Material Design theming, and excellent performance

### Inspirations and Design Influences

Tsyne's design draws from several influential frameworks and patterns:

- The Interface Builder before the current Interface Builder, written in Lisp.
- Ruby Shoes - Created by _why_the_lucky_stiff - Pioneering elegant DSL design for desktop GUIs
- Swiby - Ruby/Swing integration by pal Jean Lazarou - CSS-like styling separate from UI structure
- QML - Qt's declarative UI language - Seamless declarative/imperative integration

**See [HISTORICAL.md](HISTORICAL.md) for detailed discussion of these influences and how they shaped Tsyne's design.**

Special thanks to: Andrew Williams, colleagues and contributors - For Fyne UI toolkit and example applications

## Tauri Mobile Packaging (Android/iOS)

PhoneTop can be packaged as a Tauri mobile app using a web-renderer bridge mode.  TODO ... Android's APK route with nodejs-mobile might be a better route.

### Prerequisites

TODO
### Building Android APK

```bash
cd tauri-phonetop

# Build for all 4 Android architectures (aarch64, armv7, i686, x86_64)
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
ANDROID_HOME=~/Android/Sdk \
NDK_HOME=~/Android/Sdk/ndk/26.1.10909125 \
npx tauri android build
```

**Output:**
- APK: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`
- AAB: `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab`

### Architecture

The Tauri mobile app uses a WebSocket-based renderer:

```
Tauri WebView ←→ WebSocket (ws://localhost:9876) ←→ Node.js + phonetop.ts
```

See `tauri-phonetop/README.md` for detailed architecture and running instructions.

## Documentation

### Getting Started
- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Get started in 5 minutes
- **[README.md](README.md)** - You are here! Main documentation
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete API reference for widgets, layouts, and dialogs
- **[docs/PROS_AND_CONS.md](docs/PROS_AND_CONS.md)** - Tsyne vs Electron/Tauri comparison and decision guide
- **[docs/LLM.md](docs/LLM.md)** - Quick reference guide for LLMs if you're assigning work to 'em'

### State Management, Patterns and pattern-centric examples

- **[docs/PATTERNS.md](docs/PATTERNS.md)** - Complete guide to architectural patterns (MVC, MVVM, MVP), state management, and data binding
- **[examples/data-binding.ts](examples/data-binding.ts)** - Observable state and computed state examples
- **[examples/mvc-counter.ts](examples/mvc-counter.ts)** - MVC pattern implementation
- **[examples/mvvm-todo.ts](examples/mvvm-todo.ts)** - MVVM pattern with ViewModels
- **[examples/mvp-login.ts](examples/mvp-login.ts)** - MVP pattern with passive views
- **[examples/dialog-state.ts](examples/dialog-state.ts)** - Dialog state passing pattern

### Browser Mode

A major piece of this is the ability to server up "Tsyne Pages" and navigate them. An experience that you should be familiar with from Chrome, Safari, or Firefox. This isn't using those though there's a dedicated browser.  Pages would be served from regular choices of HTTP server and many of the existing server-side frameworks that go with them.

- **[docs/BROWSER_MODE.md](docs/BROWSER_MODE.md)** - Complete guide to browser mode 
- **[docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md)** - Testing framework for browser pages

### Testing

- **[docs/TESTING.md](docs/TESTING.md)** - Complete guide to TsyneTest testing framework (for apps/components)
- **[docs/BROWSER_TESTING.md](docs/BROWSER_TESTING.md)** - Complete guide to TsyneBrowserTest (for browser pages)
- **[docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)** - Comprehensive testing checklist for browser features
- **[test-apps/README.md](test-apps/README.md)** - Two architectural patterns comparison
- **[test-apps/calculator-simple/README.md](test-apps/calculator-simple/README.md)** - Monolithic pattern
- **[test-apps/calculator-advanced/README.md](test-apps/calculator-advanced/README.md)** - Decomposed pattern
- **[test-apps/calculator-advanced/TESTING-STRATEGY.md](test-apps/calculator-advanced/TESTING-STRATEGY.md)** - Two-tier testing

### Development

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Internal design and architecture
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guide for contributors
- **[docs/PUBLISHING.md](docs/PUBLISHING.md)** - Publishing to npm with bundled binaries
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Feature roadmap and TODO list
- **[HISTORICAL.md](HISTORICAL.md)** - Historical context, influences, and acknowledgments
