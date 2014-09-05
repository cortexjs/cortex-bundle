var async = require('async');
var path = require('path');
var fs = require('fs');
var through = require('through2');
var seq = require('seq-stream');
var _ = require('underscore');
var events = require('events');
var EE = events.EventEmitter;


module.exports = function(pkg, digdeps, built_root, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};

  // output csses
  var files = options.files || [];

  if (!built_root)
    return callback(new Error("'built_root' must be provided"));

  var cssdeps = digdeps.filter(function(pkg) {
    return pkg.css && pkg.css.length;
  });


  if (!files.length && !cssdeps.length) // no css output
    return callback(null, {});

  // mediation
  var ficss;
  try {
    ficss = require('mediation')(cssdeps);
  } catch (e) {
    // conflict
    return callback(e);
  }

  cssdeps = cssdeps.filter(function(dep) {
    var name = dep.name,
      version = dep.version;

    return ficss[name] && ficss[name][version];
  });


  async.map(cssdeps || [], function(pkg, cb) {
    var name = pkg.name;
    var version = pkg.version;

    // check existence
    async.map(pkg.css.map(function(c) {
      return path.resolve(built_root, ['./', name, '/', version, '/', c].join(''));
    }), function(c, cb) {
      fs.exists(c, function(exists) {
        if (!exists)
          return cb(new Error("Can not find css file '" + c + "' for: " + name + "@" + version));
        cb(null, c);
      });
    }, function(err, rs) {
      cb(err, rs);
    });
  }, function(err, csses) {
    csses = _.flatten(csses);

    var rs = {};

    async.map(files.map(function(f) {
      return path.resolve(built_root, ['./', pkg.name, '/', pkg.version, '/', f].join(''));
    }), function(css, cb) {
      fs.exists(css, function(exists) {
        if (!exists) return cb(new Error("Can not find css file '" + css + "' for: " + pkg.name + "@" + pkg.version));
        cb(null, css);
      });
    }, function(err, absFiles) {
      if (err) return callback(err);

      var more = new EE();

      var rs = {};
      var streams = csses.concat(absFiles).map(fs.createReadStream)
        .map(function(st) {
          return st.pipe(through(function(chunk, enc, cb) {
            var re = /(?:url *?\(['"]?)([^\)'"]+)[ ,\)'"]+[^;,]*[;,]/;
            var input = chunk.toString("utf8");
            // console.log(input);
            this.push(chunk);
            cb();
          }));
        });

      rs[pkg.name + '.css'] = seq(streams);

      callback(null, rs, more);
    });
  });
};