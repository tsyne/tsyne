import {
  MarkerRenderer,
  MarkerAnchor,
  CUSTOM_MARKERS,
  isCustomMarker,
  type BuiltInMarkerType,
  type CustomMarker,
} from '../src/markers';

// Mock Path2D for Node environment if missing
if (typeof Path2D === 'undefined') {
  (global as any).Path2D = class {
    constructor(path?: string) {}
  };
}

describe('Markers', () => {
  describe('isCustomMarker', () => {
    it('should identify custom markers', () => {
      const custom: CustomMarker = {
        path: 'M0,0 L10,0 L5,10 Z',
        width: 10,
        height: 10,
        refX: 5,
        refY: 5,
      };
      expect(isCustomMarker(custom)).toBe(true);
    });

    it('should identify built-in markers', () => {
      expect(isCustomMarker('arrow')).toBe(false);
      expect(isCustomMarker('circle')).toBe(false);
      expect(isCustomMarker('square')).toBe(false);
    });
  });

  describe('CUSTOM_MARKERS', () => {
    it('should have predefined custom markers', () => {
      expect(CUSTOM_MARKERS.doubleArrow).toBeDefined();
      expect(CUSTOM_MARKERS.openArrow).toBeDefined();
      expect(CUSTOM_MARKERS.curvedArrow).toBeDefined();
      expect(CUSTOM_MARKERS.reverseArrow).toBeDefined();
      expect(CUSTOM_MARKERS.cross).toBeDefined();
      expect(CUSTOM_MARKERS.tee).toBeDefined();
      expect(CUSTOM_MARKERS.openCircle).toBeDefined();
      expect(CUSTOM_MARKERS.filledSquare).toBeDefined();
    });

    it('should have valid custom marker properties', () => {
      Object.values(CUSTOM_MARKERS).forEach((marker) => {
        expect(marker.path).toBeTruthy();
        expect(marker.width).toBeGreaterThan(0);
        expect(marker.height).toBeGreaterThan(0);
        expect(marker.refX).toBeGreaterThanOrEqual(0);
        expect(marker.refY).toBeGreaterThanOrEqual(0);
      });
    });

    it('double arrow should have path with two arrow heads', () => {
      expect(CUSTOM_MARKERS.doubleArrow.path).toContain('L -8,-3');
      expect(CUSTOM_MARKERS.doubleArrow.path).toContain('L -12,-3');
    });

    it('cross should have two line segments', () => {
      expect(CUSTOM_MARKERS.cross.path).toContain('L 4,4');
      expect(CUSTOM_MARKERS.cross.path).toContain('L -4,4');
    });
  });

  describe('MarkerRenderer', () => {
    let mockCtx: Partial<CanvasRenderingContext2D>;

    beforeEach(() => {
      mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        fill: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        arc: jest.fn(),
        fillRect: jest.fn(),
        scale: jest.fn(),
        globalAlpha: 1,
        fillStyle: '#000000',
        strokeStyle: '#000000',
      };
    });

    describe('render built-in markers', () => {
      it('should render arrow marker', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          100,
          100,
          0,
          'arrow',
          10,
          '#000000',
          1
        );
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.restore).toHaveBeenCalled();
        expect(mockCtx.translate).toHaveBeenCalledWith(100, 100);
        expect(mockCtx.rotate).toHaveBeenCalledWith(0);
        expect(mockCtx.fill).toHaveBeenCalled();
      });

      it('should render circle marker', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          50,
          50,
          Math.PI / 2,
          'circle',
          8,
          '#FF0000',
          0.8
        );
        expect(mockCtx.globalAlpha).toBe(0.8);
        expect(mockCtx.arc).toHaveBeenCalled();
      });

      it('should render square marker', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          75,
          75,
          Math.PI / 4,
          'square',
          6,
          '#00FF00',
          1
        );
        expect(mockCtx.fillRect).toHaveBeenCalled();
      });

      it('should render triangle marker', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          100,
          100,
          Math.PI,
          'triangle',
          10
        );
        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.fill).toHaveBeenCalled();
      });

      it('should render diamond marker', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          100,
          100,
          0,
          'diamond',
          10
        );
        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.closePath).toHaveBeenCalled();
      });

      it('should render bar marker', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          100,
          100,
          0,
          'bar',
          10
        );
        expect(mockCtx.fillRect).toHaveBeenCalled();
      });
    });

    describe('render custom markers', () => {
      it('should render custom marker from path', () => {
        const custom: CustomMarker = {
          path: 'M 0,0 L 10,0 L 5,10 Z',
          width: 10,
          height: 10,
          refX: 5,
          refY: 5,
        };

        MarkerRenderer.render(mockCtx as CanvasRenderingContext2D, 100, 100, 0, custom, 10);
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.scale).toHaveBeenCalled();
        expect(mockCtx.fill).toHaveBeenCalled();
        expect(mockCtx.restore).toHaveBeenCalled();
      });

      it('should render preset custom markers', () => {
        MarkerRenderer.render(
          mockCtx as CanvasRenderingContext2D,
          100,
          100,
          0,
          CUSTOM_MARKERS.doubleArrow,
          10
        );
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.fill).toHaveBeenCalled();
      });
    });

    describe('getMarkerSize', () => {
      it('should return base size for built-in markers', () => {
        expect(MarkerRenderer.getMarkerSize('arrow', 10)).toBe(10);
        expect(MarkerRenderer.getMarkerSize('circle', 5)).toBe(5);
      });

      it('should return max dimension for custom markers', () => {
        const custom: CustomMarker = {
          path: 'M0,0 L10,0 L5,15 Z',
          width: 10,
          height: 15,
          refX: 5,
          refY: 7,
        };
        expect(MarkerRenderer.getMarkerSize(custom, 10)).toBe(15);
      });
    });
  });

  describe('MarkerAnchor', () => {
    it('should initialize with no markers', () => {
      const anchor = new MarkerAnchor();
      expect(anchor.getStartMarker()).toBeNull();
      expect(anchor.getEndMarker()).toBeNull();
    });

    it('should set start marker', () => {
      const anchor = new MarkerAnchor();
      anchor.setStartMarker('arrow', 10, '#000000', 1);
      const marker = anchor.getStartMarker();
      expect(marker).not.toBeNull();
      expect(marker?.type).toBe('arrow');
      expect(marker?.size).toBe(10);
      expect(marker?.color).toBe('#000000');
      expect(marker?.alpha).toBe(1);
    });

    it('should set end marker', () => {
      const anchor = new MarkerAnchor();
      anchor.setEndMarker('circle', 8, '#FF0000', 0.5);
      const marker = anchor.getEndMarker();
      expect(marker).not.toBeNull();
      expect(marker?.type).toBe('circle');
      expect(marker?.size).toBe(8);
      expect(marker?.color).toBe('#FF0000');
      expect(marker?.alpha).toBe(0.5);
    });

    it('should support fluent API', () => {
      const anchor = new MarkerAnchor();
      const result = anchor
        .setStartMarker('arrow')
        .setEndMarker('circle');
      expect(result).toBe(anchor);
      expect(anchor.getStartMarker()).not.toBeNull();
      expect(anchor.getEndMarker()).not.toBeNull();
    });

    it('should clear start marker', () => {
      const anchor = new MarkerAnchor();
      anchor.setStartMarker('arrow').clearStartMarker();
      expect(anchor.getStartMarker()).toBeNull();
    });

    it('should clear end marker', () => {
      const anchor = new MarkerAnchor();
      anchor.setEndMarker('circle').clearEndMarker();
      expect(anchor.getEndMarker()).toBeNull();
    });

    it('should handle custom markers', () => {
      const anchor = new MarkerAnchor();
      const custom = CUSTOM_MARKERS.doubleArrow;
      anchor.setStartMarker(custom, 12, '#0000FF', 1);
      const marker = anchor.getStartMarker();
      expect(marker?.type).toBe(custom);
    });

    it('should render markers to canvas', () => {
      const anchor = new MarkerAnchor();
      anchor.setStartMarker('arrow', 10, '#000000', 1);
      anchor.setEndMarker('circle', 8, '#FF0000', 1);

      const mockCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        fill: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        globalAlpha: 1,
        fillStyle: '#000000',
        strokeStyle: '#000000',
      };

      anchor.renderMarkers(mockCtx as CanvasRenderingContext2D, 0, 0, 100, 0);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should not render markers for zero-distance endpoints', () => {
      const anchor = new MarkerAnchor();
      anchor.setStartMarker('arrow').setEndMarker('circle');

      const mockCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
      };

      // Same start and end points
      anchor.renderMarkers(mockCtx as CanvasRenderingContext2D, 0, 0, 0, 0);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });
  });

  describe('Marker types', () => {
    it('should support all built-in marker types', () => {
      const types: BuiltInMarkerType[] = [
        'arrow',
        'circle',
        'square',
        'triangle',
        'diamond',
        'bar',
      ];

      types.forEach((type) => {
        const anchor = new MarkerAnchor();
        anchor.setStartMarker(type);
        expect(anchor.getStartMarker()?.type).toBe(type);
      });
    });

    it('should render all custom markers without error', () => {
      const mockCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        fill: jest.fn(),
        scale: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        globalAlpha: 1,
        fillStyle: '#000000',
        strokeStyle: '#000000',
      };

      Object.entries(CUSTOM_MARKERS).forEach(([name, marker]) => {
        expect(() => {
          MarkerRenderer.render(
            mockCtx as CanvasRenderingContext2D,
            100,
            100,
            0,
            marker,
            10
          );
        }).not.toThrow();
      });
    });
  });

  describe('Rotation and positioning', () => {
    it('should apply correct rotation for different angles', () => {
      const mockCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        fill: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        globalAlpha: 1,
        fillStyle: '#000000',
      };

      const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2];

      angles.forEach((angle) => {
        (mockCtx.rotate as jest.Mock).mockClear();
        MarkerRenderer.render(mockCtx as CanvasRenderingContext2D, 100, 100, angle, 'arrow');
        expect(mockCtx.rotate).toHaveBeenCalledWith(angle);
      });
    });

    it('should position markers at correct coordinates', () => {
      const mockCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        fill: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        globalAlpha: 1,
        fillStyle: '#000000',
      };

      const positions = [
        [0, 0],
        [100, 100],
        [250, 150],
        [-50, 75],
      ];

      positions.forEach(([x, y]) => {
        (mockCtx.translate as jest.Mock).mockClear();
        MarkerRenderer.render(mockCtx as CanvasRenderingContext2D, x, y, 0, 'arrow');
        expect(mockCtx.translate).toHaveBeenCalledWith(x, y);
      });
    });

    it('should apply correct alpha values', () => {
      const mockCtx: Partial<CanvasRenderingContext2D> = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        fill: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        globalAlpha: 0,
        fillStyle: '#000000',
      };

      const alphas = [0, 0.25, 0.5, 0.75, 1];

      alphas.forEach((alpha) => {
        MarkerRenderer.render(mockCtx as CanvasRenderingContext2D, 100, 100, 0, 'arrow', 10, '#000', alpha);
        expect(mockCtx.globalAlpha).toBe(alpha);
      });
    });
  });
});
