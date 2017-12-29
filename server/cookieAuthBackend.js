"use strict";

const Cookies = require( "cookies" );
const jsDAV_Auth_iBackend = require("jsDAV/lib/DAV/plugins/auth/iBackend");
const Exc = require("jsDAV/lib/shared/exceptions");
const { URL } = require('url');

module.exports = jsDAV_Auth_iBackend.extend({
  tokens: {
    '1234': 'jeremy'
  },
  cookies: {},

  currentUser: null,

  createCookie: function(username) {
    this.cookies[username] = Math.floor(Math.random() * 1000).toString();
    return this.cookies[username];
  },

  validateToken: function(token, cbvalidpass) {
    let userToken = Object.entries(this.cookies).find(entry => entry[1] === token);
    if (!!userToken) {
      this.currentUser = userToken[0];
      cbvalidpass(true);
      return;
    }
    cbvalidpass(false);
  },

  getCurrentUser: function(callback) {
    return callback(null, this.currentUser);
  },

  requireAuth: function(handler, err, callback) {
    let req = handler.httpRequest;
    let res = handler.httpResponse;
    if (req.token && this.tokens[req.token]) {
      if (req.method.toUpperCase() === 'GET') {
        let username = this.tokens[req.token];
        let cookie = this.createCookie(username);
        let cookies = new Cookies(req, res);
        cookies.set('user-token', cookie, {
          expires: new Date(Date.now() + 9999999),
          overwrite: true
        });
        //res.setHeader('Set-Cookie', `user-token=${token}; Expires=Wed, 30 Aug 2019 00:00:00 GMT`);
        //req. Set-Cookie: user-token=219ffwef9w0f; Domain=somecompany.co.uk; Path=/; Expires=Wed, 30 Aug 2019 00:00:00 GMT
        //global.token = token;
        delete this.tokens[req.token];
      }
      callback(null, true);
    } else {
      if (!(err instanceof Exc.jsDAV_Exception))
        err = new Exc.NotAuthenticated(err);
      callback(err, false);
    }
  },

  authenticate: function(handler, realm, cbauth) {
    let req = handler.httpRequest;
    let res = handler.httpResponse;
    let cookies = new Cookies(req, res);
    let token = cookies.get("user-token");

    let self = this;
    if (req.method.toUpperCase() === 'OPTIONS') {
      cbauth(null, true);
    } else {
      this.validateToken(token, function(valid) {
        if (!valid)
          return self.requireAuth(handler, "Token does not match", cbauth);

        cbauth(null, true);
      });
    }
  }
});
