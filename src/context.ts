import { BridgeConnection } from './fynebridge';

/**
 * Context holds the current state during declarative UI building
 */
export class Context {
  bridge: BridgeConnection;
  private idCounter = 0;
  private windowStack: string[] = [];
  private containerStack: string[][] = [];

  constructor(bridge: BridgeConnection) {
    this.bridge = bridge;
  }

  generateId(prefix: string): string {
    return `${prefix}_${this.idCounter++}`;
  }

  pushWindow(windowId: string): void {
    this.windowStack.push(windowId);
  }

  popWindow(): string | undefined {
    return this.windowStack.pop();
  }

  getCurrentWindow(): string | undefined {
    return this.windowStack[this.windowStack.length - 1];
  }

  pushContainer(): void {
    this.containerStack.push([]);
  }

  popContainer(): string[] {
    return this.containerStack.pop() || [];
  }

  addToCurrentContainer(widgetId: string): void {
    const current = this.containerStack[this.containerStack.length - 1];
    if (current) {
      current.push(widgetId);
    }
  }

  getCurrentContainer(): string[] | undefined {
    return this.containerStack[this.containerStack.length - 1];
  }
}
