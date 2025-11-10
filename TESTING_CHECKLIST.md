# Tsyne Browser Testing Checklist

Comprehensive testing checklist for Tsyne Browser features.

## 🧪 Automated Tests

### TsyneBrowserTest Framework
- [x] TsyneBrowserTest class implemented
- [x] Test server with page routing
- [x] Browser test helpers (navigate, back, forward, reload)
- [x] TestContext integration
- [x] Example tests created (examples/browser.test.ts)
- [ ] Run tests: `npm run build && node examples/browser.test.js`

### Test Coverage

**Navigation Tests:**
- [x] Load initial page
- [x] Navigate between pages
- [x] Back navigation
- [x] Forward navigation
- [x] Reload page
- [x] Form submission and navigation
- [ ] External URL navigation
- [ ] URL validation
- [ ] Redirect handling (301, 302)
- [ ] 404 error page

**Browser Chrome Tests:**
- [ ] Address bar displays current URL
- [ ] Address bar accepts manual URL entry
- [ ] Go button navigates to entered URL
- [ ] Back button navigation
- [ ] Forward button navigation
- [ ] Reload button
- [ ] Stop button (while loading)
- [ ] Loading indicator appears/disappears

**Menu Tests:**
- [ ] File menu → Close Window
- [ ] View menu → Reload
- [ ] View menu → Stop
- [ ] View menu → View Page Source
- [ ] History menu → Back (disabled when appropriate)
- [ ] History menu → Forward (disabled when appropriate)
- [ ] Help menu → About
- [ ] Page custom menus appear
- [ ] Page custom menus removed on navigation

**Context Menu Tests:**
- [ ] Right-click shows context menu
- [ ] Menu items execute callbacks
- [ ] Disabled items are grayed out
- [ ] Checked items show checkmark
- [ ] Separators appear correctly
- [ ] Context menu on different widget types

**Widget Tests:**
- [ ] Labels render correctly
- [ ] Buttons execute callbacks
- [ ] Entry widgets accept input
- [ ] Forms submit data
- [ ] All widget types work in pages

**Page Loading Tests:**
- [ ] HTTP GET requests
- [ ] Page code execution
- [ ] BrowserContext passed to pages
- [ ] Tsyne API available in pages
- [ ] Error handling for failed requests
- [ ] Timeout handling

---

## 🖱️ Manual Testing

### Basic Browser Functionality

**Window Management:**
- [ ] Browser creates ONE window
- [ ] Window persists across page navigations
- [ ] Window size stays constant (900x700)
- [ ] Content area updates on navigation
- [ ] No new windows created by pages

**Address Bar:**
- [ ] Shows current URL
- [ ] Can type new URL
- [ ] Go button navigates to typed URL
- [ ] Address updates when navigating via buttons
- [ ] Address updates on back/forward

**Navigation Buttons:**
- [ ] ← Back button works
- [ ] → Forward button works
- [ ] ⟳ Reload button works
- [ ] Back disabled on first page
- [ ] Forward disabled at end of history

**Stop & Loading:**
- [ ] ✕ Stop button appears when loading
- [ ] Stop button cancels page load
- [ ] "Loading..." text appears when loading
- [ ] Loading indicator disappears when done
- [ ] Stop button disappears when done

### Menu Bar

**File Menu:**
- [ ] File → Close Window quits browser
- [ ] Menu accessible via click
- [ ] Menu keyboard shortcuts (if implemented)

**View Menu:**
- [ ] View → Reload reloads current page
- [ ] View → Stop cancels loading
- [ ] View → View Page Source prints to console
- [ ] Source shows correct TypeScript code

**History Menu:**
- [ ] History → Back works
- [ ] History → Forward works
- [ ] Back disabled when no history
- [ ] Forward disabled when no forward history

**Help Menu:**
- [ ] Help → About shows dialog
- [ ] Dialog displays version info

**Page Menus:**
- [ ] Navigate to Menu Demo page
- [ ] Custom "Tools" menu appears
- [ ] Custom "Settings" menu appears
- [ ] Menu items execute when clicked
- [ ] Navigate away - custom menus disappear

### Context Menus

**Todo List Context Menu (context-menu-demo page):**
- [ ] Right-click on todo item shows menu
- [ ] Mark Complete/Incomplete toggles state
- [ ] Edit logs to console
- [ ] Delete removes item and reloads
- [ ] Move Up reorders items
- [ ] Move Down reorders items
- [ ] First item "Move Up" is disabled
- [ ] Last item "Move Down" is disabled
- [ ] Menu appears at mouse position

**General Context Menu:**
- [ ] Right-click on any widget with setContextMenu()
- [ ] Menu shows correct items
- [ ] Separators appear as lines
- [ ] Disabled items are grayed out
- [ ] Checked items show checkmark
- [ ] Selecting item executes callback

### Page Navigation

**Home Page (/):**
- [ ] Loads successfully
- [ ] Shows welcome message
- [ ] Shows current URL
- [ ] All navigation buttons present
- [ ] Click "Go to About" navigates
- [ ] Click "Go to Contact" navigates
- [ ] Click "Go to Form Demo" navigates
- [ ] Click "Go to Menu Demo" navigates
- [ ] Click "Go to Context Menu Demo" navigates

**About Page (/about):**
- [ ] Loads successfully
- [ ] Shows about text
- [ ] Features list displays
- [ ] Back button works
- [ ] Home button works

**Contact Page (/contact):**
- [ ] Loads successfully
- [ ] Form inputs appear
- [ ] Can type in name field
- [ ] Can type in email field
- [ ] Can type in message field
- [ ] Submit button navigates to /thanks
- [ ] Cancel button goes back

**Form Demo Page (/form):**
- [ ] All form widgets render
- [ ] Name entry accepts input
- [ ] Age entry accepts input
- [ ] Subscribe checkbox toggles
- [ ] Country select shows options
- [ ] Rating slider adjusts value
- [ ] Submit logs to console and navigates
- [ ] Home button works

**Menu Demo Page (/menu-demo):**
- [ ] Loads successfully
- [ ] Tools menu appears in menu bar
- [ ] Settings menu appears in menu bar
- [ ] Clicking menu items logs to console
- [ ] Disabled item is grayed out
- [ ] Navigate away - menus disappear

**Context Menu Demo Page (/context-menu-demo):**
- [ ] Loads successfully
- [ ] Todo items display with checkboxes
- [ ] Right-click shows context menu
- [ ] All menu actions work as expected
- [ ] Dynamic disabled states work
- [ ] Back to Home button works

**Thanks Page (/thanks):**
- [ ] Loads successfully
- [ ] Thank you message displays
- [ ] Back to Home button works
- [ ] Go Back button works

**404 Page (unknown URL):**
- [ ] Loads for unknown URLs
- [ ] Shows 404 message
- [ ] Shows attempted URL
- [ ] Home button navigates to /
- [ ] Go Back button works

### Server Integration

**Test Server (examples/server.js):**
- [ ] Starts on port 3000
- [ ] Serves all test pages
- [ ] Logs requests to console
- [ ] Returns 200 for valid pages
- [ ] Returns 404 for invalid pages
- [ ] Serves correct Content-Type
- [ ] Pages are actual .ts files from pages/ directory

**URL Mapping:**
- [ ] / → pages/index.ts
- [ ] /about → pages/about.ts
- [ ] /contact → pages/contact.ts
- [ ] /form → pages/form.ts
- [ ] /menu-demo → pages/menu-demo.ts
- [ ] /context-menu-demo → pages/context-menu-demo.ts
- [ ] /thanks → pages/thanks.ts
- [ ] /invalid → pages/404.ts

### History Management

**History Stack:**
- [ ] History grows on navigation
- [ ] Back decrements history index
- [ ] Forward increments history index
- [ ] Navigating from middle clears forward history
- [ ] Reload doesn't affect history position

### BrowserContext API

**Pages receive browserContext with:**
- [ ] back() function works
- [ ] forward() function works
- [ ] changePage(url) function works
- [ ] reload() function works
- [ ] stop() function works
- [ ] addPageMenu(label, items) works
- [ ] currentUrl is correct
- [ ] isLoading reflects state
- [ ] browser reference available

### Pages receive tsyne with all API:
- [ ] vbox() creates vertical box
- [ ] hbox() creates horizontal box
- [ ] label() creates labels
- [ ] button() creates buttons
- [ ] entry() creates text inputs
- [ ] All other widgets available

### Error Handling

**Network Errors:**
- [ ] Timeout after 10 seconds
- [ ] Connection refused shows error
- [ ] Invalid URL shows error
- [ ] Error page displays error message
- [ ] Go Back button available on error

**Page Errors:**
- [ ] JavaScript errors in page code caught
- [ ] Error page shown on page crash
- [ ] Browser remains functional after error

### Performance

**Page Load Times:**
- [ ] Small pages load < 100ms
- [ ] Large pages load < 500ms
- [ ] No memory leaks on navigation
- [ ] Browser stays responsive during load

**Memory Usage:**
- [ ] Reasonable memory usage (< 100MB for simple pages)
- [ ] Memory released on page navigation
- [ ] No significant leaks over time

---

## 🔧 Integration Tests

### Full User Flows

**Flow 1: Browse Multiple Pages**
1. [ ] Start browser
2. [ ] Navigate to home
3. [ ] Click through all navigation links
4. [ ] Use back button to return
5. [ ] Use forward button to go forward
6. [ ] Reload a page
7. [ ] Manually type URL in address bar
8. [ ] Close browser

**Flow 2: Form Submission**
1. [ ] Navigate to contact page
2. [ ] Fill in all form fields
3. [ ] Submit form
4. [ ] Verify navigation to thanks page
5. [ ] Use back button
6. [ ] Cancel form

**Flow 3: Context Menu Actions**
1. [ ] Navigate to context menu demo
2. [ ] Right-click on first todo
3. [ ] Mark complete
4. [ ] Right-click on second todo
5. [ ] Delete item
6. [ ] Verify page reloaded
7. [ ] Right-click on remaining todo
8. [ ] Move down
9. [ ] Verify reordering

**Flow 4: Menu System**
1. [ ] Navigate to menu demo
2. [ ] Verify custom menus appear
3. [ ] Click multiple menu items
4. [ ] Verify console logs
5. [ ] Navigate away
6. [ ] Verify custom menus removed
7. [ ] Use View menu to view source
8. [ ] Use History menu to navigate

**Flow 5: Stop Loading**
1. [ ] Type slow URL
2. [ ] Click Go
3. [ ] Immediately click Stop
4. [ ] Verify loading cancelled
5. [ ] Verify stop button disappears
6. [ ] Verify browser remains functional

---

## 📊 Test Results Tracking

### Test Run: [Date]

**Automated Tests:**
- Tests Run: ___ / ___
- Tests Passed: ___ / ___
- Tests Failed: ___ / ___
- Coverage: ___%

**Manual Tests:**
- Tests Run: ___ / ___
- Tests Passed: ___ / ___
- Issues Found: ___

**Known Issues:**
1.
2.
3.

**Notes:**

---

## 🚀 Pre-Release Checklist

Before releasing Tsyne Browser:
- [ ] All P0 automated tests passing
- [ ] All P0 manual tests passing
- [ ] All P1 automated tests passing
- [ ] All P1 manual tests passing
- [ ] Documentation complete
- [ ] Examples working
- [ ] README updated
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Memory usage reasonable
