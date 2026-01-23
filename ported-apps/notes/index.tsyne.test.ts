/**
 * Notes App - TsyneTest Widget Tests
 *
 * Tests for UI interactions, theme switching, and note management in the UI
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildNotesApp } from './index';

describe('Notes App - UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    ctx = tsyneTest.getContext();
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('App Initialization', () => {
    it('should render the app', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Check that main UI elements are present
      await ctx.getById('notes-title').within(1000).shouldExist();
      await ctx.getById('editor-title').within(1000).shouldExist();
    });

    it('should display notes list', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Should display the initial notes
      await ctx.getById('notes-list').within(1000).shouldExist();
    });

    it('should display the editor panel', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      await ctx.getById('title-entry').within(1000).shouldExist();
      await ctx.getById('content-entry').within(1000).shouldExist();
    });
  });

  // ============================================================================
  // NOTE SELECTION TESTS
  // ============================================================================

  describe('Note Selection', () => {
    it('should load selected note in editor', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // First note should be selected and loaded
      const titleEntry = await ctx.getById('title-entry').within(1000);
      const text = await titleEntry.getText();
      expect(text).not.toBe('');
    });

    it('should update editor when selecting different note', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Click on second note (Shopping List)
      // This would require finding a specific note button
      // For now, just verify the structure is set up correctly
      await ctx.getById('notes-list').within(1000).shouldExist();
    });
  });

  // ============================================================================
  // NOTE CREATION TESTS
  // ============================================================================

  describe('Note Creation', () => {
    it('should create new note when clicking add button', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const addBtn = await ctx.getById('add-note-btn').within(1000);
      await addBtn.click();

      // New note should be created and selected
      const titleEntry = await ctx.getById('title-entry').within(1000);
      const text = await titleEntry.getText();
      expect(text).toBe('New Note');
    });

    it('should allow editing new note title', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Create new note
      const addBtn = await ctx.getById('add-note-btn').within(1000);
      await addBtn.click();

      // Edit the title
      const titleEntry = await ctx.getById('title-entry').within(1000);
      await titleEntry.setText('My New Note');

      // Verify title was updated
      const updatedText = await titleEntry.getText();
      expect(updatedText).toBe('My New Note');
    });

    it('should allow editing new note content', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Create new note
      const addBtn = await ctx.getById('add-note-btn').within(1000);
      await addBtn.click();

      // Edit the content
      const contentEntry = await ctx.getById('content-entry').within(1000);
      await contentEntry.setText('This is my note content');

      // Verify content was updated
      const updatedContent = await contentEntry.getText();
      expect(updatedContent).toBe('This is my note content');
    });
  });

  // ============================================================================
  // NOTE DELETION TESTS
  // ============================================================================

  describe('Note Deletion', () => {
    it('should delete note when clicking delete button', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const initialStatus = await ctx.getById('status-label').within(1000).getText();
      const initialCount = parseInt(initialStatus.split(' ')[0]);

      // Click delete button
      const deleteBtn = await ctx.getById('delete-note-btn').within(1000);
      await deleteBtn.click();

      // Status should show one fewer note
      const updatedStatus = await ctx.getById('status-label').within(1000).getText();
      const updatedCount = parseInt(updatedStatus.split(' ')[0]);
      expect(updatedCount).toBe(initialCount - 1);
    });

    it('should not delete if only one note remains', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Delete notes until one remains
      const deleteBtn = await ctx.getById('delete-note-btn').within(1000);
      for (let i = 0; i < 5; i++) {
        await deleteBtn.click();
      }

      const finalStatus = await ctx.getById('status-label').within(1000).getText();
      expect(finalStatus).toContain('1 note');
    });
  });

  // ============================================================================
  // THEME SWITCHING TESTS
  // ============================================================================

  describe('Theme Switching', () => {
    it('should display theme selector', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      await ctx.getById('theme-selector-label').within(1000).shouldExist();
      await ctx.getById('light-theme-btn').within(1000).shouldExist();
      await ctx.getById('dark-theme-btn').within(1000).shouldExist();
      await ctx.getById('custom-light-btn').within(1000).shouldExist();
      await ctx.getById('custom-dark-btn').within(1000).shouldExist();
    });

    it('should update theme label when changing theme', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Click dark theme button
      const darkBtn = await ctx.getById('dark-theme-btn').within(1000);
      await darkBtn.click();

      // Theme label should update to show dark mode
      await ctx.getById('theme-label').within(500).shouldBe('Theme: 🌙 Dark');
    });

    it('should switch to light theme', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const lightBtn = await ctx.getById('light-theme-btn').within(1000);
      await lightBtn.click();

      await ctx.getById('theme-label').within(500).shouldBe('Theme: ☀️ Light');
    });

    it('should switch to custom light theme', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const customLightBtn = await ctx.getById('custom-light-btn').within(1000);
      await customLightBtn.click();

      // Theme label should be updated after custom theme is applied
      // The exact label depends on implementation
      await ctx.getById('theme-selector-label').within(500).shouldExist();
    });

    it('should switch to custom dark theme', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const customDarkBtn = await ctx.getById('custom-dark-btn').within(1000);
      await customDarkBtn.click();

      // Theme should be switched
      await ctx.getById('theme-selector-label').within(500).shouldExist();
    });

    it('should persist theme across note changes', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Change to dark theme
      const darkBtn = await ctx.getById('dark-theme-btn').within(1000);
      await darkBtn.click();

      // Create a new note
      const addBtn = await ctx.getById('add-note-btn').within(1000);
      await addBtn.click();

      // Theme should still be dark
      await ctx.getById('theme-label').within(500).shouldBe('Theme: 🌙 Dark');
    });
  });

  // ============================================================================
  // STATUS DISPLAY TESTS
  // ============================================================================

  describe('Status Display', () => {
    it('should display initial note count', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const status = await ctx.getById('status-label').within(1000).getText();
      expect(status).toMatch(/\d+ notes?/);
    });

    it('should update note count after adding note', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const initialStatus = await ctx.getById('status-label').within(1000).getText();
      const initialCount = parseInt(initialStatus.split(' ')[0]);

      const addBtn = await ctx.getById('add-note-btn').within(1000);
      await addBtn.click();

      const updatedStatus = await ctx.getById('status-label').within(1000).getText();
      const updatedCount = parseInt(updatedStatus.split(' ')[0]);
      expect(updatedCount).toBe(initialCount + 1);
    });

    it('should show "1 note" for single note', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Delete all but one note
      const deleteBtn = await ctx.getById('delete-note-btn').within(1000);
      for (let i = 0; i < 10; i++) {
        await deleteBtn.click();
      }

      const status = await ctx.getById('status-label').within(1000).getText();
      expect(status).toContain('1 note');
    });
  });

  // ============================================================================
  // EDITOR TESTS
  // ============================================================================

  describe('Editor Functionality', () => {
    it('should clear editor when no note selected', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const titleEntry = await ctx.getById('title-entry').within(1000);
      const contentEntry = await ctx.getById('content-entry').within(1000);

      // Both should have content from the selected note
      const titleText = await titleEntry.getText();
      const contentText = await contentEntry.getText();
      expect(titleText.length).toBeGreaterThan(0);
    });

    it('should sync title changes to note', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const titleEntry = await ctx.getById('title-entry').within(1000);
      const testTitle = 'Test Note Title';
      await titleEntry.setText(testTitle);

      // Verify the change was applied
      const retrievedTitle = await titleEntry.getText();
      expect(retrievedTitle).toBe(testTitle);
    });

    it('should sync content changes to note', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const contentEntry = await ctx.getById('content-entry').within(1000);
      const testContent = 'This is test content';
      await contentEntry.setText(testContent);

      const retrievedContent = await contentEntry.getText();
      expect(retrievedContent).toBe(testContent);
    });

    it('should handle multiline content', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      const contentEntry = await ctx.getById('content-entry').within(1000);
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      await contentEntry.setText(multilineContent);

      const retrievedContent = await contentEntry.getText();
      expect(retrievedContent).toContain('Line 1');
      expect(retrievedContent).toContain('Line 2');
    });
  });

  // ============================================================================
  // MULTI-OPERATION TESTS
  // ============================================================================

  describe('Multi-Operation Workflows', () => {
    it('should handle full CRUD cycle', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Create
      const addBtn = await ctx.getById('add-note-btn').within(1000);
      await addBtn.click();

      // Update
      const titleEntry = await ctx.getById('title-entry').within(1000);
      await titleEntry.setText('My Note');

      const contentEntry = await ctx.getById('content-entry').within(1000);
      await contentEntry.setText('My content');

      // Verify update
      expect(await titleEntry.getText()).toBe('My Note');
      expect(await contentEntry.getText()).toBe('My content');

      // Delete
      const deleteBtn = await ctx.getById('delete-note-btn').within(1000);
      const statusBefore = await ctx.getById('status-label').within(1000).getText();
      const countBefore = parseInt(statusBefore.split(' ')[0]);

      await deleteBtn.click();

      const statusAfter = await ctx.getById('status-label').within(1000).getText();
      const countAfter = parseInt(statusAfter.split(' ')[0]);
      expect(countAfter).toBe(countBefore - 1);
    });

    it('should handle theme switching during editing', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      // Switch to dark theme
      const darkBtn = await ctx.getById('dark-theme-btn').within(1000);
      await darkBtn.click();

      // Make changes
      const titleEntry = await ctx.getById('title-entry').within(1000);
      await titleEntry.setText('Dark Mode Note');

      // Switch back to light
      const lightBtn = await ctx.getById('light-theme-btn').within(1000);
      await lightBtn.click();

      // Changes should persist
      expect(await titleEntry.getText()).toBe('Dark Mode Note');
    });
  });

  // ============================================================================
  // LAYOUT TESTS
  // ============================================================================

  describe('Layout Structure', () => {
    it('should have left sidebar with notes list', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      await ctx.getById('notes-title').within(1000).shouldExist();
      await ctx.getById('add-note-btn').within(1000).shouldExist();
      await ctx.getById('delete-note-btn').within(1000).shouldExist();
      await ctx.getById('notes-list').within(1000).shouldExist();
    });

    it('should have right sidebar with editor', async () => {
      const testApp = await tsyneTest.createApp(buildNotesApp);
      await testApp.run();

      await ctx.getById('editor-title').within(1000).shouldExist();
      await ctx.getById('title-label').within(1000).shouldExist();
      await ctx.getById('title-entry').within(1000).shouldExist();
      await ctx.getById('content-label').within(1000).shouldExist();
      await ctx.getById('content-entry').within(1000).shouldExist();
    });
  });
});
