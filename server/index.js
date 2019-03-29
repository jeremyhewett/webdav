const jsDAV = require("./lib/jsDAV/lib/jsdav");
const jsDAV_Locks_Backend_FS = require("./lib/jsDAV/lib/DAV/plugins/locks/fs");
const cookieAuthBackend = require('./cookieAuthBackend');
const express = require('express');
const uuid = require('uuid/v4');
const extract = require('extract-zip');
const zipFolder = require('zip-a-folder');
const xml2js = require('xml2js');
const cookieParser = require('cookie-parser');
const fs = require('fs-extra');
const path = require('path');
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

const references = {};
const tempFiles = {};

let app = express();
app.use(requestLogger);
app.use(responseLogger);
app.use(cookieParser());
app.all('/dav/:token/*', davHandler);
app.get('/api/files', getFiles);
app.get('/api/token/:fileName', getToken);
app.get('/api/select/:fileName', selectFile);
app.get('/api/references', getReferences);
app.get('/api/reference/:id', getReference);
app.get('/api/reference/:id/open', openReference);
app.get('*', express.static('client'));
app.listen(9000, () => {
  console.log("Server listening on port 9000")
});

function davHandler(req, res) {
  req.url = req.url.replace(new RegExp(`/dav/${req.params.token}`), '/dav');
  let fileName = req.url.split('/').pop();
  let referenceId = fileName.substr(0, fileName.lastIndexOf('.'));
  if (references[referenceId]) {
    if (req.method === 'PUT' && references[referenceId].status === 'PENDING') {
      references[referenceId].status = 'SAVED';
    }
    if (req.method === 'UNLOCK' && references[referenceId].status === 'SAVED') {
      setTimeout(() => {
        saveSelection(referenceId);
        references[referenceId].status = 'DONE';
      });
      console.log(`DONE: ${referenceId}`);
    }
  }
  if (req.method === 'UNLOCK' && tempFiles[referenceId]) {
    setTimeout(() => {
      fs.removeSync(`./server/data/files/${referenceId}.xlsx`);
      delete tempFiles[referenceId];
    }, 5000);
  }
  davServer.exec.apply(davServer, [req, res]);
}

function saveSelection(referenceId) {
  let filePath = `./server/data/files/${referenceId}.xlsx`;
  let unzipPath = path.resolve(filePath.substr(0, filePath.lastIndexOf('.')));
  extract(filePath, { dir: unzipPath }, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    let xml = fs.readFileSync(unzipPath + '/xl/workbook.xml', 'utf8');
    xml2js.parseString(xml, function (err, document) {
      let workbookView = document.workbook.bookViews[0].workbookView
        .find(workbookView => workbookView.$.visibility !== 'hidden');
      let tabIndex = workbookView.$.activeTab ? parseInt(workbookView.$.activeTab) : 0;
      let workbookViewId = document.workbook.bookViews[0].workbookView.indexOf(workbookView);
      let sheetFile = `${unzipPath}/xl/worksheets/sheet${tabIndex + 1}.xml`;
      xml = fs.readFileSync(sheetFile, 'utf8');
      xml2js.parseString(xml, function (err, sheet) {
        let sheetView = sheet.worksheet.sheetViews[0].sheetView
          .find(sheetView => sheetView.$.workbookViewId === workbookViewId.toString());
        Object.assign(references[referenceId], {
          workbookView: workbookView.$,
          sheetView: sheetView
        });
        fs.removeSync(unzipPath);
        fs.removeSync(filePath);
      });
    });
  });
}

async function openReference(req, res) {
  let reference = references[req.params.id];
  if (!reference) {
    res.status(404).end();
    return;
  }
  let id = uuid();
  let filePath = `./server/data/files/${id}.xlsx`;
  let unzipPath = path.resolve(filePath.substr(0, filePath.lastIndexOf('.')));
  fs.copyFileSync(`./server/data/files/${reference.fileName}`, filePath);
  await unzip(filePath, unzipPath);
  fs.removeSync(filePath);

  let xml = fs.readFileSync(unzipPath + '/xl/workbook.xml', 'utf8');
  let document = await parseXml(xml);
  let workbookView = document.workbook.bookViews[0].workbookView
    .find(workbookView => workbookView.$.visibility !== 'hidden');
  let workbookViewId = document.workbook.bookViews[0].workbookView.indexOf(workbookView);
  workbookView.$ = reference.workbookView;
  let builder = new xml2js.Builder();
  xml = builder.buildObject(document);
  fs.writeFileSync(unzipPath + '/xl/workbook.xml', xml);

  let tabIndex = workbookView.$.activeTab ? parseInt(workbookView.$.activeTab) : 0;
  let sheets = document.workbook.sheets[0].sheet;
  for (let s = 0; s < sheets.length; s++) {
    let sheetFile = `${unzipPath}/xl/worksheets/sheet${s + 1}.xml`;
    xml = fs.readFileSync(sheetFile, 'utf8');
    let sheet = await parseXml(xml);
    let sheetView = sheet.worksheet.sheetViews[0].sheetView
      .find(sheetView => sheetView.$.workbookViewId === workbookViewId.toString());
    if (s === tabIndex) {
      Object.assign(sheetView, reference.sheetView);
    } else {
      delete sheetView.$.tabSelected;
    }
    builder = new xml2js.Builder();
    xml = builder.buildObject(sheet);
    fs.writeFileSync(sheetFile, xml);
  }

  await zip(unzipPath, filePath);
  fs.removeSync(unzipPath);
  let username = `user_${Math.floor(Math.random() * 1000).toString()}`;
  let token = authBackend.generateToken(username, id);
  tempFiles[id] = true;
  res.send({
    token: token,
    tempFile: `${id}.xlsx`
  });
}

async function parseXml(xml) {
  return new Promise((res, rej) => {
    xml2js.parseString(xml, function (err, document) {
      if (err) {
        rej(err);
      } else {
        res(document);
      }
    });
  });
}

async function unzip(zip, dest) {
  return new Promise((res, rej) => {
    extract(zip, { dir: dest }, (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

async function zip(source, zip) {
  return new Promise((res, rej) => {
    zipFolder.zipFolder(source, zip, (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

function getReferences(req, res) {
  let array = Object.entries(references)
    .map(([key, value]) => Object.assign({ id: key }, value));
  res.send(array);
}

function getReference(req, res) {
  let id = req.params.id;
  if (references[id] && references[id].status === 'DONE') {
    res.send(Object.assign({ id: id }, references[id]));
  } else {
    res.status(404).end();
  }
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

function selectFile(req, res) {
  let username = `user_${Math.floor(Math.random() * 1000).toString()}`;
  let referenceId = uuid();
  fs.copyFileSync('./server/data/files/' + req.params.fileName, `./server/data/files/${referenceId}.xlsx`);
  let token = authBackend.generateToken(username, referenceId);
  references[referenceId] = {
    fileName: req.params.fileName,
    status: 'PENDING'
  };
  res.send({
    id: referenceId,
    token: token,
    tempFile: `${referenceId}.xlsx`
  });
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