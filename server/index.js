const jsDAV = require("./lib/jsDAV/lib/jsdav");
const jsDAV_Locks_Backend_FS = require("./lib/jsDAV/lib/DAV/plugins/locks/fs");
const cookieAuthBackend = require('./cookieAuthBackend');
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const onHeaders = require('on-headers');

const nodePath = './server/data/files';
const locksPath = './server/data/locks';

if (!fs.existsSync(locksPath)){
  fs.mkdirSync(locksPath);
}

jsDAV.debugMode = true;

const authBackend = cookieAuthBackend.new();

const davServer = jsDAV.mount({
  node: nodePath,
  authBackend: authBackend,
  locksBackend: jsDAV_Locks_Backend_FS.new(locksPath),
  mount: "/dav",
  standalone: false
});

let app = express();
app.use(requestLogger);
app.use(responseLogger);
app.use(cookieParser());
app.all('/dav/:token/*', davHandler);
app.get('/api/files', getFiles);
app.get('/api/token/:fileName', getToken);
app.get('*', express.static('client'));
app.listen(9000, () => {
  console.log("Server listening on port 9000")
});

function davHandler(req, res) {
  req.url = req.url.replace(new RegExp(`/dav/${req.params.token}`), '/dav');
  davServer.exec.apply(davServer, [req, res]);
}

function getFiles(req, res) {
  fs.readdir('./server/data/files', function (err, files) {
    if (err) {
      res.end(500);
    }
    res.send(files);
  });
}

function getToken(req, res) {
  let username = `user_${Math.floor(Math.random() * 1000).toString()}`;
  let token = authBackend.generateToken(username, req.params.fileName);
  res.send(token);
}

function requestLogger(req, res, next) {
  console.log(`<< ${req.method} ${req.url} HEADERS: ${JSON.stringify(req.headers)}`);
  next();
}

function responseLogger(req, res, next) {
  onHeaders(res, function onResponse() {
    console.log(`>> ${res.statusCode}`);
  });
  next();
}