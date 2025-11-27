# Fyles TODO

## README Update Needed

The Fyles README currently lists several features as "Simplified/Omitted":

```markdown
### Simplified/Omitted Features
❌ Multi-panel view (original supports multiple side-by-side panels)
❌ Custom URI schemes for favorites (tree:///)
❌ Fancy folder backgrounds (fancyfs metadata)
❌ "Open With" application picker (uses simple xdg-open)
❌ Drag-and-drop file operations
❌ Right-click context menus
❌ Tree expansion state persistence
```

**Action Required**: Review which of these features are now possible with Tsyne's expanded Fyne widget support and update the README accordingly.

Tsyne now supports many more Fyne widgets and features than when Fyles was first ported. The README should be updated to:
1. Move implemented features from "Omitted" to "Implemented" section
2. Add any new features that are now possible
3. Update the feature comparison to reflect current capabilities

## Missing Screenshot

The README references `../screenshots/fyles.png` which doesn't exist yet.

**Action Required**: Create a screenshot showing the Fyles file browser in action.

## Potential Enhancements

Now that withId() is available for all widgets:
- Could add IDs to more UI elements for better testability
- Could expose more of the FylesUI class for programmatic control in tests
- Could add smart query methods (similar to chess example) for getting current directory state
