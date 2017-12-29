const jsDAV = require("./lib/jsDAV/lib/jsdav");
const jsDAV_Server = require("./lib/jsDAV/lib/DAV/server");
const jsDAV_Locks_Backend_FS = require("./lib/jsDAV/lib/DAV/plugins/locks/fs");
const cookieAuthBackend = require('./cookieAuthBackend');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const Url = require('url');

//make sure folders required for webdav server exist
const nodePath = './samples';
const locksPath = './samples/locks';

// setting debugMode to TRUE outputs a LOT of information to console
jsDAV.debugMode = true;

//create HTTP and HTTPS server
let server = null;
let secure = false;

if (secure) {
  const options = ssl.createHTTPSOptions();
  server = https.createServer(options).listen(9000);
} else {
  server = http.createServer().listen(9000);
}

server.addListener("request", function(req, res) {
  let path = Url.parse(req.url).pathname;
  if (path.charAt(0) === '/') {
    path = path.substr(1);
  }
  if (path === '') {
    path = 'index.html';
  }
  path = `./client/${path}`;
  try {
    let stat = fs.statSync(path);
    res.writeHead(200);
    let readStream = fs.createReadStream(path);
    readStream.pipe(res);
  } catch(e) {
    res.end(404);
  }
});

//create webdav server
const webdav = jsDAV.mount({
  node: nodePath,
  authBackend: cookieAuthBackend.new(),
  locksBackend: jsDAV_Locks_Backend_FS.new(locksPath),
  mount: "/dav",
  server: server
});

webdav.on('listening', function() {
  console.log('WebDav: Starting list, version: %s', jsDAV_Server.VERSION);
});

webdav.on('error', function(e) {
  if (jsDAV.debugMode) {
    console.log(e);
  }
});