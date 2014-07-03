var nconfig = require('neuron-config');
var expand = require('fs-expand');
var async = require('async');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var EventEmitter = require('events').EventEmitter;

var digdep = require('./digdep');
var jsBundler = require('./bundler/js');
var cssBundler = require('./bundler/css');

module.exports.bundle = function(pkg, options, callback) {
  if (!pkg) return callback(new Error("Please provide 'pkg'"));

  options = options || {};

  var js = options.js || !options.css;
  var css = options.css || !options.js;

  delete options.js;
  delete options.css;

  var built_root = options.built_root || (options.shrinked && options.shrinked.built_root);

  if (!built_root)
    return callback(new Error("'built_root' must be provided"));

  var holder = new EventEmitter();

  digdep(pkg, built_root, options,
    function(err, diggedDeps, tree) {
      if (err) return callback(err);
      var tasks = {};

      if (js) {
        tasks.js = function(cb) {
          nconfig({
            tree: tree
          }, function(err, config) {
            if (err) return cb(err);

            // enhance config
            config._ = {};
            config._[pkg.name] = {};
            config._[pkg.name]["*"] = pkg.version;


            (function(cb) {
              var cpd = path.join(built_root, pkg.name, pkg.version);
              var mainFiles = [];
              if (pkg.main || fs.existsSync(path.join(cpd, pkg.name + '.js'))) {
                mainFiles.push(pkg.name + '.js');
              }

              expand(pkg.entries || [], {
                cwd: cpd
              }, function(err, files) {
                if (err) return cb(err);

                cb(null, mainFiles.concat(files));
              });
            })(function(err, mainFiles) {
              if (err) return cb(err);

              if (!mainFiles.length && !(pkg.css && pkg.css.length))
                return cb("Package '" + pkg.name + "' contains neither main nor entries for js");

              if (!mainFiles.length)
                return cb(null, {});

              var prefix = 'neuron.config(' + JSON.stringify(config, null, 2) + ');\n\n';

              jsBundler(pkg, diggedDeps, built_root, {
                prefix: prefix,
                main_files: mainFiles
              }, cb);
            });
          });
        };
      }

      if (css) {
        tasks.css = function(cb) {
          // read pkg.css
          cssBundler(pkg, diggedDeps, built_root, {
            files: pkg.css
          }, cb);
        };
      }

      async.parallel(tasks, function(err, rs) {
        if (err) return callback(err);

        var r;
        for (var p in rs)
          r = _.defaults(r || {}, rs[p]);

        callback(null, r);
      });
    });

  return holder;
};