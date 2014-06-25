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
      var built_root = profile.get('built_root');

      require('../').bundleJs(pkg, {
        cache_root: cache_root,
        built_root: built_root,
        dest: dest,
        outputFile: outputFile
      }, function(err) {
        if (err) onError(err);
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