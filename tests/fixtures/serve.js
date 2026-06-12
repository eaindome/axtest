#!/usr/bin/env node
// Simple static server for the axtest fixture app.
// Usage: node tests/fixtures/serve.js
//        PORT=5000 node tests/fixtures/serve.js

const http = require('http')
const fs   = require('fs')
const path = require('path')

const PORT = parseInt(process.env.PORT ?? '4321', 10)
const ROOT = path.join(__dirname, 'app')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html'

  const filePath = path.join(ROOT, urlPath)

  // Security: stay inside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end(`Not found: ${urlPath}`)
      return
    }
    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`Fixture server: http://localhost:${PORT}`)
  console.log(`Serving: ${ROOT}`)
  console.log('Press Ctrl+C to stop.')
})
