var _ = require('underscore');
var async = require('async');
var mkdirp = require('mkdirp');
var expand = require('fs-expand');

var seq = require('seq-stream');
var through = require('through2');

var jsBundler = require('cortex-js-bundler');
var nconfig = require('neuron-config');

module.exports.bundleJs = function(pkg, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};

  var dest = options.dest;
  var outputFile = options.outputFile;
  var cache_root = options.cache_root;
  var built_root = options.built_root;

  async.parallel([
      // looking for main index
      function(cb) {
        if (pkg.main)
          return cb(null, [pkg.name + '.js']);
        else
          fs.exists(path.join(cwd, './index.js'), function(exists) {
            if (exists) return cb(null, [pkg.name + '.js']);
            cb(null, []);
          });
      },
      // looking for entries
      function(cb) {
        if (pkg.entries && pkg.entries.length) {
          expand(pkg.entries, {
            cwd: cwd
          }, function(err, entries) {
            if (err) return cb(err);
            cb(null, entries.map(function(entry) {
              return path.relative(cwd, entry);
            }));
          });
        } else
          cb(null, []);
      }
    ],
    function(err, files) {
      if (err) return callback(err);

      files = _.union.apply(_, files);
      if (!files.length)
        return callback(["Package ", pkg.name, " contains neither main nor entries"]);

      if (files.length > 1 && !dest) {
        return callback("More than one files, 'dest' must be provided");
      }

      jsBundler(pkg, {
        cache_root: cache_root,
        built_root: built_root,
        main_files: files
      }, function(err, map) {
        if (err) return callback(err);
        nconfig({

        }, function() {

        });


        if (dest) {
          for (var file in map) {
            var destFile = path.join(dest, file);
            mkdirp(path.dirname(destFile), function(err) {
              var res = through().pause().queue('// your string\n').end();
              seq(res, map[file]).pipe(fs.createWriteStream(destFile));
              res.resume();
            });
          }
        } else {
          var file = files[0];
          var st = map[file];

          if (outputFile) {
            st.pipe(fs.createWriteStream(outputFile));
          } else
            st.pipe(process.stdout);

        }
      });
    });
};