# Streaming Content to Tsyne Pages

## Overview

Streaming content from server to Tsyne Browser pages, similar to:
- Server-Sent Events (SSE)
- WebSockets
- Long polling
- Real-time updates

## The Challenge

Web browsers support real-time updates via:
- **WebSockets** - Full-duplex communication
- **Server-Sent Events (SSE)** - Server pushes updates to client
- **Long polling** - Client repeatedly polls server

Tsyne Browser pages are loaded once as TypeScript code. How do we get streaming updates?

## Approaches

### Approach 1: Polling with Timer

Client polls server periodically:

```typescript
// In Tsyne page
const { vbox, label } = tsyne;

let statusLabel;
let counter = 0;

vbox(() => {
  statusLabel = label('Waiting for updates...');
});

// Poll server every 2 seconds
const pollInterval = setInterval(async () => {
  try {
    // Simulated fetch (in real app, would hit server endpoint)
    counter++;
    statusLabel.setText(`Update ${counter} at ${new Date().toLocaleTimeString()}`);

    // Real implementation:
    // const response = await fetch('http://localhost:3000/api/status');
    // const data = await response.json();
    // statusLabel.setText(`Status: ${data.status}`);

  } catch (error) {
    console.error('Poll failed:', error);
  }
}, 2000);

// Cleanup when navigating away (would need page lifecycle hooks)
// clearInterval(pollInterval);
```

**Pros:**
- Simple to implement
- Works with any server
- No special browser support needed

**Cons:**
- Wasteful (polls even when no updates)
- Delayed updates (depends on poll interval)
- Server overhead (many requests)

### Approach 2: Long Polling

Client makes request, server holds connection until data available:

```typescript
// In Tsyne page
let messageLabel;

vbox(() => {
  messageLabel = label('Connecting...');
  startLongPolling();
});

async function startLongPolling() {
  while (true) {
    try {
      // Request data from server
      // Server holds connection open until new data arrives
      const response = await fetch('http://localhost:3000/api/long-poll');
      const data = await response.json();

      messageLabel.setText(`Message: ${data.message}`);

      // Immediately start next poll
    } catch (error) {
      console.error('Long poll failed:', error);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
    }
  }
}
```

**Server (Express):**
```javascript
app.get('/api/long-poll', async (req, res) => {
  // Wait for new data (up to 30 seconds)
  const data = await waitForNewData(30000);

  if (data) {
    res.json(data);
  } else {
    // Timeout, return empty
    res.json({ message: 'No updates' });
  }
});
```

**Pros:**
- Near real-time updates
- Less wasteful than regular polling
- Simple server implementation

**Cons:**
- Still makes many requests
- Server must handle long-lived connections
- Complexity in handling timeouts

### Approach 3: Page Reload on Server Signal

Server generates pages with updated data on each request:

```typescript
// Server (Express) with server-side rendering
app.get('/live-feed', (req, res) => {
  const latestData = getLatestData();

  const pageCode = `
const { vbox, label, button } = tsyne;

vbox(() => {
  label('Live Feed');
  label('');
  label('Latest update: ${latestData.timestamp}');
  label('Message: ${latestData.message}');
  label('Count: ${latestData.count}');
  label('');

  button('Refresh', () => {
    browserContext.reload();
  });
});
  `;

  res.type('text/typescript');
  res.send(pageCode);
});
```

Client can auto-reload:
```typescript
// In page
const { vbox, label } = tsyne;

vbox(() => {
  label('Auto-refreshing feed...');
});

// Auto-reload every 5 seconds
setTimeout(() => {
  browserContext.reload();
}, 5000);
```

**Pros:**
- Simple concept
- Server fully controls content
- Works with existing infrastructure

**Cons:**
- Full page reload (not ideal for UX)
- Wasteful (re-renders entire page)
- Loses client-side state

### Approach 4: Hybrid - Initial Load + Client Updates

Best of both worlds:

```typescript
// Server generates initial page with data
app.get('/stock-ticker', (req, res) => {
  const stocks = getStockData();

  const pageCode = `
const { vbox, label } = tsyne;

// Initial data from server
const initialStocks = ${JSON.stringify(stocks)};

let stockLabels = {};

vbox(() => {
  label('Stock Ticker (Live)');
  label('');

  // Display initial stocks
  initialStocks.forEach(stock => {
    stockLabels[stock.symbol] = label(\`\${stock.symbol}: $\${stock.price}\`);
  });
});

// Poll for updates
setInterval(async () => {
  try {
    // Fetch only updates (smaller payload)
    const updates = await fetchJSON('http://localhost:3000/api/stock-updates');

    updates.forEach(update => {
      if (stockLabels[update.symbol]) {
        stockLabels[update.symbol].setText(
          \`\${update.symbol}: $\${update.price} \${update.change > 0 ? '↑' : '↓'}\`
        );
      }
    });
  } catch (error) {
    console.error('Update failed:', error);
  }
}, 1000); // Update every second
  `;

  res.type('text/typescript');
  res.send(pageCode);
});

// API endpoint for updates only
app.get('/api/stock-updates', (req, res) => {
  const updates = getStockUpdates(); // Only changed stocks
  res.json(updates);
});
```

**Pros:**
- Fast initial load (server renders data)
- Efficient updates (only changed data)
- Smooth UX (no page reload)
- Best performance

**Cons:**
- More complex implementation
- Client and server both have logic

### Approach 5: WebSocket Bridge (Advanced)

For true streaming, Tsyne Bridge could support WebSocket connections:

```typescript
// In Tsyne page
const { vbox, label } = tsyne;

let messagesLabel;

vbox(() => {
  label('WebSocket Stream');
  messagesLabel = label('Connecting...');

  // Connect to WebSocket
  const ws = browserContext.connectWebSocket('ws://localhost:8080/stream');

  ws.onMessage = (data) => {
    messagesLabel.setText(messagesLabel.getText() + '\\n' + data);
  };

  ws.onError = (error) => {
    messagesLabel.setText('Error: ' + error);
  };

  ws.onClose = () => {
    messagesLabel.setText(messagesLabel.getText() + '\\n[Connection closed]');
  };
});
```

**Implementation in Bridge:**
```go
// In Tsyne Bridge (Go)
func ConnectWebSocket(url string) (*WebSocketConnection, error) {
    conn, _, err := websocket.DefaultDialer.Dial(url, nil)
    if err != nil {
        return nil, err
    }

    ws := &WebSocketConnection{conn: conn}

    // Read messages from WebSocket
    go func() {
        for {
            _, message, err := conn.ReadMessage()
            if err != nil {
                ws.handleError(err)
                break
            }
            ws.handleMessage(message)
        }
    }()

    return ws, nil
}
```

**Pros:**
- True streaming
- Full-duplex communication
- Standard protocol
- Efficient

**Cons:**
- Requires Bridge extension
- More complex implementation
- WebSocket server needed

## Comparison: Web vs Tsyne

| Pattern | Web | Tsyne |
|---------|-----|-------|
| **Polling** | `setInterval(() => fetch(...))` | Same |
| **Long Polling** | `fetch(...)` with long timeout | Same |
| **Server-Sent Events** | `EventSource('...')` | Not native, can emulate with polling |
| **WebSockets** | `new WebSocket('...')` | Could add to Bridge |
| **Server Push** | HTTP/2 Server Push | N/A (pages are code, not HTML) |

## Recommended Patterns

### Pattern 1: Dashboard with Live Data

Use **hybrid approach** (Approach 4):
- Server renders initial data in page
- Client polls for updates every 1-5 seconds
- Update only changed widgets

### Pattern 2: Chat Application

Use **WebSocket bridge** (Approach 5):
- Server maintains WebSocket connections
- Messages pushed immediately
- Full-duplex for sending messages

### Pattern 3: News Feed

Use **polling** (Approach 1):
- Poll every 30-60 seconds
- Server returns new items since last poll
- Append to existing feed (no full reload)

### Pattern 4: Real-time Charts

Use **hybrid + frequent polling**:
- Initial chart data from server
- Poll every 500ms-1s for new data points
- Update chart without redraw

## Example: Live Stock Ticker

Complete example with server and page:

**Server (server-streaming.js):**
```javascript
const express = require('express');
const app = express();

let stockData = {
  'AAPL': { price: 150.25, change: 0 },
  'GOOGL': { price: 2800.50, change: 0 },
  'MSFT': { price: 350.75, change: 0 }
};

// Simulate stock price changes
setInterval(() => {
  Object.keys(stockData).forEach(symbol => {
    const change = (Math.random() - 0.5) * 5;
    stockData[symbol].price += change;
    stockData[symbol].change = change;
  });
}, 1000);

// Page endpoint
app.get('/stocks', (req, res) => {
  const pageCode = `
const { vbox, scroll, label } = tsyne;

let stockLabels = {};
let lastUpdate;

vbox(() => {
  label('Live Stock Ticker');
  label('');

  scroll(() => {
    vbox(() => {
      // Create labels for each stock
      stockLabels['AAPL'] = label('AAPL: Loading...');
      stockLabels['GOOGL'] = label('GOOGL: Loading...');
      stockLabels['MSFT'] = label('MSFT: Loading...');
      label('');
      lastUpdate = label('Last update: Never');
    });
  });

  // Poll for updates
  updateStocks();
  setInterval(updateStocks, 1000);
});

async function updateStocks() {
  try {
    const response = await fetch('http://localhost:3000/api/stocks');
    const stocks = await response.json();

    Object.entries(stocks).forEach(([symbol, data]) => {
      const arrow = data.change > 0 ? '↑' : data.change < 0 ? '↓' : '→';
      const color = data.change > 0 ? '🟢' : data.change < 0 ? '🔴' : '⚪';

      stockLabels[symbol].setText(
        \`\${color} \${symbol}: $\${data.price.toFixed(2)} \${arrow} $\${Math.abs(data.change).toFixed(2)}\`
      );
    });

    lastUpdate.setText(\`Last update: \${new Date().toLocaleTimeString()}\`);

  } catch (error) {
    console.error('Update failed:', error);
  }
}
  `;

  res.type('text/typescript');
  res.send(pageCode);
});

// API endpoint for stock updates
app.get('/api/stocks', (req, res) => {
  res.json(stockData);
});

app.listen(3000, () => {
  console.log('Streaming server running on http://localhost:3000/');
});
```

Run:
```bash
node server-streaming.js
npx tsyne-browser http://localhost:3000/stocks
```

## Future Enhancements

### 1. Native Streaming API

Add to Tsyne:
```typescript
// Proposed API
const stream = browserContext.createStream('http://localhost:3000/events');

stream.onData((data) => {
  label.setText(data.message);
});

stream.onError((error) => {
  console.error('Stream error:', error);
});

stream.close();
```

### 2. Server-Sent Events Emulation

```typescript
const events = browserContext.createEventSource('http://localhost:3000/sse');

events.addEventListener('message', (event) => {
  console.log('New message:', event.data);
});

events.addEventListener('update', (event) => {
  const data = JSON.parse(event.data);
  updateWidget(data);
});
```

### 3. Real-time Binding

```typescript
// Proposed API - automatically sync widget with server
const boundLabel = label('', {
  bindTo: 'http://localhost:3000/api/current-time',
  updateInterval: 1000
});

// Label automatically updates every second with server data
```

## Best Practices

1. **Start with polling** - Simplest to implement and debug
2. **Optimize polling interval** - Balance freshness vs server load
3. **Use exponential backoff** - On errors, wait longer before retry
4. **Show update timestamps** - User knows data freshness
5. **Handle errors gracefully** - Display connection status
6. **Cleanup on navigation** - Cancel timers/connections when leaving page
7. **Consider server load** - Don't poll too frequently
8. **Use diff updates** - Server sends only changed data

## Conclusion

While Tsyne doesn't have native WebSocket/SSE support yet, polling and hybrid approaches work well for most real-time use cases. The combination of server-side rendering (initial data) and client-side polling (updates) provides a good balance of simplicity, performance, and user experience.
