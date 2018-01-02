"use strict";

const Cookies = require( "cookies" );
const jsDAV_Auth_iBackend = require("./lib/jsDAV/lib/DAV/plugins/auth/iBackend");
const Exc = require("./lib/jsDAV/lib/shared/exceptions");

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
    if (req.params.token && this.tokens[req.params.token]) {
      let username = this.tokens[req.params.token];
      let cookie = this.createCookie(username);
      let cookies = new Cookies(req, res);
      cookies.set('user-token', cookie, {
        expires: new Date(Date.now() + 9999999),
        overwrite: true
      });
      delete this.tokens[req.params.token];
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
