const jsDAV = require("jsDAV/lib/jsdav");
const jsDAV_Server = require("jsDAV/lib/DAV/server");
const jsDAV_Locks_Backend_FS = require("jsDAV/lib/DAV/plugins/locks/fs");
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

//make sure folders required for webdav server exist
const nodePath = './samples';
const locksPath = './samples/locks';

// setting debugMode to TRUE outputs a LOT of information to console
jsDAV.debugMode = true;

if (jsDAV.debugMode) {
  console.log('WebDav: Starting server, version: %s', jsDAV_Server.VERSION);
}

//create HTTP and HTTPS server
let server = null;
let secure = false;

if (secure) {
  const options = ssl.createHTTPSOptions();
  server = https.createServer(options).listen(9000);
} else {
  server = http.createServer().listen(9000);
}

//create webdav server
const webdav = jsDAV.createServer({
  node: nodePath,
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