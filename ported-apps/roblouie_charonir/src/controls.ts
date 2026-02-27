import { EnhancedDOMPoint } from '@/engine/enhanced-dom-point';

class Controls {
  isUp = false;
  isDown = false;
  isSelect?: boolean = false;
  accel = 0;
  decel = 0;
  direction: EnhancedDOMPoint;

  keyMap: Map<string, boolean> = new Map();
  previousState = { isUp: this.isUp, isDown: this.isDown, isSelect: this.isSelect };

  private eventTarget: any = null;

  constructor() {
    this.direction = new EnhancedDOMPoint();
  }

  /** Bind to a canvas (or document) for keyboard events */
  bindTo(target: any) {
    this.eventTarget = target;
    target.addEventListener('keydown', (event: any) => this.toggleKey(event, true));
    target.addEventListener('keyup', (event: any) => this.toggleKey(event, false));
  }

  /** Check if a key (by code or lowercase key name) is pressed */
  private isKeyDown(code: string): boolean {
    if (this.keyMap.get(code)) return true;
    // Fyne dispatches lowercase key values, so also check those
    const lowerMap: Record<string, string> = {
      'KeyW': 'w', 'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd',
      'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
      'Enter': 'Enter',
    };
    const alt = lowerMap[code];
    if (alt && this.keyMap.get(alt)) return true;
    // Also check lowercase version directly
    if (this.keyMap.get(code.toLowerCase())) return true;
    return false;
  }

  queryController() {
    this.previousState.isUp = this.isUp;
    this.previousState.isDown = this.isDown;
    this.previousState.isSelect = this.isSelect;

    // No gamepad support in Tsyne
    const leftVal = (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) ? -1 : 0;
    const rightVal = (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) ? 1 : 0;
    this.direction.x = leftVal + rightVal;
    this.direction.y = 0;

    if (this.direction.magnitude < 0.1) {
      this.direction.x = 0; this.direction.y = 0;
    }

    const keyboardUp = this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp');
    const keyboardDown = this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown');

    this.isUp = keyboardUp || false;
    this.isDown = keyboardDown || false;

    this.accel = keyboardUp ? 1 : 0;
    this.decel = keyboardDown ? 1 : 0;
    this.isSelect = this.isKeyDown('Enter');
  }

  private toggleKey(event: any, isPressed: boolean) {
    // Store both code and key for maximum compatibility
    if (event.code) this.keyMap.set(event.code, isPressed);
    if (event.key) this.keyMap.set(event.key, isPressed);
  }
}

export const controls = new Controls();
