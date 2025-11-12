/**
 * Demonstration of getAllText() functionality
 * Shows how to use getAllText(), hasText(), and assertHasText()
 */

const { browserTest, runBrowserTests } = require('../dist/src/index.js');

browserTest(
  'Test getAllText() methods',
  [
    {
      path: '/demo',
      code: `
const { vbox, label, button } = tsyne;
vbox(() => {
  label('Welcome to the Demo');
  label('This page has multiple labels');
  button('Click Me', () => {
    console.log('Button clicked');
  });
  label('Some more text here');
  label('Final label');
});
      `
    }
  ],
  async (bt) => {
    await bt.createBrowser('/demo');
    const ctx = bt.getContext();

    console.log('\n=== Testing getAllText() ===');

    // Get all text as array
    const allText = await ctx.getAllText();
    console.log('All text array:', allText);
    console.log('Number of text items:', allText.length);

    // Get all text as single string
    const pageText = await ctx.getAllTextAsString();
    console.log('\nAll text as string:');
    console.log(pageText);

    // Test hasText() - case-sensitive
    console.log('\n=== Testing hasText() ===');
    const hasWelcome = await ctx.hasText('Welcome');
    console.log('Has "Welcome":', hasWelcome); // true

    const hasGoodbye = await ctx.hasText('Goodbye');
    console.log('Has "Goodbye":', hasGoodbye); // false

    // Test hasTextIgnoreCase()
    console.log('\n=== Testing hasTextIgnoreCase() ===');
    const hasWelcomeLower = await ctx.hasTextIgnoreCase('welcome');
    console.log('Has "welcome" (case-insensitive):', hasWelcomeLower); // true

    const hasClickLower = await ctx.hasTextIgnoreCase('click me');
    console.log('Has "click me" (case-insensitive):', hasClickLower); // true

    // Test assertHasText() - should pass
    console.log('\n=== Testing assertHasText() ===');
    await ctx.assertHasText('Demo');
    console.log('✓ assertHasText("Demo") passed');

    await ctx.assertHasText('click me', { ignoreCase: true });
    console.log('✓ assertHasText("click me", {ignoreCase: true}) passed');

    // Test assertHasText() - should fail
    try {
      await ctx.assertHasText('Nonexistent text');
      console.log('✗ This should not print');
    } catch (error) {
      console.log('✓ assertHasText correctly threw error:', error.message);
    }

    console.log('\n✓ getAllText() demo completed!\n');
  }
);

// Run the test
(async () => {
  try {
    await runBrowserTests();
    console.log('\n✅ getAllText() Demo Test Passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
})();
