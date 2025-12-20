import {
  TsyneElement,
  document,
  window,
  createElement,
  createSVGElement,
  getMousePosition,
  getTouchPositions
} from './dom';

describe('TsyneElement', () => {
  describe('construction', () => {
    it('creates an element with uppercase tagName', () => {
      const el = new TsyneElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('initializes with empty defaults', () => {
      const el = new TsyneElement('span');
      expect(el.className).toBe('');
      expect(el.id).toBe('');
      expect(el.innerHTML).toBe('');
      expect(el.textContent).toBe('');
      expect(el.children).toEqual([]);
      expect(el.parentNode).toBe(null);
    });
  });

  describe('content properties', () => {
    it('sets and gets innerHTML', () => {
      const el = new TsyneElement('div');
      el.innerHTML = '<p>Hello</p>';
      expect(el.innerHTML).toBe('<p>Hello</p>');
    });

    it('sets and gets textContent', () => {
      const el = new TsyneElement('div');
      el.textContent = 'Hello World';
      expect(el.textContent).toBe('Hello World');
    });
  });

  describe('child manipulation', () => {
    it('appends a child', () => {
      const parent = new TsyneElement('div');
      const child = new TsyneElement('span');

      parent.appendChild(child);

      expect(parent.children).toContain(child);
      expect(child.parentNode).toBe(parent);
    });

    it('removes a child', () => {
      const parent = new TsyneElement('div');
      const child = new TsyneElement('span');

      parent.appendChild(child);
      parent.removeChild(child);

      expect(parent.children).not.toContain(child);
      expect(child.parentNode).toBe(null);
    });

    it('inserts before a reference child', () => {
      const parent = new TsyneElement('div');
      const first = new TsyneElement('span');
      const second = new TsyneElement('p');
      const inserted = new TsyneElement('a');

      parent.appendChild(first);
      parent.appendChild(second);
      parent.insertBefore(inserted, second);

      expect(parent.children[0]).toBe(first);
      expect(parent.children[1]).toBe(inserted);
      expect(parent.children[2]).toBe(second);
    });

    it('inserts at end when refChild is null', () => {
      const parent = new TsyneElement('div');
      const first = new TsyneElement('span');
      const inserted = new TsyneElement('a');

      parent.appendChild(first);
      parent.insertBefore(inserted, null);

      expect(parent.children[1]).toBe(inserted);
    });
  });

  describe('attributes', () => {
    it('sets and gets attributes', () => {
      const el = new TsyneElement('input');
      el.setAttribute('type', 'text');
      el.setAttribute('placeholder', 'Enter text');

      expect(el.getAttribute('type')).toBe('text');
      expect(el.getAttribute('placeholder')).toBe('Enter text');
    });

    it('returns null for missing attributes', () => {
      const el = new TsyneElement('div');
      expect(el.getAttribute('nonexistent')).toBe(null);
    });

    it('removes attributes', () => {
      const el = new TsyneElement('div');
      el.setAttribute('data-test', 'value');
      el.removeAttribute('data-test');

      expect(el.getAttribute('data-test')).toBe(null);
    });

    it('checks if attribute exists', () => {
      const el = new TsyneElement('div');
      el.setAttribute('data-test', 'value');

      expect(el.hasAttribute('data-test')).toBe(true);
      expect(el.hasAttribute('nonexistent')).toBe(false);
    });

    it('updates id when id attribute is set', () => {
      const el = new TsyneElement('div');
      el.setAttribute('id', 'myId');
      expect(el.id).toBe('myId');
    });

    it('updates className when class attribute is set', () => {
      const el = new TsyneElement('div');
      el.setAttribute('class', 'my-class');
      expect(el.className).toBe('my-class');
    });
  });

  describe('event listeners', () => {
    it('adds event listeners', () => {
      const el = new TsyneElement('button');
      const listener = () => {};

      // Should not throw
      el.addEventListener('click', listener);
    });

    it('removes event listeners', () => {
      const el = new TsyneElement('button');
      const listener = () => {};

      el.addEventListener('click', listener);
      el.removeEventListener('click', listener);
      // Should not throw
    });

    it('dispatches events', () => {
      const el = new TsyneElement('button');
      const result = el.dispatchEvent({ type: 'click', target: el });
      expect(result).toBe(true);
    });
  });

  describe('geometry stubs', () => {
    it('returns zero-sized bounding rect', () => {
      const el = new TsyneElement('div');
      const rect = el.getBoundingClientRect();

      expect(rect.x).toBe(0);
      expect(rect.y).toBe(0);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
    });

    it('returns zero for offset dimensions', () => {
      const el = new TsyneElement('div');

      expect(el.offsetWidth).toBe(0);
      expect(el.offsetHeight).toBe(0);
      expect(el.offsetTop).toBe(0);
      expect(el.offsetLeft).toBe(0);
    });

    it('returns zero for client dimensions', () => {
      const el = new TsyneElement('div');

      expect(el.clientWidth).toBe(0);
      expect(el.clientHeight).toBe(0);
    });

    it('returns zero for scroll dimensions', () => {
      const el = new TsyneElement('div');

      expect(el.scrollWidth).toBe(0);
      expect(el.scrollHeight).toBe(0);
      expect(el.scrollTop).toBe(0);
      expect(el.scrollLeft).toBe(0);
    });
  });

  describe('contains', () => {
    it('returns true for self', () => {
      const el = new TsyneElement('div');
      expect(el.contains(el)).toBe(true);
    });

    it('returns true for descendant', () => {
      const parent = new TsyneElement('div');
      const child = new TsyneElement('span');
      const grandchild = new TsyneElement('a');

      parent.appendChild(child);
      child.appendChild(grandchild);

      expect(parent.contains(grandchild)).toBe(true);
    });

    it('returns false for non-descendant', () => {
      const el1 = new TsyneElement('div');
      const el2 = new TsyneElement('span');

      expect(el1.contains(el2)).toBe(false);
    });

    it('returns false for null', () => {
      const el = new TsyneElement('div');
      expect(el.contains(null)).toBe(false);
    });
  });

  describe('query methods', () => {
    it('querySelector returns null', () => {
      const el = new TsyneElement('div');
      expect(el.querySelector('.class')).toBe(null);
    });

    it('querySelectorAll returns empty array', () => {
      const el = new TsyneElement('div');
      expect(el.querySelectorAll('.class')).toEqual([]);
    });
  });

  describe('remove', () => {
    it('removes element from parent', () => {
      const parent = new TsyneElement('div');
      const child = new TsyneElement('span');

      parent.appendChild(child);
      child.remove();

      expect(parent.children).not.toContain(child);
      expect(child.parentNode).toBe(null);
    });
  });

  describe('cloneNode', () => {
    it('clones element with properties', () => {
      const el = new TsyneElement('div');
      el.className = 'my-class';
      el.id = 'my-id';
      el.innerHTML = '<p>Content</p>';
      el.setAttribute('data-test', 'value');

      const clone = el.cloneNode();

      expect(clone.tagName).toBe('DIV');
      expect(clone.className).toBe('my-class');
      expect(clone.id).toBe('my-id');
      expect(clone.innerHTML).toBe('<p>Content</p>');
      expect(clone.getAttribute('data-test')).toBe('value');
      expect(clone).not.toBe(el);
    });
  });
});

describe('TsyneDocument', () => {
  it('has body, head, and documentElement', () => {
    expect(document.body).toBeDefined();
    expect(document.head).toBeDefined();
    expect(document.documentElement).toBeDefined();
  });

  it('creates elements', () => {
    const el = document.createElement('div');
    expect(el.tagName).toBe('DIV');
  });

  it('creates elements with namespace', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    expect(el.tagName).toBe('CIRCLE');
  });

  it('creates text nodes', () => {
    const text = document.createTextNode('Hello');
    expect(text.tagName).toBe('#TEXT');
  });

  it('creates document fragments', () => {
    const frag = document.createDocumentFragment();
    expect(frag.tagName).toBe('#FRAGMENT');
  });

  it('getElementById returns null', () => {
    expect(document.getElementById('test')).toBe(null);
  });

  it('visibilityState is visible', () => {
    expect(document.visibilityState).toBe('visible');
  });

  it('hidden is false', () => {
    expect(document.hidden).toBe(false);
  });
});

describe('TsyneWindow', () => {
  it('has default dimensions', () => {
    expect(window.innerWidth).toBe(800);
    expect(window.innerHeight).toBe(600);
    expect(window.devicePixelRatio).toBe(1);
  });

  it('has location object', () => {
    expect(window.location.protocol).toBe('https:');
    expect(window.location.hostname).toBe('localhost');
  });

  it('has navigator object', () => {
    expect(window.navigator.userAgent).toContain('Tsyne');
    expect(window.navigator.onLine).toBe(true);
  });

  it('has performance.now', () => {
    const t = window.performance.now();
    expect(typeof t).toBe('number');
    expect(t).toBeGreaterThan(0);
  });

  it('matchMedia returns non-matching query', () => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    expect(mq.matches).toBe(false);
    expect(mq.media).toBe('(prefers-color-scheme: dark)');
  });

  it('getComputedStyle returns empty object', () => {
    const el = new TsyneElement('div');
    const style = window.getComputedStyle(el);
    expect(style).toEqual({});
  });
});

describe('Helper functions', () => {
  describe('createElement', () => {
    it('creates element with class', () => {
      const el = createElement('div', 'my-class');
      expect(el.tagName).toBe('DIV');
      expect(el.className).toBe('my-class');
    });

    it('appends to container', () => {
      const container = new TsyneElement('div');
      const el = createElement('span', null, container);

      expect(container.children).toContain(el);
    });
  });

  describe('createSVGElement', () => {
    it('creates element with attributes', () => {
      const el = createSVGElement('circle', { cx: 50, cy: 50, r: 25 });

      expect(el.tagName).toBe('CIRCLE');
      expect(el.getAttribute('cx')).toBe('50');
      expect(el.getAttribute('cy')).toBe('50');
      expect(el.getAttribute('r')).toBe('25');
    });
  });

  describe('mouse/touch position helpers', () => {
    it('getMousePosition returns point', () => {
      const el = new TsyneElement('canvas');
      const point = getMousePosition(el, { clientX: 100, clientY: 200 });

      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
    });

    it('getTouchPositions returns array of points', () => {
      const el = new TsyneElement('canvas');
      const touches = [
        { clientX: 10, clientY: 20 },
        { clientX: 30, clientY: 40 }
      ];
      const points = getTouchPositions(el, touches);

      expect(points).toHaveLength(2);
      expect(points[0].x).toBe(10);
      expect(points[0].y).toBe(20);
      expect(points[1].x).toBe(30);
      expect(points[1].y).toBe(40);
    });
  });
});
