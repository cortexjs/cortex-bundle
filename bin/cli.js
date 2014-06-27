#!/usr/bin/env node

var readjson = require('read-cortex-json');
var path = require('path');
var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
  var pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}


if (argv.help || argv.h) {
  console.log("Usage: cortex bundle [-o|--output file] [-d|--dest dir] [--cwd cwd] [--js] [--css]");

  process.exit(0);
}

var cwd = argv.cwd || process.cwd();

var dest = argv.dest || argv.d;
if (dest) {
  dest = path.resolve(cwd, dest);
  if (!fs.existsSync(dest)) {
    onError("'dest' does not exists: " + dest);
  }
}

var outputFile = argv.o || argv.output;
if (outputFile)
  outputFile = path.resolve(cwd, outputFile);



var js = argv.js || !argv.css;
var css = argv.css || !argv.js;

readjson.package_root(cwd, function(cwd) {
  // find cwd
  if (cwd) {
    readjson.read(cwd, function(err, pkg) {
      err && onError(err);

      var profile = require('cortex-profile')();
      profile.init();

      var cache_root = profile.get('cache_root');

      require('../lib').bundle(pkg, {
        cache_root: cache_root,
        built_root: path.join(cwd, 'neurons'),
        cwd: cwd
      }, function(err, map) {
        if (err) return onError(err);

        var keys = Object.keys(map);

        if (!keys.length) {
          return onError("Can not find any files for bundle");
        }

        if (keys.length > 1 && !dest) {
          return onError("More than one files, 'dest' must be provided");
        }


        if (dest) {
          for (var file in map) {
            var destFile = path.join(dest, file);
            mkdirp(path.dirname(destFile), function(err) {
              map[file].pipe(fs.createWriteStream(destFile));
            });
          }
        } else {
          var file = keys[0];
          var st = map[file];

          if (outputFile) {
            st.pipe(fs.createWriteStream(outputFile));
          } else
            st.pipe(process.stdout);
        }
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