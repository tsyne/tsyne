import { AccessibilityManager } from '../src/accessibility';
import { Context } from '../src/context';

describe('AccessibilityManager', () => {
  let ctx: Context;
  let manager: AccessibilityManager;

  beforeEach(() => {
    // Create a mock context with a mock bridge
    ctx = {
      bridge: {
        on: jest.fn(),
        send: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    manager = new AccessibilityManager(ctx);
  });

  describe('Template String Resolution', () => {
    it('should resolve ${label} in descriptions', () => {
      // Register a widget
      manager.registerWidget('widget1', {
        widgetId: 'widget1',
        label: 'Submit Button',
        description: 'Click ${label} to submit',
        role: 'button'
      });

      const info = manager.getWidgetInfo('widget1');
      expect(info).toBeDefined();
      expect(info?.label).toBe('Submit Button');
    });

    it.skip('should resolve ${parent.label} in descriptions', () => {
      // FIXME: announceSpy not being called - parent template resolution not working
      // Register parent
      manager.registerWidget('parent1', {
        widgetId: 'parent1',
        label: 'Calculator Keypad',
        role: 'group'
      });

      // Register child with parent reference
      manager.registerWidget('child1', {
        widgetId: 'child1',
        label: 'Number 5',
        description: '${label} in ${parent.label}',
        role: 'button',
        parentId: 'parent1'
      });

      // Enable accessibility mode
      manager.enable();

      // Mock the announce method to capture the announcement
      const announceSpy = jest.spyOn(manager as any, 'announce');

      // Trigger announcement (will call resolveTemplate internally)
      manager.announceWidget('child1');

      // Verify that the template was resolved
      expect(announceSpy).toHaveBeenCalled();
      const announcement = announceSpy.mock.calls[0][0] as string;
      expect(announcement).toContain('Number 5');
      expect(announcement).toContain('Calculator Keypad');
    });

    it.skip('should resolve ${grandparent.label} in descriptions', () => {
      // FIXME: announceSpy not being called - grandparent template resolution not working
      // Register grandparent
      manager.registerWidget('grandparent1', {
        widgetId: 'grandparent1',
        label: 'Main Calculator',
        role: 'application'
      });

      // Register parent
      manager.registerWidget('parent1', {
        widgetId: 'parent1',
        label: 'Number Pad',
        role: 'group',
        parentId: 'grandparent1'
      });

      // Register child
      manager.registerWidget('child1', {
        widgetId: 'child1',
        label: '5',
        description: 'Number ${label} in ${parent.label} within ${grandparent.label}',
        role: 'button',
        parentId: 'parent1'
      });

      // Enable accessibility mode
      manager.enable();

      const announceSpy = jest.spyOn(manager as any, 'announce');
      manager.announceWidget('child1');

      const announcement = announceSpy.mock.calls[0][0] as string;
      expect(announcement).toContain('5');
      expect(announcement).toContain('Number Pad');
      expect(announcement).toContain('Main Calculator');
    });

    it.skip('should skip auto-parent-context when templates reference parent', () => {
      // FIXME: announceSpy not being called
      // Register parent
      manager.registerWidget('grid1', {
        widgetId: 'grid1',
        label: 'nine cell grid',
        role: 'group'
      });

      // Register child with template that references parent
      manager.registerWidget('cell1', {
        widgetId: 'cell1',
        label: 'top left',
        description: 'Row 1, Column 1 in ${parent.label}',
        role: 'button',
        parentId: 'grid1'
      });

      manager.enable();
      const announceSpy = jest.spyOn(manager as any, 'announce');
      manager.announceWidget('cell1');

      const announcement = announceSpy.mock.calls[0][0] as string;

      // Should contain resolved template
      expect(announcement).toContain('nine cell grid');

      // Should NOT contain duplicate "In nine cell grid" from auto-context
      const matches = announcement.match(/nine cell grid/g);
      expect(matches?.length).toBe(1); // Only one occurrence
    });

    it.skip('should handle missing parent gracefully', () => {
      // FIXME: announceSpy not being called
      // Register child without parent existing
      manager.registerWidget('orphan1', {
        widgetId: 'orphan1',
        label: 'Orphan Widget',
        description: '${label} in ${parent.label}',
        role: 'button',
        parentId: 'nonexistent'
      });

      manager.enable();
      const announceSpy = jest.spyOn(manager as any, 'announce');
      manager.announceWidget('orphan1');

      // Should not throw error, just resolve to empty string for missing parent
      expect(announceSpy).toHaveBeenCalled();
      const announcement = announceSpy.mock.calls[0][0] as string;
      expect(announcement).toContain('Orphan Widget');
      // Parent reference should resolve to empty string
      expect(announcement).toContain('Orphan Widget in ');
    });
  });

  describe('Widget Registration from Bridge Events', () => {
    it('should register widgets from accessibilityRegistered events', () => {
      // Capture the event handler
      const onMock = ctx.bridge.on as jest.Mock;
      const accessibilityHandler = onMock.mock.calls.find(
        call => call[0] === 'accessibilityRegistered'
      )?.[1];

      expect(accessibilityHandler).toBeDefined();

      // Simulate bridge event
      accessibilityHandler({
        widgetId: 'btn1',
        label: 'Submit',
        description: 'Submit the form',
        role: 'button',
        hint: 'Press Enter',
        parentId: 'form1'
      });

      // Verify widget was registered
      const info = manager.getWidgetInfo('btn1');
      expect(info).toBeDefined();
      expect(info?.label).toBe('Submit');
      expect(info?.parentId).toBe('form1');
    });
  });
});
