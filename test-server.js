const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Mock API responses
const mockApiResponses = {
  '/api/chat': (req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log('API Request:', data);
          
          // Mock response for title generation
          if (data.message && data.message.includes('Create a short, descriptive title')) {
            const titles = [
              'Python Code Help',
              'Recipe Planning Guide', 
              'Travel Advice Chat',
              'Math Problem Solving',
              'Creative Writing Tips',
              'Tech Support Query'
            ];
            const randomTitle = titles[Math.floor(Math.random() * titles.length)];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ text: randomTitle }));
          } else {
            // Regular chat response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              text: `Mock response from ${data.persona}: I received your message "${data.message.substring(0, 50)}..." and I'm here to help!` 
            }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    }
  }
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle API routes
  if (mockApiResponses[pathname]) {
    return mockApiResponses[pathname](req, res);
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Get file extension for content type
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  const contentType = contentTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Test server running at http://localhost:${PORT}`);
  console.log(`📝 Open http://localhost:${PORT}/chat.html to test your app`);
  console.log(`🤖 Mock API responses enabled for /api/chat`);
});
