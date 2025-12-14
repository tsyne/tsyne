# Prime Grid Visualizer for Tsyne

A mathematical visualization application that displays prime numbers in an interactive grid format, ported from [Abhrankan Chakrabarti's Prime Grid Visualizer](https://github.com/abhrankan-chakrabarti/prime-grid-visualizer) to the Tsyne framework.

## Original Project

This application is based on the Prime Grid Visualizer:
- **Repository**: https://github.com/abhrankan-chakrabarti/prime-grid-visualizer
- **Live Demo**: https://abhrankan-chakrabarti.github.io/prime-grid-visualizer/
- **Original Author**: Abhrankan Chakrabarti
- **Original Implementation**: HTML5/Canvas-based web application
- **Portions copyright (c) Abhrankan Chakrabarti**

## About This Port

This is a Tsyne port of the prime grid visualizer, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original is a web-based visualization tool. This version maintains the core prime number visualization functionality while adapting the UI to Tsyne's declarative API and using efficient pixel-level rendering for performance.

## What Does It Do?

The Prime Grid Visualizer displays prime numbers in a customizable grid. Each number from 1 to n is rendered as a colored cell:

- **🟢 Green** - Prime numbers
- **🔴 Red** - Composite numbers
- **🔵 Blue** - The number 1 (special case)
- **Dark borders** - Cell boundaries for clarity

The application includes statistics about the prime distribution and supports exporting visualizations as screenshots.

### Screenshot

![Prime Grid Visualizer](../screenshots/prime-grid-visualizer.png)

*Visualization of the first 200 numbers in a 14-column grid (to generate: run tests with `TAKE_SCREENSHOTS=1`)*

## Features

✅ **Implemented:**
- **Sieve of Eratosthenes** - Efficient prime calculation algorithm
- **Customizable Parameters**:
  - Maximum number (n) - How high to count
  - Grid columns - How many cells per row
  - Cell size - Pixel dimensions of each cell
- **Real-time Statistics**:
  - Prime count
  - Composite count
  - Prime percentage
- **Color-coded Grid** - Visual distinction between prime and composite numbers
- **Efficient Rendering** - Uses CanvasRaster with fillRect for performance
- **Screenshot Export** - Save visualizations as PNG files
- **Responsive UI** - Controls and scrollable grid area

## How Prime Numbers Work

A prime number is a natural number greater than 1 that has exactly two distinct positive divisors: 1 and itself.

- **2, 3, 5, 7, 11, 13, ...** are prime numbers
- **4, 6, 8, 9, 10, 12, ...** are composite numbers (have more than 2 divisors)
- **1** is neither prime nor composite

### The Sieve of Eratosthenes

This algorithm efficiently finds all primes up to n:

1. List all numbers from 2 to n
2. Start with the first unmarked number (2, which is prime)
3. Mark all multiples of 2 as composite
4. Find the next unmarked number (3)
5. Mark all multiples of 3 as composite
6. Repeat until you've processed all numbers up to √n

Time complexity: **O(n log log n)** - Very efficient!

## Usage

### Running the App

```bash
# If in the tsyne root directory
npx tsx ported-apps/prime-grid-visualizer/prime-grid-visualizer.ts

# Or via the desktop environment
npx tsx examples/desktop-demo.ts
# Then launch "Prime Grid Visualizer" from the desktop
```

### How to Use

1. **Set Parameters**:
   - Enter a maximum number (e.g., 100, 1000, 10000)
   - Set how many columns to display (e.g., 10, 20, 50)
   - Choose cell size in pixels (minimum 5, default 20)

2. **Generate Grid**:
   - Click the "Generate" button
   - Wait for the sieve calculation and rendering

3. **View Statistics**:
   - See prime count, composite count, and percentage
   - Analyze prime distribution visually

4. **Export**:
   - Click "Export as Screenshot" to save the grid as PNG
   - File is saved to `/tmp/prime-grid-TIMESTAMP.png`

## Examples

### Small Grid (First 100 Numbers, 10×10)
```
n = 100, columns = 10, cellSize = 20
Result: 10 rows of 10 cells each
Primes: 25 | Composites: 74 | 25% prime
```

### Medium Grid (First 1000 Numbers, 20 Columns)
```
n = 1000, columns = 20, cellSize = 15
Result: 50 rows of 20 cells each
Primes: 168 | Composites: 831 | 16.8% prime
```

### Large Grid (First 10000 Numbers, 50 Columns)
```
n = 10000, columns = 50, cellSize = 10
Result: 200 rows of 50 cells each
Primes: 1229 | Composites: 8770 | 12.3% prime
```

## Testing

```bash
# Run tests for the prime grid visualizer
npm test ported-apps/prime-grid-visualizer/prime-grid-visualizer.test.ts

# Run with visual debugging (shows the app)
TSYNE_HEADED=1 npm test ported-apps/prime-grid-visualizer/prime-grid-visualizer.test.ts

# Capture screenshots for documentation
TAKE_SCREENSHOTS=1 npm test ported-apps/prime-grid-visualizer/prime-grid-visualizer.test.ts
```

**Test Coverage:**
- UI element rendering and visibility
- Grid generation and prime calculation
- Parameter input and validation
- Statistics calculation accuracy
- Export functionality
- Visual regression testing (screenshot comparison)

## Architecture

### Key Components

**Prime Sieve Function** - `sieveOfEratosthenes(max: number): boolean[]`
- Generates boolean array marking which numbers are prime
- Used by most modern applications for prime generation
- Time complexity: O(n log log n)

**Grid State** - `GridState` interface
- Tracks current parameters (n, columns, cellSize)
- Stores prime calculation results
- Maintains statistics

**Rendering** - `renderGridToRaster()` and `drawCell()`
- Uses CanvasRaster for pixel-level efficiency
- fillRect for background and cell colors
- Border drawing for cell separation

**UI Controllers**
- Input fields for parameter adjustment
- Generate button for computation
- Statistics label for real-time updates
- Export button for PNG capture

### Data Flow

```
User Input (n, columns, cellSize)
    ↓
[Generate] Button Click
    ↓
sieveOfEratosthenes() - Calculate primes
    ↓
calculateStats() - Compute statistics
    ↓
renderGridToRaster() - Draw to CanvasRaster
    ↓
updateDisplay() - Show statistics and grid
    ↓
Visual Grid + Statistics shown to user
```

## Performance Considerations

- **Sieve Algorithm**: O(n log log n) time, O(n) space
- **Rendering**: fillRect operations are more efficient than individual setPixel calls
- **Large Grids**: Cell size automatically limited by canvas dimensions (max 800×800)
- **Memory**: Numbers up to ~100,000 are practical; beyond that requires optimization

### Optimization Tips

- Use smaller cell sizes for large numbers (better compression)
- Use more columns to see distribution patterns better
- For very large numbers (>100,000), consider implementing segmented sieve

## Mathematical Insights

Looking at prime grids reveals interesting patterns:

### Prime Density

Prime numbers become sparser as numbers get larger (Prime Number Theorem):
- Below 100: ~25% are prime
- Below 1,000: ~17% are prime
- Below 10,000: ~12% are prime

### Visual Patterns

- **Small numbers**: Dense prime regions (especially odd numbers)
- **Even numbers**: All composite except 2
- **Columns**: Some columns have more primes (those not divisible by small primes)
- **Gaps**: Increasingly large prime gaps as numbers grow

### The Green Theorem

For large n, the "prime number theorem" tells us the density of primes near n is approximately 1/ln(n).

## Browser Version Comparison

| Feature | Web Version | Tsyne Version |
|---------|------------|--------------|
| Interactive Grid | Canvas-based HTML5 | CanvasRaster pixel rendering |
| Parameter Input | HTML form fields | Tsyne Entry widgets |
| Jump Navigation | Scroll highlight | Planned enhancement |
| Export | Browser download | Window.screenshot() PNG |
| Performance | JavaScript | TypeScript + Go bridge |
| Platform | Web browsers only | Desktop (Fyne-based) |

## Extending the App

### Potential Enhancements

1. **Jump Navigation**: Scroll and highlight specific numbers
2. **Prime Factorization**: Show factors on hover
3. **Animated Generation**: Watch the sieve algorithm in real-time
4. **Pattern Detection**: Identify and highlight known patterns
5. **Statistics Panel**: More detailed prime distribution analysis
6. **Themes**: Custom color schemes for primes/composites

## Attribution

- **Original Visualization**: [Abhrankan Chakrabarti's Prime Grid Visualizer](https://github.com/abhrankan-chakrabarti/prime-grid-visualizer)
  - Portions copyright (c) Abhrankan Chakrabarti
  - See original repository for full license details
- **Algorithm**: Sieve of Eratosthenes (ancient algorithm by Eratosthenes of Cyrene, c. 276–194 BC)
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team

## References

- [Prime Number Theorem](https://en.wikipedia.org/wiki/Prime_number_theorem)
- [Sieve of Eratosthenes](https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)
- [Prime Numbers](https://en.wikipedia.org/wiki/Prime_number)
- [Eratosthenes of Cyrene](https://en.wikipedia.org/wiki/Eratosthenes)

## Future Enhancements

1. **Performance**: Segmented sieve for numbers >1,000,000
2. **Interactivity**: Click cells to see factorization
3. **Analysis**: Prime gaps, twin primes, Goldbach's conjecture visualization
4. **Export Formats**: SVG, PDF, different image formats
5. **Themes**: Customizable color schemes and rendering options
