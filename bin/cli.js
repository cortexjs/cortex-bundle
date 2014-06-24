#!/usr/bin/env node

var readjson = require('read-cortex-json');
var path = require('path');
var async = require('async');
var fs = require('fs');
var mkdirp = require('mkdirp');
var expand = require('fs-expand');
var _ = require('underscore');


var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
  var pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}


var dest = argv.dest || argv.d;


readjson.package_root(process.cwd(), function(cwd) {
  // find cwd
  if (cwd) {
    readjson.read(cwd, function(err, pkg) {
      err && onError(err);

      var profile = require('cortex-profile')();
      profile.init();

      var logger = require('loggie')({
        // export CORTEX_LOG_LEVEL=debug,info,error,warn
        /* jshint sub:true */
        level: process.env['CORTEX_LOG_LEVEL'] || ['info', 'error', 'fatal', 'warn'],
        // if the current process exit before `logger.end()` called, there will throw an error message
        use_exit: false,
        catch_exception: false,
        colors: profile.get('colors')
      });

      async.parallel([

        function(cb) {
          if (pkg.main || fs.existsSync(path.join(cwd, './index.js'))) {
            return cb(null, [pkg.name + '.js']);
          } else
            cb(null, []);
        },
        function(cb) {
          if (pkg.entries && pkg.entries.length) {
            expand(pkg.entries, {
              cwd: cwd
            }, function(err, entries) {
              if (err) return onError(err);
              cb(null, entries.map(function(entry) {
                return path.relative(cwd, entry);
              }));
            });
          } else
            cb(null, []);
        }
      ], function(err, files) {
        files = _.union.apply(_, files);


        if (files.length > 1 && !dest) {
          throw onError("More than one files, 'dest' must be provided");
        }

        async.each(files, function(file, cb) {
          var bundler = require('../')(pkg, profile.get('cache_root'), profile.get('built_root'), {
            mainFile: file
          }, function(err, content) {
            if (err) return cb(err);

            if (dest) {
              var destFile = path.join(dest, file);
              destDir = path.dirname(destFile);
              mkdirp(destDir, function(err) {
                if (err) return cb(err);
                fs.writeFile(destFile, content, function(err) {
                  cb(err);
                });
              });
            } else
              process.stdout.write(content);
          });

        }, function(err) {
          if (err) return onError(err);
        });
      });
    });
  } else {
    onError(new Error("Can not find cortex.json/package.json in path: " + process.cwd()));
  }
});


function onError(err) {
  if (err) {
    process.stderr.write((err.message || err) + "\n");
    err.stack && process.stderr.write(err.stack + "\n");
    process.exit(1);
  }
}