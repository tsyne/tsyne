#!/usr/bin/env tsyne
//
// Stock Ticker - A standalone Tsyne application demonstrating embedded npm dependencies
//
// This file uses @Grab directives to declare npm dependencies inline.
// Run with: ./scripts/tsyne examples/stock-ticker-standalone.ts
//
// Uses Yahoo Finance API via the 'yahoo-finance2' package for real stock data.

// @Grab('yahoo-finance2@^2.11.0')
// @Grab('date-fns@^3.0.0')

import yahooFinance from 'yahoo-finance2';
import { formatDistanceToNow } from 'date-fns';

// Tsyne is automatically available when run via `tsyne` command (no @Grab needed)
import { app, window, vbox, hbox, label, button, select, separator } from 'tsyne';

// Popular stock symbols
const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD'];

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
}

// State
let selectedSymbol = SYMBOLS[0];
let quote: StockQuote | null = null;
let lastUpdated: Date | null = null;
let errorMessage: string | null = null;
let isLoading = false;

// Widget references
let symbolLabel: any;
let priceLabel: any;
let changeLabel: any;
let detailsLabel: any;
let statusLabel: any;

async function fetchQuote(symbol: string): Promise<StockQuote> {
  const result = await yahooFinance.quote(symbol);

  return {
    symbol: result.symbol,
    name: result.shortName || result.longName || symbol,
    price: result.regularMarketPrice || 0,
    change: result.regularMarketChange || 0,
    changePercent: result.regularMarketChangePercent || 0,
    high: result.regularMarketDayHigh || 0,
    low: result.regularMarketDayLow || 0,
    volume: result.regularMarketVolume || 0,
  };
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(2) + 'B';
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(2) + 'K';
  return vol.toString();
}

function updateDisplay() {
  if (isLoading) {
    symbolLabel?.setText(selectedSymbol);
    priceLabel?.setText('Loading...');
    changeLabel?.setText('');
    detailsLabel?.setText('');
    statusLabel?.setText('Fetching quote...');
    return;
  }

  if (errorMessage) {
    symbolLabel?.setText(selectedSymbol);
    priceLabel?.setText('Error');
    changeLabel?.setText(errorMessage);
    detailsLabel?.setText('');
    statusLabel?.setText('Failed to fetch quote');
    return;
  }

  if (!quote) return;

  symbolLabel?.setText(`${quote.symbol} - ${quote.name}`);
  priceLabel?.setText(`$${quote.price.toFixed(2)}`);

  // Change with color indicator
  const changeSign = quote.change >= 0 ? '+' : '';
  const changeText = `${changeSign}${quote.change.toFixed(2)} (${changeSign}${quote.changePercent.toFixed(2)}%)`;
  const changeIndicator = quote.change >= 0 ? '📈' : '📉';
  changeLabel?.setText(`${changeIndicator} ${changeText}`);

  detailsLabel?.setText(
    `High: $${quote.high.toFixed(2)} | Low: $${quote.low.toFixed(2)} | Vol: ${formatVolume(quote.volume)}`
  );

  if (lastUpdated) {
    // Using date-fns for relative time formatting
    statusLabel?.setText(`Updated ${formatDistanceToNow(lastUpdated)} ago`);
  }
}

async function refreshQuote() {
  isLoading = true;
  errorMessage = null;
  updateDisplay();

  try {
    quote = await fetchQuote(selectedSymbol);
    lastUpdated = new Date();
    errorMessage = null;
  } catch (err: any) {
    errorMessage = err.message || 'Unknown error';
    quote = null;
  }

  isLoading = false;
  updateDisplay();
}

function onSymbolChange(symbol: string) {
  selectedSymbol = symbol;
  refreshQuote();
}

// Build the Stock Ticker UI using current Tsyne API
app({ title: 'Stock Ticker' }, () => {
  window({ title: 'Stock Ticker', width: 450, height: 320 }, () => {
    vbox(() => {
      // Header
      label('Stock Ticker');
      separator();

      // Symbol selector
      hbox(() => {
        label('Symbol: ');
        select(SYMBOLS, onSymbolChange);
        button('Refresh', refreshQuote);
      });

      separator();

      // Stock display
      vbox(() => {
        // Company name
        symbolLabel = label(selectedSymbol);

        // Large price display
        priceLabel = label('--');

        // Change
        changeLabel = label('');

        // Details row
        detailsLabel = label('');
      });

      separator();

      // Status bar
      statusLabel = label('Starting...');
    });

    // Initial fetch
    refreshQuote();
  });
});
