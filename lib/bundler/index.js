module.exports = function(pkg, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};

  var cache_root = options.cache_root || (options.shrinked && options.shrinked.cache_root);
  var built_root = options.built_root || (options.shrinked && options.shrinked.built_root);


  // whether package neuron
  var neuron = options.neuron;

  if (!cache_root || !built_root)
    return callback(new Error("'cache_root' and 'built_root' must be provided"));


  var traveller = shrink.shrinktree(pkg, _.defaults({
    cache_root: cache_root,
    built_root: built_root
  }, options.shrinked), function(err, tree) {

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

      var mainFiles = options.main_files || [];

      if (!mainFiles.length)
        mainFiles.push(pkg.name + '.js');

      // check existense
      async.map(mainFiles.map(function(f) {
        return path.resolve(built_root, ['./', pkg.name, '/', pkg.version, '/', f].join(''));
      }), function(main, cb) {
        fs.exists(main, function(exists) {
          if (!exists) return callback(new Error("Can not find main js '" + main + "' for: " + pkg.name + "@" + pkg.version));
          cb(null, main);
        });
      }, function(err, absFiles) {
        if (err) return callback(err);
        nconfig({
          tree: tree
        }, function(err, config) {
          if (err) return callback(err);

          var rs = {};

          mainFiles.forEach(function(file, idx) {
            var streams = files.map(fs.createReadStream).concat(fs.createReadStream(absFiles[idx]));
            var res = through();

            streams.unshift(res);
            rs[file] = seq.apply(null, streams);
            res.write('//neuron config\nneuron.config(' + JSON.stringify(config) + ');\n\n');
            res.end();
          });

          callback(null, rs);
        });
      });
    });
  });
};