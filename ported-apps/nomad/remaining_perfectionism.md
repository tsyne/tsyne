# Nomad Port - Remaining Work Plan

## Current State (via TsyneTest screenshots)

Working:
- Edinburgh card displays with city name, country, timezone
- Time display shows current time (e.g., "22:08")
- Date picker button shows date
- Time dropdown opens and shows time options (Now, 00:00, 00:15, etc.)
- Remove button (…) works - clicking removes the city
- "ADD A PLACE" dropdown visible
- Dark purple theme (#180C27) applied

## Gaps vs Original (from nomad_OG/screenshot.png)

| Feature | Original | Current Port | Priority |
|---------|----------|--------------|----------|
| City background images | Beautiful photos (Edinburgh skyline, Paris Eiffel tower) | No images, solid card | P2 |
| Bold city name typography | Large, bold Work Sans font | Standard label | P3 |
| Time display size | Large prominent time "00:12" | Small time display | P1 |
| Card height | Tall cards with image area | Compact cards | P2 |
| Multiple cities visible | Shows Edinburgh, Paris, partial 3rd | Only Edinburgh by default | P1 |
| Calendar popup | Full calendar grid overlay | No calendar (button does nothing) | P1 |

## Test Plan Using TsyneTest

### Test 1: Verify Initial State
```typescript
// Take screenshot, verify Edinburgh card elements exist
await t.screenshot('./screenshots/test-01-initial.png');
await ctx.getById('nomad-city-edinburgh').shouldExist();
await ctx.getById('nomad-time-display-edinburgh').shouldExist();
```

### Test 2: Time Dropdown Interaction
```typescript
// Click time dropdown, verify it opens with options
await ctx.getById('nomad-time-edinburgh').click();
await t.screenshot('./screenshots/test-02-time-dropdown.png');
// Select a specific time like "14:00"
// Verify time display updates
```

### Test 3: Add City Flow
```typescript
// Click ADD A PLACE dropdown
// Select "Paris, France"
await t.screenshot('./screenshots/test-03-paris-added.png');
// Verify Paris card appears with correct timezone (CET/CEST)
await ctx.getById('nomad-city-paris').shouldExist();
```

### Test 4: Remove City Flow
```typescript
// Click remove button on Edinburgh
await ctx.getById('nomad-menu-edinburgh').click();
await t.screenshot('./screenshots/test-04-edinburgh-removed.png');
// Verify Edinburgh is gone, Paris remains
```

### Test 5: Multiple Cities Display
```typescript
// Add 3 cities: Edinburgh, Paris, New York
// Verify all three cards visible
// Verify times are correctly offset
await t.screenshot('./screenshots/test-05-multi-city.png');
```

### Test 6: Date Picker (TODO - needs calendar implementation)
```typescript
// Click date button
// Verify calendar popup appears
// Select a different date
// Verify all city times update to that date
```

## Implementation Tasks

### P1 - Critical Functionality

1. **Make time display larger/more prominent**
   - File: `nomad.ts` line ~410
   - Change time label to use larger text style
   - Test: Screenshot should show time prominently

2. **Implement calendar popup for date picker**
   - When date button clicked, show calendar widget
   - On date selection, update `state.selectedDate`
   - Refresh all city cards with new date
   - Test: Click date button, verify calendar appears

3. **Add more default cities or improve add flow**
   - Currently only Edinburgh shown
   - Consider showing 2-3 cities by default
   - Test: Initial screenshot shows multiple cities

### P2 - Visual Improvements

4. **Add city background images**
   - Requires: Image widget support or canvas background
   - Could use solid color gradients as fallback
   - Each city could have a themed color

5. **Increase card height**
   - Add more vertical space in card layout
   - Match original's taller card proportions

### P3 - Polish

6. **Typography improvements**
   - Bold/larger city names
   - Proper font weights if available

7. **Card styling**
   - Rounded corners
   - Subtle shadows/elevation

## Test Execution Script

```typescript
// File: nomad-perfectionism.test.ts
import { TsyneTest } from 'tsyne';
import { buildNomadApp, NomadUI, WORLD_CITIES } from './nomad';

describe('Nomad Perfectionism Tests', () => {
  let t: TsyneTest;
  let ctx: TestContext;
  let ui: NomadUI;

  beforeAll(async () => {
    t = new TsyneTest({ headed: false });
    await t.createApp((app) => {
      app.window({ title: 'Nomad', width: 340, height: 600 }, (win) => {
        ui = buildNomadApp(app, win);
      });
    });
    ctx = t.getContext();
  });

  afterAll(async () => {
    await t.cleanup();
  });

  test('initial state shows Edinburgh with time', async () => {
    await t.screenshot('./screenshots/perfectionism/01-initial.png');
    await ctx.getById('nomad-city-edinburgh').shouldExist();
    const time = await ctx.getById('nomad-time-display-edinburgh').getText();
    expect(time).toMatch(/\d{2}:\d{2}/);
  });

  test('can add Paris via dropdown', async () => {
    // Implementation depends on select widget interaction
  });

  test('can remove Edinburgh', async () => {
    await ctx.getById('nomad-menu-edinburgh').click();
    await t.screenshot('./screenshots/perfectionism/02-removed.png');
    expect(ui.getCities().find(c => c.id === 'edinburgh')).toBeUndefined();
  });

  test('time dropdown shows options', async () => {
    await ctx.getById('nomad-time-edinburgh').click();
    await t.screenshot('./screenshots/perfectionism/03-time-dropdown.png');
    // Verify dropdown is open (visual inspection of screenshot)
  });
});
```

## Success Criteria

The port is "perfect" when:

1. All TsyneTest interactions work without hanging
2. Screenshots show UI matching original layout (minus images)
3. Adding/removing cities works smoothly
4. Time updates correctly for different timezones
5. Date picker shows calendar and updates all cities
6. Unit tests: 20/20 passing
7. UI interaction tests: All passing

## Files to Modify

- `nomad.ts` - Main app logic
- `nomad.test.ts` - Unit tests (currently 20/20 passing)
- `nomad-tsyne.test.ts` - UI interaction tests
- `nomad-perfectionism.test.ts` - New comprehensive test file
