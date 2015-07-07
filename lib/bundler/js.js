var async = require('async');
var path = require('path');
var fs = require('fs');
var seq = require('seq-stream');
var through = require('through2');

module.exports = function(pkg, digdeps, built_root, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};

  // output mainFiles
  var mainFiles = options.main_files || [];

  if (!built_root)
    return callback(new Error("'built_root' must be provided"));

  async.map(digdeps || [], function(module, cb) {
      var name = module.name;
      var version = module.version;

      var mainJs = path.resolve(built_root, ['./', name, '/', version, '/', name, '.js'].join(''));
      // check existence
      fs.exists(mainJs, function(exists) {
        if (!exists && module.main) {
          return cb(new Error("Can not find main js '" + mainJs + "' for: " + name + "@" + version));
        }

        cb(null, exists ? mainJs : undefined);
      });
    },
    function(err, files) {
      if (err) return callback(err);
      files = files.filter(Boolean);

      // no mainFiles, use default js file
      if (!mainFiles.length)
        mainFiles.push(pkg.name + '.js');

      // check existense
      async.map(mainFiles.map(function(f) {
        return path.resolve(built_root, ['./', pkg.name, '/', pkg.version, '/', f].join(''));
      }), function(main, cb) {
        fs.exists(main, function(exists) {
          if (!exists) return cb(new Error("Can not find main js '" + main + "' for: " + pkg.name + "@" + pkg.version));
          cb(null, main);
        });
      }, function(err, absFiles) {
        if (err) return callback(err);

        if (err) return callback(err);

        var prefix = options.prefix;
        var suffix = options.suffix;

        var rs = {};

        mainFiles.forEach(function(file, idx) {
          var streams = files.concat(absFiles[idx]).map(function(filepath){
            return fs.createReadStream(filepath);
          });

          var pre, suf;
          if (prefix) {
            pre = through();
            streams.unshift(pre);
          }

          if (suffix) {
            suf = through();
            streams.push(suf);
          }

          rs[file] = seq.apply(null, streams);

          // add prefix
          if (prefix && pre) {
            pre.write(prefix);
            pre.end();
          }

          // append suffix
          if (suffix && suf) {
            suf.write(suffix);
            suf.end();
          }
        });

        callback(null, rs);

      });
    });
};