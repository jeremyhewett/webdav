const jsDAV = require("./lib/jsDAV/lib/jsdav");
const jsDAV_Locks_Backend_FS = require("./lib/jsDAV/lib/DAV/plugins/locks/fs");
const cookieAuthBackend = require('./cookieAuthBackend');
const express = require('express');
const Url = require('url');
const onHeaders = require('on-headers');

const nodePath = './samples';
const locksPath = './samples/locks';

jsDAV.debugMode = true;

const davServer = jsDAV.mount({
  node: nodePath,
  authBackend: cookieAuthBackend.new(),
  locksBackend: jsDAV_Locks_Backend_FS.new(locksPath),
  mount: "/dav",
  standalone: false
});

let app = express();
app.use(requestLogger);
app.use(responseLogger);
app.all('/dav/token/:token/*', davHandler);
app.get('*', express.static('client'));
app.listen(9000, () => {
  console.log("Server listening on port 9000")
});

function davHandler(req, res) {
  req.url = req.url.replace(new RegExp(`/token/${req.params.token}`), '');
  davServer.exec.apply(davServer, [req, res]);
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