// Quick debug script to see what /api/load returns
const http = require('http');

function apiRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          console.error('Failed to parse JSON:', body);
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    console.log('Loading examples/hello.ts...');
    const response = await apiRequest('/api/load', { filePath: 'examples/hello.ts' });

    console.log('\n=== Response ===');
    console.log('Success:', response.success);
    console.log('File Path:', response.filePath);
    console.log('Styles:', response.styles ? Object.keys(response.styles) : null);
    console.log('\n=== Widgets ===');
    response.metadata.widgets.forEach(w => {
      console.log(`- ${w.widgetType} (id: ${w.id}, parent: ${w.parent || 'none'})`);
      if (w.properties) {
        console.log(`  Properties:`, w.properties);
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
