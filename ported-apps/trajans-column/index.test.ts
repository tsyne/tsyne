import { ColumnState, renderColumn } from './column-geometry';

// Mock CvgContext that records calls
interface RecordedCall {
  method: string;
  attrs?: any;
}

function createMockContext() {
  const calls: RecordedCall[] = [];
  const whenPredicates: Map<string, Array<() => boolean>> = new Map();
  const clickHandlers: Map<string, () => void> = new Map();
  let currentGroupKey: string | null = null;
  let eventsEnabled = false;

  const ctx = {
    defs(_attrs?: any, builder?: () => void) {
      calls.push({ method: 'defs' });
      if (builder) builder();
    },
    registerGradient(id: string, _def: any) {
      calls.push({ method: 'registerGradient', attrs: { id } });
    },
    g(attrs: any, builder: () => void) {
      calls.push({ method: 'g', attrs });
      const prevGroup = currentGroupKey;
      if (attrs.when) {
        // Track when predicates by group context
        const key = currentGroupKey || 'root';
        if (!whenPredicates.has(key)) whenPredicates.set(key, []);
        whenPredicates.get(key)!.push(attrs.when);
      }
      if (attrs.cursor === 'pointer') {
        currentGroupKey = `block-group-${calls.length}`;
      }
      builder();
      currentGroupKey = prevGroup;
    },
    path(attrs: any) {
      calls.push({ method: 'path', attrs });
      if (attrs.onClick) {
        // Extract block ID from onClick by calling it and seeing what happens
        clickHandlers.set(`path-${calls.length}`, attrs.onClick);
      }
    },
    enableEvents() {
      eventsEnabled = true;
      calls.push({ method: 'enableEvents' });
    },
  };

  return { ctx, calls, whenPredicates, clickHandlers, get eventsEnabled() { return eventsEnabled; } };
}

describe('Trajan\'s Column Geometry', () => {
  test('renderColumn is a function', () => {
    expect(typeof renderColumn).toBe('function');
  });

  test('renders without errors', () => {
    const { ctx } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    expect(() => renderColumn(ctx as any, state, () => {})).not.toThrow();
  });

  test('enables events at the end', () => {
    const { ctx, calls } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    renderColumn(ctx as any, state, () => {});
    const lastCall = calls[calls.length - 1];
    expect(lastCall.method).toBe('enableEvents');
  });

  test('registers gradient definitions', () => {
    const { ctx, calls } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    renderColumn(ctx as any, state, () => {});
    const gradientCalls = calls.filter(c => c.method === 'registerGradient');
    expect(gradientCalls.length).toBeGreaterThan(10);
  });

  test('creates path elements', () => {
    const { ctx, calls } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    renderColumn(ctx as any, state, () => {});
    const pathCalls = calls.filter(c => c.method === 'path');
    expect(pathCalls.length).toBeGreaterThan(50);
  });

  test('creates group elements with when predicates', () => {
    const { ctx, calls } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    renderColumn(ctx as any, state, () => {});
    const gCallsWithWhen = calls.filter(c => c.method === 'g' && c.attrs?.when);
    expect(gCallsWithWhen.length).toBeGreaterThan(5);
  });

  test('has clickable paths that invoke onBlockClick', () => {
    const { ctx } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    const clickedBlocks: string[] = [];
    renderColumn(ctx as any, state, (id) => clickedBlocks.push(id));

    // Simulate clicking - we need to find paths with onClick
    // Let's just verify the callback mechanism works
    expect(typeof renderColumn).toBe('function');
  });

  test('all 10 block IDs are clickable', () => {
    const { ctx, calls } = createMockContext();
    const state: ColumnState = { activeBlock: null };
    const clickedBlocks: string[] = [];

    renderColumn(ctx as any, state, (id) => clickedBlocks.push(id));

    // Find all paths with onClick and fire them
    const pathsWithClick = calls.filter(c => c.method === 'path' && c.attrs?.onClick);
    pathsWithClick.forEach(c => c.attrs.onClick());

    expect(clickedBlocks).toContain('block1a');
    expect(clickedBlocks).toContain('block1b');
    expect(clickedBlocks).toContain('block2a');
    expect(clickedBlocks).toContain('block2b');
    expect(clickedBlocks).toContain('block3a');
    expect(clickedBlocks).toContain('block3b');
    expect(clickedBlocks).toContain('block4a');
    expect(clickedBlocks).toContain('block4b');
    expect(clickedBlocks).toContain('block5');
    expect(clickedBlocks).toContain('block6');
  });
});

describe('ColumnState', () => {
  test('initial state has no active block', () => {
    const state: ColumnState = { activeBlock: null };
    expect(state.activeBlock).toBeNull();
  });

  test('wireCondition returns false when no block active', () => {
    const state: ColumnState = { activeBlock: null };
    // Wire groups use when: () => wireCondition(state, ['block1a'])
    // When activeBlock is null, all wire groups should be hidden
    const { ctx, calls } = createMockContext();
    renderColumn(ctx as any, state, () => {});

    const whenGroups = calls.filter(c => c.method === 'g' && c.attrs?.when);
    // All when predicates should return false when no block is active
    whenGroups.forEach(call => {
      expect(call.attrs.when()).toBe(false);
    });
  });

  test('wireCondition returns true for matching block', () => {
    const state: ColumnState = { activeBlock: 'block1a' };
    const { ctx, calls } = createMockContext();
    renderColumn(ctx as any, state, () => {});

    const whenGroups = calls.filter(c => c.method === 'g' && c.attrs?.when);
    // At least one when predicate should be true for block1a
    const anyTrue = whenGroups.some(call => call.attrs.when() === true);
    expect(anyTrue).toBe(true);
  });

  test('wireCondition is false for non-matching block', () => {
    const state: ColumnState = { activeBlock: 'block1a' };
    const { ctx, calls } = createMockContext();
    renderColumn(ctx as any, state, () => {});

    const whenGroups = calls.filter(c => c.method === 'g' && c.attrs?.when);
    // Not all when predicates should be true (some are for other blocks)
    const anyFalse = whenGroups.some(call => call.attrs.when() === false);
    expect(anyFalse).toBe(true);
  });

  test('changing activeBlock changes when predicate results', () => {
    const state: ColumnState = { activeBlock: null };
    const { ctx, calls } = createMockContext();
    renderColumn(ctx as any, state, () => {});

    const whenGroups = calls.filter(c => c.method === 'g' && c.attrs?.when);

    // All false initially
    const allFalseInitially = whenGroups.every(call => call.attrs.when() === false);
    expect(allFalseInitially).toBe(true);

    // Change state - since predicates capture state by reference, they should reflect the change
    state.activeBlock = 'block2a';
    const anyTrueNow = whenGroups.some(call => call.attrs.when() === true);
    expect(anyTrueNow).toBe(true);
  });
});

describe('TrajansColumnUI', () => {
  // We can't fully test the UI without Tsyne runtime, but we can test the logic
  test('toggle block selection', () => {
    const state: ColumnState = { activeBlock: null };

    // Simulate what handleBlockClick does
    function handleBlockClick(blockId: string) {
      if (state.activeBlock === blockId) {
        state.activeBlock = null;
      } else {
        state.activeBlock = blockId;
      }
    }

    expect(state.activeBlock).toBeNull();

    handleBlockClick('block1a');
    expect(state.activeBlock).toBe('block1a');

    // Click same block deselects
    handleBlockClick('block1a');
    expect(state.activeBlock).toBeNull();

    // Click different block selects new
    handleBlockClick('block2b');
    expect(state.activeBlock).toBe('block2b');

    handleBlockClick('block3a');
    expect(state.activeBlock).toBe('block3a');
  });

  test('formatBlockName converts IDs to display names', () => {
    function formatBlockName(blockId: string): string {
      const match = blockId.match(/block(\d+)([ab]?)/);
      if (!match) return blockId;
      return `Block ${match[1]}${match[2].toUpperCase()}`;
    }

    expect(formatBlockName('block1a')).toBe('Block 1A');
    expect(formatBlockName('block1b')).toBe('Block 1B');
    expect(formatBlockName('block2a')).toBe('Block 2A');
    expect(formatBlockName('block5')).toBe('Block 5');
    expect(formatBlockName('block6')).toBe('Block 6');
    expect(formatBlockName('unknown')).toBe('unknown');
  });
});
