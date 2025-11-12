console.log('1. Starting minimal test');

console.log('2. About to require browserTest');
const { browserTest, runBrowserTests } = require('../dist/src/index.js');
console.log('3. Required browserTest successfully');

console.log('4. Registering test');
browserTest(
  'Minimal test',
  [
    {
      path: '/test',
      code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Test page');
});
      `
    }
  ],
  async (bt) => {
    console.log('5. Test function called');
    await bt.createBrowser('/test');
    console.log('6. Browser created');
    const ctx = bt.getContext();
    console.log('7. Got context');

    const heading = await ctx.findWidget({ text: 'Test page' });
    if (!heading) {
      throw new Error('Heading not found');
    }
    console.log('8. Test passed');
  }
);

console.log('9. About to run tests');
(async () => {
  try {
    await runBrowserTests();
    console.log('10. Tests completed');
  } catch (error) {
    console.error('11. Test failed:', error);
    process.exit(1);
  }
})();
