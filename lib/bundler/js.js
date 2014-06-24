var async = require('async');
var path = require('path');
var fs = require('fs');
var through = require('through2');

var shrink = require('cortex-shrinkwrap');


module.exports = function(pkg, cache_root, built_root, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  if (!cache_root || !built_root)
    return callback(new Error("'cache_root' and 'built_root' must be provided"));

  options = options || {};

  var traveller = shrink.shrinktree(pkg, cache_root, options.shrinked || {}, function(err, tree) {
    if (err) return callback(err);

    tree.name = pkg.name;
    var sorted = [];

    try {
      sorted = traveller.topsort(tree);
    } catch (e) {
      // cycle detected
      return callback(e);
    }

    // remove root pkg
    sorted.shift();



    async.map(sorted.reverse(), function(module, cb) {
      var m = module.split('@');
      var name = m[0];
      var version = m[1];
      // cached
      traveller.resolvePackage(name, version, function(err, pkg) {
        if (err) return cb(err);
        // only bundle packages that has main js file
        var mainJs = path.resolve(built_root, ['./', name, '/', version, '/', name, '.js'].join(''));
        fs.exists(mainJs, function(exists) {
          if (!exists)
            return cb(new Error("Can not find main js '" + mainJs + "' for: " + name + "@" + version));

          cb(null, mainJs);
        });
      });
    }, function(err, files) {
      if (err) return callback(err);


      // build package, use options.mainFile or mainJs in built_root
      var mainJs = path.resolve(built_root, ['./', pkg.name, '/', pkg.version, '/', options.mainFile || (pkg.name + '.js')].join(''));
      fs.exists(mainJs, function(exists) {
        if (!exists) {
          return callback(new Error("Can not find main js '" + mainJs + "' for: " + pkg.name + "@" + pkg.version));
        }

        files.push(mainJs);

        var st = through();

        callback(null, st);

        appendNext();

        function appendNext() {
          var f = files.pop();
          if (f) {
            var fst = fs.createReadStream(f);
            fst.on('data', function(chunk) {
              st.write(chunk);
            });

            fs.on('end', appendNext);
          }
        }
      });
    });
  });

  return traveller;
};