"use strict";
const crypto = require('crypto');
const jsDAV_Auth_iBackend = require("./lib/jsDAV/lib/DAV/plugins/auth/iBackend");
const Exc = require("./lib/jsDAV/lib/shared/exceptions");

module.exports = jsDAV_Auth_iBackend.extend({
  tokens: {},
  authCookies: {},

  currentUser: null,

  generateToken: function(username, file) {
    let hash = crypto.createHash('sha256');
    hash.update(file);
    let token = hash.digest('hex');
    this.tokens[token] = username;
    return token;
  },

  createAuthCookie: function(username) {
    this.authCookies[username] = Math.floor(Math.random() * 1000).toString();
    return this.authCookies[username];
  },

  validateAuthCookie: function(authCookie, cbvalidpass) {
    let cookie = Object.entries(this.authCookies).find(entry => entry[1] === authCookie);
    if (!!cookie) {
      this.currentUser = cookie[0];
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
      let authCookie = this.createAuthCookie(username);
      res.cookie('auth-cookie',authCookie, {
        expires: new Date(Date.now() + 9999999),
        overwrite: true,
        httpOnly: true
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

    let self = this;
    if (req.method.toUpperCase() === 'OPTIONS') {
      cbauth(null, true);
    } else {
      this.validateAuthCookie(req.cookies['auth-cookie'], function(valid) {
        if (!valid)
          return self.requireAuth(handler, "Token does not match", cbauth);

        cbauth(null, true);
      });
    }
  }
});
