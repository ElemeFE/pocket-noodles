#!/usr/bin/env node

var http = require('http');
var path = require('path');
var url = require('url');
var fs = require('fs');
var childProcess = require('child_process');
var state = true;

var server = http.createServer(function(req, res) {
  var pathInfo = url.parse(req.url);
  switch (pathInfo.pathname) {
    case '/':
      res.writeHeader(200, { 'Content-Type': 'text/html' });
      fs.createReadStream('index.html').pipe(res);
      break;
    case '/index.js':
      res.writeHeader(200, { 'Content-Type': 'application/javascript' });
      fs.createReadStream('../index.js').pipe(res);
      break;
    case '/data.json':
      if (state) {
        res.writeHeader(200, { 'Content-Type': 'application/json', 'X-Test-Header': 'hehe' });
        res.end('{"name":"hehe"}');
      } else {
        res.writeHeader(500, { 'Content-Type': 'application/json' });
        res.end('{"name":"ERROR"}');
      }
      state = !state;
      break;
    default:
      var fPath = '.' + pathInfo.pathname;
      try {
        var fileInfo = fs.statSync(fPath);
        if (!fileInfo.isFile()) throw 0;
        res.writeHeader(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(fPath).pipe(res);
      } catch (error) {
        res.writeHeader(404, { 'Content-Type': 'application/json' });
        res.end('{"name":"NOT_FOUND"}');
      }
      break;
  }
}).listen(function() {
  var port = server.address().port;
  childProcess.exec('open http://127.0.0.1:' + port);
});
