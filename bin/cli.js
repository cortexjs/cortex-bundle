#!/usr/bin/env node

var readjson = require('read-cortex-json');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
  var pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
}

if (argv.help || argv.h) {
  console.log("Usage: cortex bundle [-o|--output file] [-d|--dest dir] [--cwd cwd] [--with-neuron] [--no-config] [--js] [--css]");
  console.log("\t--o, --output\toutput file");
  console.log("\t--d, --dest\toutput dest directory");
  console.log("\t--lib-only,\tbundled as library, without neuron and neuron config");
  console.log("\t--no-neuron,\tdon't output neuron content");
  console.log("\t--built-root,\tdirectory of cortex build dest");
  console.log("\t--prerelease,\tdirectory of cortex build dest");
  console.log("\t--js\t\tbuild js file");
  console.log("\t--css\t\tbuild css file");
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

var libOnly = !! argv['lib-only'];
var neuron = argv.neuron !== false;
var builtRoot = argv['built-root'] || 'neurons';
var prerelease = argv['prerelease'];

readjson.package_root(cwd, function(cwd) {
  // find cwd
  if (cwd) {
    readjson.enhanced(cwd, function(err, pkg) {
      err && onError(err);


      if(prerelease){
        pkg.version = pkg.version + "-" + prerelease;
      }

      require('..').bundle(pkg, {
        css: css,
        js: js,
        built_root: path.join(cwd, builtRoot),
        libOnly: libOnly,
        neuron: neuron,
        cwd: cwd
      }, function(err, map, more) {
        if (err) return onError(err);

        var keys = Object.keys(map);

        if (!keys.length) {
          return onError("Can not find any files for bundle");
        }

        if (keys.length > 1 && !dest) {
          console.error("More than one files, 'dest' is not provided, './build' will be used as default");
          dest = path.join(cwd, 'build');
        }

        if (dest) {
          keys.forEach(function(file) {
            var destFile = path.join(dest, file);
            mkdirp(path.dirname(destFile), function(err) {
              map[file].pipe(fs.createWriteStream(destFile));
            });
          });
        } else {
          var file = keys[0];
          var st = map[file];

          if (outputFile) {
            st.pipe(fs.createWriteStream(outputFile));
          } else {
            st.pipe(process.stdout);
            process.stdout.on('error', process.exit);
          }
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