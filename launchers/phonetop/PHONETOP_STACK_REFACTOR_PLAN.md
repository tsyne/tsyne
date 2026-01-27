# PhoneTop Navigation Stack Refactor

Remember at all times we like @docs/pseudo-declarative-ui-composition.md and Inversion of Control

## Overview
Refactor PhoneTop from imperative show/hide navigation to proper stack-based push/pop semantics. Also switch from swipe left/right pagination to Android-style long-page scrolling.

## Goals
1. Replace 3 Max containers with a single PhoneTopStack
2. Views pushed/popped with proper GC on pop
3. Breadcrumbs reflect stack depth, clicking pops to that level
4. Long-scroll for app grids (Android-style) instead of pagination
5. Each view encapsulates its own state
6. Border layout preserved for proper X/Y expansion

## Current Problems
- Imperative show/hide with `homeMaxContainer`, `folderMaxContainer`, `appMaxContainer`
- Manual state tracking: `frontAppId`, `openFolder`, `currentPage`, `folderCurrentPage`
- Race conditions causing intermittent launch failures
- Pagination via swipe buttons (iPhone-like, not Android-like)

## Architecture

### PhoneTopStack
```typescript
class PhoneTopStack {
  private views: StackView[] = [];
  private contentContainer: VBox | null = null;

  push(view: StackView): void    // Add view, render it
  pop(): void                    // Remove top, cleanup, render previous
  popTo(index: number): void     // Pop multiple levels
  getBreadcrumbs(): Breadcrumb[] // For header rendering
}
```

### StackView Interface
```typescript
interface StackView {
  readonly id: string;
  readonly title: string;
  readonly type: 'home' | 'folder' | 'app';

  render(container: VBox): void;  // Build UI
  cleanup(): void;                // Release for GC
  willHide?(): void;              // Optional state preservation
  willShow?(): void;              // Optional state restoration
}
```

### View Classes
- **HomeView**: Grid of folders + uncategorized apps, long-scroll
- **FolderView**: Grid of apps in folder, long-scroll, search
- **AppView**: Header + app content from StackPaneAdapter

## Key Changes

### 1. Remove Pagination, Add Scroll
**Before:** `currentPage`, `totalPages`, swipe buttons, page dots
**After:** Single scrollable container with all items

```typescript
// HomeView render
this.a.scroll(() => {
  this.a.grid(this.cols, () => {
    // ALL grid items rendered, not just current page
    for (const item of this.gridItems) {
      if (item.type === 'folder') {
        this.createFolderIcon(item.folder);
      } else {
        this.createAppIcon(item.icon);
      }
    }
  });
});
```

### 2. State Variables to Eliminate
| Remove | Replaced By |
|--------|-------------|
| `frontAppId` | Stack top is current view |
| `openFolder` | FolderView on stack |
| `currentPage`, `folderCurrentPage` | Scroll position (automatic) |
| `totalPages`, `folderTotalPages` | N/A (no pagination) |
| `homeMaxContainer` | Single contentContainer |
| `folderMaxContainer` | Single contentContainer |
| `appMaxContainer` | Single contentContainer |

### 3. Methods to Replace
| Old Method | New Approach |
|------------|--------------|
| `switchToApp(appId)` | `stack.push(new AppView(...))` |
| `goHome()` | `stack.popTo(0)` |
| `openFolderView(folder)` | `stack.push(new FolderView(...))` |
| `closeFolder()` | `stack.pop()` |
| `quitApp(appId)` | `runningApps.delete(appId); stack.pop()` |
| `previousPage()`, `nextPage()` | Remove (scroll handles this) |

### 4. Navigation Scenarios

**Home -> Folder -> App -> Quit:**
```
[HomeView] -> push(FolderView) -> push(AppView) -> pop() -> [HomeView, FolderView]
```

**Home -> App -> Home button:**
```
[HomeView] -> push(AppView) -> popTo(0) -> [HomeView]
```

**Breadcrumb click:**
```
[HomeView, FolderView, AppView] -> click "Games" -> popTo(1) -> [HomeView, FolderView]
```

## File Structure

```
launchers/phonetop/
├── index.ts              # PhoneTop kernel (simplified)
├── phonetop-stack.ts     # NEW: Stack navigation manager
├── views/
│   ├── stack-view.ts     # NEW: StackView interface
│   ├── home-view.ts      # NEW: HomeView class
│   ├── folder-view.ts    # NEW: FolderView class
│   └── app-view.ts       # NEW: AppView class
├── phonetop-groups.ts    # Unchanged
```

## Implementation Order

### Phase 1: Create Stack Infrastructure
1. Create `views/stack-view.ts` with StackView interface
2. Create `phonetop-stack.ts` with PhoneTopStack class
3. Implement push/pop/popTo with cleanup callbacks

### Phase 2: Extract Views
1. Create `views/home-view.ts` - extract from `buildHomeScreen()`
   - Remove pagination (currentPage, swipe buttons, page dots)
   - Wrap grid in scroll container
   - Keep search functionality
2. Create `views/folder-view.ts` - extract from `buildFolderLayout()`
   - Remove pagination
   - Wrap grid in scroll
   - Keep search
3. Create `views/app-view.ts` - extract from `showAppContent()`
   - Header with breadcrumbs (not separate Home/Quit)
   - App content rendering

### Phase 3: Integrate Stack into PhoneTop
1. Replace 3 Max containers with single border layout + stack
2. Initialize stack with HomeView
3. Update folder tap -> `stack.push(FolderView)`
4. Update app tap -> `stack.push(AppView)`
5. Update quit -> cleanup + `stack.pop()`
6. Breadcrumbs in header, clicking pops to level

### Phase 4: Cleanup
1. Remove obsolete state variables
2. Remove obsolete methods
3. Update tests
4. Test all navigation scenarios

## Files to Modify
- `launchers/phonetop/index.ts` - Major refactor, ~50% code moves to view classes

## New Files
- `launchers/phonetop/phonetop-stack.ts`
- `launchers/phonetop/views/stack-view.ts`
- `launchers/phonetop/views/home-view.ts`
- `launchers/phonetop/views/folder-view.ts`
- `launchers/phonetop/views/app-view.ts`

## Verification

Recall YOU can use TsyneTest to verify: ./docs/SCREENSHOTS.md

Recall also that YOU can also use ./docs/remote_control.md to remote control PhoneTop and should consider 
at all times that more/better control functions is good work.

1. Run PhoneTop: `./scripts/tsyne launchers/phonetop/index.ts`
2. Scroll through home screen (should scroll, not paginate)
3. Tap folder -> folder view pushed, breadcrumb shows "Home > Games"
4. Scroll through folder apps
5. Tap app -> app launches, breadcrumb shows "Home > Games > Chess"
6. Tap "Home" in breadcrumb -> pops to home
7. Tap "Games" in breadcrumb -> pops to folder
8. Quit app -> pops to previous view (folder or home)
9. Search still works in home and folder views
10. No intermittent launch failures (the original bug)

## Notes
- Search feature already implemented, preserved in views
- Border layout (`a.border()`) still used within each view for proper expansion
- `runningApps` map remains separate from stack (tracks app instances)
- StackPaneAdapter IoC pattern unchanged (apps receive ITsyneWindow). 
- We like N implementations of an abstraction much more than if/esle logic
- We like jests tests and TsyneTest tests - always co-located with prod code.
