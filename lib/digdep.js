var async = require('async');
var shrink = require('cortex-shrinkwrap');
var util = require('util');
var _ = require('underscore');
var expand = require('fs-expand');

module.exports = function(pkg, built_root, options, callback) {
  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};

  built_root = built_root || options.built_root || (options.shrinked && options.shrinked.built_root);


  var traveller = shrink.shrinktree(pkg, built_root, options.shrinked,
    function(err, tree) {

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