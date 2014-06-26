var async = require('async');
var shrink = require('cortex-shrinkwrap');

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
        cb(null, {
          name: name,
          version: version,
          main: pkg.main,
          css: pkg.css
        });
      });
    }, function(err, deps) {
      if (err) return callback(err);
      // return tree for reuse, private
      callback(null, deps, tree);
    });
  });
};