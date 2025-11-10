// Text Features Demo Page - Demonstrates text display features
// URL: http://localhost:3000/text-features
// Feature: Text, paragraphs, headings (like HTML text elements)

const { vbox, scroll, label, button, separator, richtext } = tsyne;

vbox(() => {
  label('Text Features Demo');
  label('This page demonstrates text features, similar to HTML paragraphs and headings');
  separator();

  scroll(() => {
    vbox(() => {
      label('');
      label('=== Headings ===');
      label('(In Tsyne, use label() - styling can be applied via styles API)');
      label('');

      label('Heading 1 - Large Title');
      label('Heading 2 - Section Title');
      label('Heading 3 - Subsection Title');
      label('');

      separator();
      label('');

      label('=== Paragraphs ===');
      label('');
      label('This is a paragraph. In HTML this would be <p>text</p>.');
      label('In Tsyne, we use label() to display text content.');
      label('');
      label('Each label() call creates a new line of text.');
      label('Empty labels create blank lines for spacing.');
      label('');

      separator();
      label('');

      label('=== Rich Text ===');
      label('Tsyne supports rich text with formatting:');
      label('');

      richtext([
        { text: 'This is bold text', bold: true },
        { text: ' and this is normal ', bold: false },
        { text: 'and this is italic', italic: true }
      ]);

      label('');

      richtext([
        { text: 'Monospace text', monospace: true },
        { text: ' for code snippets', monospace: false }
      ]);

      label('');

      separator();
      label('');

      label('=== Text Separators ===');
      label('Horizontal rules for visual separation (like HTML <hr>):');
      label('');
      separator();
      label('Content above separator');
      separator();
      label('Content below separator');
      separator();
      label('');

      separator();
      label('');

      label('=== Multiline Text ===');
      label('For longer text content, labels can contain multiple lines.');
      label('Each label() represents a paragraph or line of text.');
      label('');
      label('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
      label('Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.');
      label('Ut enim ad minim veniam, quis nostrud exercitation ullamco.');
      label('');

      separator();
      label('');

      label('=== Comparison to HTML ===');
      label('');
      label('HTML: <h1>Title</h1>');
      label('Tsyne: label(\'Title\') + styling');
      label('');
      label('HTML: <p>Paragraph text</p>');
      label('Tsyne: label(\'Paragraph text\')');
      label('');
      label('HTML: <hr>');
      label('Tsyne: separator()');
      label('');
      label('HTML: <strong>Bold</strong>');
      label('Tsyne: richtext([{ text: \'Bold\', bold: true }])');
      label('');
    });
  });

  separator();
  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
