# Food Truck Sample App - Tsyne Port

A food truck order management system ported from Apple's SwiftUI sample app to **Tsyne**, a TypeScript-based desktop application framework.

This is an idiomatic single-file Tsyne application that demonstrates:
- **Order Management**: Track pending, ready, and completed orders
- **Sales Analytics**: Visualize top-selling menu items with bar charts
- **Weather Integration**: Display and update location weather
- **Responsive Sidebar Navigation**: Switch between views with `when()` declarative visibility
- **Pseudo-Declarative UI**: Clean, readable builder pattern matching Tsyne best practices

## Features

### Orders View
- Add quick orders (Burger, Tacos, Pizza, or Random item)
- Track orders through three states: Pending → Ready → Completed
- View order details (ID, items, total)
- Single-button state transitions

### Sales Analytics
- Display top 5 selling menu items
- ASCII bar chart visualization
- Total sales calculation (pending + ready orders only)
- Real-time updates as orders change

### Weather
- Display current location weather (city, temperature, condition)
- Weather emoji icons
- Random weather updates for testing

## User Interface

### Orders View
```
┌──────────────────────────────────────────────────────────┐
│ 🚚 Food Truck Manager                                    │
├──────────────────────────────────────────────────────────┤
│ 📋 Order Management                      Status: Pending:1 Ready:1
│
│ [➕ Add Burger] [➕ Tacos] [➕ Pizza] [➕ Random]
│ ─────────────────────────────────────────────────────────
│
│ 🔴 Pending Orders (2)
│ ├─ order-001: Burger, Tacos                    $22.98 [Mark Ready]
│ └─ order-003: Hot Dog                           $7.99 [Mark Ready]
│
│ 🟢 Ready for Pickup (1)
│ └─ order-002: Pizza, Pizza                     $11.98 [Mark Complete]
└──────────────────────────────────────────────────────────┘
```

### Sales Analytics View
```
┌──────────────────────────────────────────────────────────┐
│ 📊 Sales Analytics                       Pending:1 Ready:1
│ ─────────────────────────────────────────────────────────
│ Total Sales: $42.95
│ Top Menu Items:
│
│ 1. Pizza Slice       ███████ 71 sold
│ 2. Tacos (3)         ██████  62 sold
│ 3. Burger           █████   45 sold
│ 4. Hot Dog          ████    38 sold
│ 5. Garden Salad     ██      22 sold
└──────────────────────────────────────────────────────────┘
```

### Weather View
```
┌──────────────────────────────────────────────────────────┐
│ 🌤️ Location Weather                      Pending:1 Ready:1
│ ─────────────────────────────────────────────────────────
│ ☀️  📍 Downtown Park
│     🌡️ 72°F
│     ☁️ Sunny
│
│ [Update Weather]
│
│ (Random conditions: Sunny ☀️, Cloudy ☁️, Rainy 🌧️, Windy 🌪️)
└──────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots of the application:

```bash
# Start app with visual display (requires X11/display)
npx tsx ported-apps/sample-food-truck/index.ts

# Run tests with screenshot capture
TAKE_SCREENSHOTS=1 npm test ported-apps/sample-food-truck/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/food-truck-orders.png
# - /tmp/food-truck-sales.png
# - /tmp/food-truck-weather.png
```

Screenshots show:
- **Orders View**: Pending orders in red (🔴), ready orders in green (🟢)
- **Sales View**: ASCII bar charts with top-selling items
- **Weather View**: Location, temperature, and condition with emoji indicators

## Architecture

The app follows Tsyne's MVC pattern with three main components:

### Model: `FoodTruckStore`
- Observable pattern with change listeners
- Immutable data returning defensive copies
- Methods for order and weather management

### View: Declarative UI with `when()`
- Conditional visibility of order/sales/weather views
- Uses `bindTo()` for smart list rendering
- Sidebar for persistent navigation

### Controller: Event Handlers
- Order state transitions: `markOrderReady()`, `markOrderCompleted()`
- Menu actions: `addOrder()`
- Weather updates: `updateWeather()`

## Running the App

### Development (with Xvfb on cloud)
```bash
# Setup environment (if needed)
apt-get update -qq
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Install dependencies
npm install --ignore-scripts

# Build bridge
npm run build:bridge

# Build TypeScript
npm run build

# Run the app
npx tsx ported-apps/sample-food-truck/index.ts
```

### Desktop Integration
When running Tsyne's desktop environment, the Food Truck app is automatically discovered and available:
```bash
npx tsx examples/desktop-demo.ts
```

## Testing

### Jest Unit Tests
```bash
npm test ported-apps/sample-food-truck/index.test.ts
```

Tests cover:
- Store functionality (orders, menu, weather)
- Observable subscriptions
- Data integrity and immutability
- Analytics calculations

### TsyneTest Integration Tests
```bash
npm test ported-apps/sample-food-truck/index.tsyne.test.ts
```

Tests cover:
- UI rendering and navigation
- Order lifecycle and status transitions
- View switching with `when()` visibility
- Weather updates
- Screenshot capture for documentation

### Screenshots
To generate screenshots during tests:
```bash
TAKE_SCREENSHOTS=1 npm test ported-apps/sample-food-truck/index.tsyne.test.ts
```

Screenshots will be saved to:
- `/tmp/food-truck-orders.png` - Orders view
- `/tmp/food-truck-sales.png` - Sales analytics view
- `/tmp/food-truck-weather.png` - Weather view

## Code Style

This port demonstrates Tsyne best practices:

```typescript
// Pseudo-declarative UI construction with builder pattern
a.window({ title: 'Food Truck Manager' }, (win) => {
  win.setContent(() => {
    a.hbox(() => {
      // Sidebar with navigation
      a.vbox(() => {
        a.button('Orders').onClick(async () => {
          selectedView = 'orders';
          await showView('orders');
        });
      }, 220, true); // Width 220, vertical stretch

      // Main content area with when() visibility
      viewStack = a.vbox(() => {
        // Orders view with bindTo for smart list rendering
        ordersContainer = a.vbox(() => { /* ... */ })
          .bindTo({
            items: () => store.getPendingOrders(),
            render: (order) => { /* render each order */ },
            trackBy: (order) => order.id,
          })
          .when(() => selectedView === 'orders');

        // Sales and Weather views similarly...
      });
    });
  });

  // Observable subscriptions trigger reactive updates
  store.subscribe(async () => {
    await updateStatusSummary();
    await viewStack.refresh();
  });
});
```

## Single Script Design

The entire application is contained in a single `index.ts` file (~450 lines), demonstrating Tsyne's ability to build complex, feature-rich applications without the overhead of webpack, build chains, or component frameworks. This is a direct contrast to the original Apple SwiftUI sample, which requires Xcode, Swift Package Manager, and multi-file project structure.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 9/10 | Clean `hbox > vbox(sidebar, 220px) + vbox(viewStack)` split. Sidebar with nav buttons, spacer, and status label. Main area has 3 view containers. `buildContent()` reads as a complete layout spec |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` on sidebar buttons (`btn-orders`, `btn-sales`, `btn-weather`), section titles, per-order elements (`order-id-{id}`, `order-items-{id}`, `order-total-{id}`, `btn-ready-{id}`, `btn-complete-{id}`), per-sales elements (`sales-item-{id}`, `sales-bar-{id}`), weather fields. `.when()` on all 3 view containers |
| **Core declarative** | Programmatic generation | 7/10 | Sales bar chart generated via `.bindTo()` with `Math.ceil(salesCount / 5)` for bar length calculation. Quick-add buttons manually listed (could be generated from menu items). Weather conditions array with random selection |
| **State architecture** | Observable store | 8/10 | Full `FoodTruckStore` with `subscribe()`/`notifyChange()`. 3 data model types (`MenuItem`, `Order`, `WeatherData`). Defensive copies on `getOrders()`, `getMenuItems()`, `getWeather()`. Counter-based IDs (`order-004`). Analytics methods (`getTotalSales()`, `getTopSalesItems()`) |
| **Declarative updates** | `.when()` + `.bindTo()` | 8/10 | 3 view containers (orders, sales, weather) use `.when()`. 3 lists use `.bindTo()` with `trackBy` + `empty` — pending orders, ready orders, top sales items. `viewStack.refresh()` in store subscription. Two `setText()` escapes: `statusSummary` and `totalSalesLabel`. Vestigial `rebuildOrdersView()` function exists but is unused |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 1 | Uses `win.setContent(buildContent)` for initial render only. All subsequent updates via `.when()`, `.bindTo()`, and `viewStack.refresh()`. Minor penalty |
| **Testing** | `.withId()` coverage | 9/10 | Excellent per-item IDs: `order-id-{id}`, `order-items-{id}`, `order-total-{id}`, `btn-ready-{id}`, `btn-complete-{id}`, `sales-item-{id}`, `sales-bar-{id}`. Also IDs on sidebar buttons, section titles, weather fields, status summary |
| **Design** | Separation of concerns | 8/10 | `FoodTruckStore` is 140 lines of pure order/menu/weather logic. `buildFoodTruckApp()` is purely presentational. Sidebar+main layout cleanly separated. `showView()` helper is slightly imperative (updates `totalSalesLabel` directly) |
| | **Overall** | **8/10** | Solid pseudo-declarative implementation with sidebar+main layout, 3 `.when()` containers, 3 `.bindTo()` lists with `trackBy` + `empty`, and excellent per-item `.withId()` coverage. ASCII bar charts in sales view are a nice touch. Gaps: two `setText()` escapes, vestigial `rebuildOrdersView()`, and quick-add buttons could be generated from menu items array |

## License

Portions copyright Apple Inc and portions copyright Paul Hammant 2025

Licensed under the MIT License. See LICENSE file for details.

### Apple's Original License
The Food Truck sample app concept and design are based on Apple's WWDC22 sample project. Used under Apple's Sample Code License.

## Platform Support

This Tsyne port runs on:
- **macOS** 10.13+
- **Linux** (X11/Wayland with system libraries)
- **Windows** (with appropriate GUI libraries)

Uses Fyne.io native widgets for authentic desktop experience.

## Further Reading

- [Pseudo-Declarative UI Composition](../../docs/pseudo-declarative-ui-composition.md)
- [TsyneTest Framework](../../docs/TESTING.md)
- [Tsyne API Reference](../../docs/API_REFERENCE.md)
