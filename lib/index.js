var ntree = require('neuron-tree');
var expand = require('fs-expand');
var async = require('async');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var neuronjs = require('neuronjs');

var EventEmitter = require('events').EventEmitter;

var digdep = require('./digdep');
var jsBundler = require('./bundler/js');
var cssBundler = require('./bundler/css');

module.exports.bundle = function(pkg, options, callback) {
  if (!pkg) return callback(new Error("Please provide 'pkg'"));

  options = options || {};

  var js = options.js || !options.css;
  var css = options.css;
  var neuron = options.neuron;
  var nconfig = options.config;

  delete options.js;
  delete options.css;
  delete options.neuron;

  var built_root = options.built_root || (options.shrinked && options.shrinked.built_root);

  if (!built_root)
    return callback(new Error("'built_root' must be provided"));

  var holder = new EventEmitter();

  digdep(pkg, built_root, options,
    function(err, diggedDeps, tree) {
      if (err) return callback(err);
      var tasks = {};

      tree.name = pkg.name;

      if (js) {
        tasks.js = function(cb) {
          ntree(pkg, {
            shrinkwrap: tree
          }, function(err, conf) {
            if (err) return cb(err);
            var config = {
              tree: conf
            };

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

              (function(pre) {
                var prefix = '';
                if (nconfig)
                  prefix = 'neuron.config(' + JSON.stringify(config, null, 2) + ');\n\n';

                if (neuron) {
                  neuronjs.content(function(err, content) {
                    if (err) return pre(err);
                    prefix = content + '\n' + prefix;
                    pre(null, prefix);
                  });
                } else {
                  pre(null, prefix);
                }
              })(function(err, prefix) {
                jsBundler(pkg, diggedDeps, built_root, {
                  neuron: options.neuron,
                  prefix: prefix,
                  main_files: mainFiles
                }, cb);
              });
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