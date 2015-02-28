var ngraph = require('neuron-graph');
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
  var libOnly = options.libOnly;
  var neuron = options.neuron;

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

      tree.name = pkg.name;

      if (js) {
        tasks.js = function(cb) {
          ngraph(pkg, {
            shrinkwrap: tree
          }, function(err, conf) {
            if (err) return cb(err);

            var config = {
              loaded: diggedDeps.map(function(dep) {
                return dep.name + '@' + dep.version;
              }),
              path: "",
              graph: conf
            };

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
                var suffix = '';

                if (!libOnly)
                  prefix = 'neuron.config(' + JSON.stringify(config, null, 2) + ');\n\n';

                if (!libOnly && neuron) {
                  suffix = '_use("' + pkg.name + '@' + pkg.version + '",function(){});'
                  neuronjs.content(function(err, content) {
                    if (err) return pre(err);
                    prefix = content + '\n' + prefix;
                    pre(null, prefix, suffix);
                  });
                } else {
                  pre(null, prefix, suffix);
                }
              })(function(err, prefix, suffix) {
                jsBundler(pkg, diggedDeps, built_root, {
                  prefix: prefix,
                  main_files: mainFiles,
                  suffix: suffix
                }, cb);
              });
            });
          });
        };
      }


      var more;
      if (css) {
        tasks.css = function(cb) {
          // read pkg.css
          cssBundler(pkg, diggedDeps, built_root, {
            files: pkg.css
          }, function(err, rs, m) {
            more = m;
            cb(err, rs);
          });
        };
      }

      async.parallel(tasks, function(err, rs) {
        if (err) return callback(err);

        var r;
        for (var p in rs)
          r = _.defaults(r || {}, rs[p]);

        callback(null, r, more);
      });
    });

  return holder;
};