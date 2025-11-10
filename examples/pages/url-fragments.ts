// URL Fragments Demo - Demonstrates # (hash) handling
// URL: http://localhost:3000/url-fragments
// Feature: URL fragments for in-page navigation and state

const { vbox, scroll, label, button, separator } = tsyne;

// Parse fragment from URL
const url = browserContext.currentUrl;
const fragmentMatch = url.match(/#(.+)/);
const fragment = fragmentMatch ? fragmentMatch[1] : '';

vbox(() => {
  label('URL Fragments Demo (#)');
  label('Like HTML anchors and client-side routing');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('Current URL: ' + browserContext.currentUrl);
      label('Current Fragment: ' + (fragment || '(none)'));
      label('');

      separator();
      label('');
      label('=== What are URL Fragments? ===');
      label('');
      label('In web browsers:');
      label('  • http://example.com/page#section → scrolls to <a name="section">');
      label('  • JavaScript can read location.hash');
      label('  • Used for client-side routing (React Router, etc.)');
      label('  • Fragment changes don\'t reload the page');
      label('');

      separator();
      label('');
      label('=== In Tsyne Browser ===');
      label('');
      label('Fragments can be used for:');
      label('  1. Section navigation within a page');
      label('  2. Client-side state in URL');
      label('  3. Bookmarkable page states');
      label('  4. Tab/accordion selection');
      label('');

      separator();
      label('');
      label('=== Example: Section Navigation ===');
      label('Click these to navigate to different sections:');
      label('');

      button('Go to Section 1 (#section1)', () => {
        browserContext.changePage('/url-fragments#section1');
      });

      button('Go to Section 2 (#section2)', () => {
        browserContext.changePage('/url-fragments#section2');
      });

      button('Go to Section 3 (#section3)', () => {
        browserContext.changePage('/url-fragments#section3');
      });

      button('Clear Fragment', () => {
        browserContext.changePage('/url-fragments');
      });

      label('');

      separator();
      label('');

      // Section 1
      if (fragment === '' || fragment === 'section1') {
        label('━━━ SECTION 1 ━━━');
        label('');
        label('This is section 1 content.');
        label('Notice the URL now includes #section1');
        label('');
        label('In a web page, this would be:');
        label('  <a name="section1"></a>');
        label('  or <div id="section1">');
        label('');
      }

      separator();
      label('');

      // Section 2
      if (fragment === '' || fragment === 'section2') {
        label('━━━ SECTION 2 ━━━');
        label('');
        label('This is section 2 content.');
        label('Notice the URL now includes #section2');
        label('');
        label('Fragment changes don\'t trigger full page reload.');
        label('The server doesn\'t see the fragment - it\'s client-side only.');
        label('');
      }

      separator();
      label('');

      // Section 3
      if (fragment === '' || fragment === 'section3') {
        label('━━━ SECTION 3 ━━━');
        label('');
        label('This is section 3 content.');
        label('Notice the URL now includes #section3');
        label('');
        label('You can bookmark this URL and return to this section.');
        label('');
      }

      separator();
      label('');

      label('=== Example: Tab Selection ===');
      label('');
      label('Fragments can control which tab is visible:');
      label('');

      button('Show Tab A (#tab-a)', () => {
        browserContext.changePage('/url-fragments#tab-a');
      });

      button('Show Tab B (#tab-b)', () => {
        browserContext.changePage('/url-fragments#tab-b');
      });

      button('Show Tab C (#tab-c)', () => {
        browserContext.changePage('/url-fragments#tab-c');
      });

      label('');

      if (fragment === 'tab-a' || (!fragment && !fragment.startsWith('tab-'))) {
        label('▸ Tab A Content');
        label('  This is the content for tab A.');
      }

      if (fragment === 'tab-b') {
        label('▸ Tab B Content');
        label('  This is the content for tab B.');
      }

      if (fragment === 'tab-c') {
        label('▸ Tab C Content');
        label('  This is the content for tab C.');
      }

      label('');

      separator();
      label('');

      label('=== Example: Search Results ===');
      label('');
      label('Fragments can store search terms:');
      label('  /search#query=typescript');
      label('  /search#query=fyne&page=2');
      label('');

      if (fragment.startsWith('query=')) {
        const query = decodeURIComponent(fragment.substring(6));
        label(`Searching for: "${query}"`);
        label('');
        label('Results:');
        label('  1. Result matching ' + query);
        label('  2. Another result matching ' + query);
        label('  3. More results...');
      } else {
        button('Search for "typescript" (#query=typescript)', () => {
          browserContext.changePage('/url-fragments#query=typescript');
        });
      }

      label('');

      separator();
      label('');

      label('=== Implementation Notes ===');
      label('');
      label('To use fragments in Tsyne pages:');
      label('');
      label('1. Parse fragment from browserContext.currentUrl:');
      label('   const url = browserContext.currentUrl;');
      label('   const fragment = url.match(/#(.+)/)?.[1] || \'\';');
      label('');
      label('2. Conditionally render content based on fragment:');
      label('   if (fragment === \'section1\') {');
      label('     label(\'Section 1 content\');');
      label('   }');
      label('');
      label('3. Navigate with fragment:');
      label('   browserContext.changePage(\'/page#section1\');');
      label('');

      separator();
      label('');

      label('=== Comparison to Web ===');
      label('');
      label('Web JavaScript:');
      label('  window.location.hash = \'#section1\';');
      label('  const hash = window.location.hash; // "#section1"');
      label('');
      label('Tsyne Browser:');
      label('  browserContext.changePage(\'/page#section1\');');
      label('  const url = browserContext.currentUrl;');
      label('  const fragment = url.match(/#(.+)/)?.[1];');
      label('');

      separator();
      label('');

      label('=== Advanced: Complex Fragments ===');
      label('');
      label('Fragments can contain structured data:');
      label('  /map#lat=40.7128&lng=-74.0060&zoom=12');
      label('  /article#section=intro&highlight=paragraph-3');
      label('  /dashboard#view=charts&range=7d&metric=sales');
      label('');
      label('Parse with URLSearchParams:');
      label('  const params = new URLSearchParams(fragment);');
      label('  const lat = params.get(\'lat\');');
      label('');

      separator();
      label('');

      label('=== When NOT to Use Fragments ===');
      label('');
      label('Don\'t use fragments for:');
      label('  • Separate pages (use different URLs: /about, /contact)');
      label('  • Server-side data (use query params: ?id=123)');
      label('  • Sensitive data (fragments visible in URL bar)');
      label('');
      label('Use fragments for:');
      label('  • In-page section navigation');
      label('  • Client-side UI state');
      label('  • Bookmarkable widget states (tabs, filters)');
      label('  • Single-page app routing');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
