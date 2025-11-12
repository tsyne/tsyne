# Test Remediation Plan - Web Features Tests

## Overview

Analysis of `examples/web-features.test.js` revealed several tests that only verify documentation text exists rather than testing actual widget functionality. This document catalogs the issues and remediation plan.

## Test Quality Categories

### ✅ GOOD - Tests actual functionality
- **Test /scrolling** - Verifies 100 lines actually rendered
- **Test /hyperlinks** - Clicks buttons, tests navigation, uses back()
- **Test /fyne-widgets** - Clicks Start/Reset buttons
- **Test /** - Verifies navigation buttons exist

### ❌ CRITICAL - No functionality tested at all
- **Test /images** - Only checks for documentation labels, NO actual images displayed

### ⚠️ INCOMPLETE - Widgets exist but not tested
- **Test /table-demo** - Page creates 2 tables but test only checks description label
- **Test /list-demo** - Page creates 2 lists but test only checks description label
- **Test /dynamic-demo** - Page has counter with +/-/Reset but test doesn't click buttons
- **Test /post-demo** - Page has form with entry/checkbox but test doesn't fill/submit
- **Test /text-features** - Only checks for comparison text, doesn't verify styling works

---

## Detailed Issues

### 1. Test /images (Priority 1 - CRITICAL)

**Current State**:
```javascript
// Only checks for label text like:
const containMode = await ctx.findWidget({ text: '1. Contain mode (default) - fits image inside bounds:' });
```

**Problem**:
- Page has NO `image()` calls - only labels describing the API
- Comment admits: `// Note: These images would need to exist in the filesystem`
- Test verifies documentation exists, not that images display

**Required Fix**:
1. Create test image file (PNG or JPEG)
2. Update `images.ts` page to actually call `image('/path/to/test.png', 'contain')`
3. Update test to verify image widget exists (not just labels)
4. Test all 3 modes: contain, stretch, original

**Acceptance Criteria**:
- [ ] Test image created in examples/assets/ or similar
- [ ] images.ts displays 3 actual images (one per mode)
- [ ] Test verifies image widgets exist using appropriate selector
- [ ] Test validates all 3 image modes render

---

### 2. Test /table-demo (Priority 2)

**Current State**:
```javascript
// Only checks description exists:
const description = await ctx.findWidget({ text: 'This page demonstrates tables, similar to HTML <table> elements' });
```

**Problem**:
- Page creates 2 real tables with data (lines 19-46 of table-demo.ts)
- Test ignores them completely

**Required Fix**:
1. Verify table widget exists (check by type or find specific data)
2. Verify specific table data: 'Alice', 'Bob', 'Charlie' from first table
3. Verify product table data: 'Laptop', 'Mouse', etc.

**Acceptance Criteria**:
- [ ] Test finds table widgets (not just labels)
- [ ] Test verifies at least 3 data values from each table
- [ ] Test validates headers: 'Name', 'Age', 'City' and 'Product', 'Price', 'Stock', 'Category'

---

### 3. Test /list-demo (Priority 2)

**Current State**:
```javascript
// Only checks description:
const description = await ctx.findWidget({ text: 'This page demonstrates lists, similar to HTML <ul> and <ol> elements' });
```

**Problem**:
- Page creates 2 real lists with items (lines 21-54 of list-demo.ts)
- First list has selection callback that updates label
- Test doesn't verify list items exist or test selection

**Required Fix**:
1. Verify list widgets exist
2. Verify specific items: 'Apple', 'Banana', 'Cherry' from first list
3. Test selection callback by clicking an item
4. Verify selection label updates correctly

**Acceptance Criteria**:
- [ ] Test finds list widgets
- [ ] Test verifies at least 3 items from each list
- [ ] Test clicks a list item
- [ ] Test verifies selection label updates: "Selected: Apple (index 0)"

---

### 4. Test /dynamic-demo (Priority 2)

**Current State**:
```javascript
// Only verifies initial state:
const counterLabel = await ctx.findWidget({ text: 'Count: 0' });
const incrementButton = await ctx.findWidget({ text: '+' });
// Doesn't click anything!
```

**Problem**:
- Page has fully functional counter with +/-/Reset buttons (lines 26-43 of dynamic-demo.ts)
- Test finds buttons but never clicks them
- Doesn't verify dynamic updates work

**Required Fix**:
1. Click '+' button multiple times
2. Verify counter label updates: 'Count: 1', 'Count: 2', etc.
3. Click '-' button
4. Verify counter decrements
5. Click 'Reset' button
6. Verify counter returns to 'Count: 0'

**Acceptance Criteria**:
- [ ] Test clicks '+' button 3 times
- [ ] Test verifies label shows 'Count: 3'
- [ ] Test clicks '-' button once
- [ ] Test verifies label shows 'Count: 2'
- [ ] Test clicks 'Reset'
- [ ] Test verifies label shows 'Count: 0'

---

### 5. Test /post-demo (Priority 2)

**Current State**:
```javascript
// Only verifies pattern explanation exists:
const patternSection = await ctx.findWidget({ text: '=== POST-Redirect-GET Pattern ===' });
const submitButton = await ctx.findWidget({ text: 'Submit Registration' });
// Doesn't interact with form!
```

**Problem**:
- Page has real form with name/email entries and checkbox (lines 24-67 of post-demo.ts)
- Form has validation and navigation to /post-success
- Test doesn't fill form, doesn't test validation, doesn't submit

**Required Fix**:
1. Fill name entry field
2. Fill email entry field
3. Check the agreement checkbox
4. Click 'Submit Registration' button
5. Verify navigation to /post-success with query params
6. Test validation: submit with empty fields should not navigate

**Acceptance Criteria**:
- [ ] Test fills name field with test data
- [ ] Test fills email field with test data
- [ ] Test checks agreement checkbox
- [ ] Test clicks submit button
- [ ] Test verifies navigation to /post-success?name=...
- [ ] Test validates that empty submission doesn't navigate

---

### 6. Test /text-features (Priority 3)

**Current State**:
```javascript
// Only verifies comparison labels exist:
const htmlLabel = await ctx.findWidget({ text: 'HTML: <strong>Bold</strong>' });
```

**Problem**:
- Only tests that documentation text exists
- Doesn't verify any actual text styling (bold, italic, etc.) works
- Text features page is mostly documentation, minimal actual functionality

**Required Fix**:
1. Update text-features.ts page to include actual styled labels
2. Test could verify styled text exists
3. May need to test text properties if API supports it

**Acceptance Criteria**:
- [ ] Review what text styling is actually possible in Tsyne
- [ ] Update page to demonstrate actual styling if available
- [ ] Test verifies styled widgets exist (if API permits inspection)

**Note**: This is lowest priority as Tsyne may not expose enough text styling to test meaningfully beyond what labels display.

---

## Implementation Order

1. **Phase 1 - Critical (P1)**:
   - Fix Test /images (create image file, update page, test actual images)

2. **Phase 2 - High Value (P2)**:
   - Fix Test /dynamic-demo (easy win - just click buttons and verify)
   - Fix Test /list-demo (test selection callback)
   - Fix Test /table-demo (verify table data)

3. **Phase 3 - Forms (P2)**:
   - Fix Test /post-demo (fill form, test validation, test submission)

4. **Phase 4 - Polish (P3)**:
   - Fix Test /text-features (if text styling API permits)

---

## Testing Principles

### Good Tests Should:
- ✅ Exercise actual widget functionality (click buttons, fill forms, select items)
- ✅ Verify state changes (counter increments, labels update)
- ✅ Test user workflows (fill form → submit → verify navigation)
- ✅ Validate data (check specific table cells, list items)

### Bad Tests Should Avoid:
- ❌ Only checking documentation text exists
- ❌ Finding widgets but not interacting with them
- ❌ Ignoring the actual functionality the page demonstrates
- ❌ Testing comments instead of code

---

## Success Metrics

- **Before**: 4/10 tests actually test functionality (40%)
- **After**: 10/10 tests exercise actual widgets and verify behavior (100%)

---

*This remediation plan ensures the web-features test suite actually validates that Tsyne widgets work, not just that we documented them.*
