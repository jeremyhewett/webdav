const webdav = require('webdav-server').v2,
  express = require('express'),
  promisify = require("es6-promisify");

const docServer = new webdav.WebDAVServer();

docServer.beforeRequest((arg, next) => {
  //arg.uri = arg.requested.uri;
  console.log('>>', arg.request.method, arg.uri, '>', arg.response.statusCode, arg.response.statusMessage);
  next();
});

docServer.afterRequest((arg, next) => {
  console.log('>>', arg.request.method, arg.uri, '>', arg.response.statusCode, arg.response.statusMessage);
  next();
});

docServer.setFileSystem('/', new webdav.PhysicalFileSystem('./samples'), (success) => {
  let app = express();
  app.use(webdav.extensions.express('/webdav', docServer));
  app.listen(9000, () => {
    console.log("Server listening on port 9000")
  });
});
