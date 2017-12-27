const webdav = require('webdav-server').v2,
  express = require('express'),
  promisify = require("es6-promisify");

function create(path) {

  const userManager = new webdav.SimpleUserManager();
  const user = userManager.addUser('jeremy', 'madman123', false);

  const privilegeManager = new webdav.SimplePathPrivilegeManager();
  privilegeManager.setRights(user, '/', [ 'all' ]);
  /*privilegeManager.__proto__._can = (fullPath, user, resource, privilege, callback) => {
    callback(null, true);
  };*/

  const docServer = new webdav.WebDAVServer({
    httpAuthentication: new webdav.HTTPDigestAuthentication(userManager, 'localhost'),
    privilegeManager: privilegeManager
  });

  docServer.beforeRequest((arg, next) => {
    //console.log('<<', arg.request.method, arg.requested.uri);
    next();
  });

  docServer.afterRequest((arg, next) => {
    //console.log('>>', arg.response.statusCode);
    next();
  });

  return new Promise((res, rej) => {
    docServer.setFileSystem('/', new webdav.PhysicalFileSystem('./'), (success) => {
      if (success) {
        res(webdav.extensions.express(path, docServer));
      } else {
        rej('Failed to start webdav server');
      }
    });
  });
}

module.exports = { create };
