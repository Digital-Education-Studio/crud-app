const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

/*
 * Simple CRUD API server
 *
 * This server provides a minimal backend for managing a collection of
 * items. Each item contains an `id`, `name` and `description`. Data is
 * persisted to a JSON file on disk so that it survives restarts.
 *
 * Supported routes:
 *   GET    /items            – list all items
 *   GET    /items/:id        – get a single item by id
 *   POST   /items            – create a new item (expects JSON body)
 *   PUT    /items/:id        – update an existing item (expects JSON body)
 *   DELETE /items/:id        – delete an item by id
 *
 * The server listens on the port specified by the PORT environment
 * variable, or 3000 by default.
 */

const DATA_FILE = path.join(__dirname, 'items.json');

// Ensure the data file exists; if not, initialize it with an empty array.
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
  }
}

// Read all items from the data file.
function readItems() {
  ensureDataFile();
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(data);
  } catch (err) {
    // If the file contains invalid JSON, reset it to an empty array.
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
    return [];
  }
}

// Write items array back to the data file.
function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// Generate the next item ID by finding the maximum existing id and adding 1.
function getNextId(items) {
  const maxId = items.reduce((max, item) => (item.id > max ? item.id : max), 0);
  return maxId + 1;
}

// Helper to send JSON responses.
function sendJson(res, statusCode, body) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

// Helper to parse request body into JSON.
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        const json = JSON.parse(body);
        resolve(json);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// Request handler for our API.
async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Only accept JSON bodies for POST and PUT.
  if ((method === 'POST' || method === 'PUT') && req.headers['content-type'] !== 'application/json') {
    sendJson(res, 415, { error: 'Content-Type must be application/json' });
    return;
  }

  // Load current items from disk.
  let items = readItems();

  // Serve static frontend files
  if (method === 'GET' && pathname === '/') {
    // Serve the main HTML page
    const filePath = path.join(__dirname, 'frontend', 'index.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        sendJson(res, 500, { error: 'Failed to load index.html' });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }
  if (method === 'GET' && pathname === '/script.js') {
    const filePath = path.join(__dirname, 'frontend', 'script.js');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        sendJson(res, 500, { error: 'Failed to load script.js' });
      } else {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(data);
      }
    });
    return;
  }

  // Route: GET /items
  if (method === 'GET' && pathname === '/items') {
    sendJson(res, 200, items);
    return;
  }

  // Match routes with an ID parameter, e.g. /items/1
  const idMatch = pathname.match(/^\/items\/(\d+)$/);
  const hasId = Boolean(idMatch);
  const id = hasId ? Number(idMatch[1]) : null;

  // Route: GET /items/:id
  if (method === 'GET' && hasId) {
    const item = items.find((i) => i.id === id);
    if (!item) {
      sendJson(res, 404, { error: 'Item not found' });
      return;
    }
    sendJson(res, 200, item);
    return;
  }

  // Route: POST /items
  if (method === 'POST' && pathname === '/items') {
    try {
      const body = await parseRequestBody(req);
      if (!body || typeof body.name !== 'string') {
        sendJson(res, 400, { error: 'Invalid request body: `name` is required' });
        return;
      }
      const newItem = {
        id: getNextId(items),
        name: body.name,
        description: typeof body.description === 'string' ? body.description : '',
      };
      items.push(newItem);
      writeItems(items);
      sendJson(res, 201, newItem);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Route: PUT /items/:id
  if (method === 'PUT' && hasId) {
    try {
      const body = await parseRequestBody(req);
      const index = items.findIndex((i) => i.id === id);
      if (index === -1) {
        sendJson(res, 404, { error: 'Item not found' });
        return;
      }
      if (!body || typeof body.name !== 'string') {
        sendJson(res, 400, { error: 'Invalid request body: `name` is required' });
        return;
      }
      items[index] = {
        id: items[index].id,
        name: body.name,
        description: typeof body.description === 'string' ? body.description : '',
      };
      writeItems(items);
      sendJson(res, 200, items[index]);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Route: DELETE /items/:id
  if (method === 'DELETE' && hasId) {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: 'Item not found' });
      return;
    }
    const deleted = items.splice(index, 1)[0];
    writeItems(items);
    sendJson(res, 200, deleted);
    return;
  }

  // If we reach this point, the route is not recognized.
  sendJson(res, 404, { error: 'Not found' });
}

// Create and start the server.
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  // Enable CORS to allow cross-origin requests from the frontend.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Handle preflight OPTIONS requests quickly.
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  handleRequest(req, res);
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});