const express = require('express'),
  onHeaders = require('on-headers'),
  webdavServer = require('./webdavServer');

webdavServer.create('/dav').then(docServer => {
  let app = express();
  app.use(requestLogger);
  app.use(responseLogger);
  app.use(docServer);
  app.use(express.static('client'));
  app.listen(9000, () => {
    console.log("Server listening on port 9000")
  });
});

function requestLogger(req, res, next) {
  console.log(`<< ${req.method} ${req.url} HEADERS: ${JSON.stringify(req.headers)}`);
  req.headers.authorization = "Digest username=\"jeremy\",realm=\"localhost\",nonce=\"13e66f02882f4f51c765f48e203987bc\",uri=\"/dav/samples/\",cnonce=\"c43946b86d1e93a3830a0db831fb1da1\",nc=00000001,response=\"ad23a9c76f1e804f49bc7b83a529c86e\",qop=\"auth\",opaque=\"cbc86307bca5f195b2fbcaa8d49f873e\"";
  next();
}

function responseLogger(req, res, next) {
  onHeaders(res, function onResponse() {
    console.log(`>> ${res.statusCode}`);
  });
  next();
}