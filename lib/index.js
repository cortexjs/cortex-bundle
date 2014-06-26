var digdep = require('digdep');
var nconfig = require('neuron-config');
var expand = require('fs-expand');


var jsBundler = require('./bundler/js');

module.exports.bundle = function(pkg, options, callback) {
  if (!pkg) return callback(new Error("Please provide 'pkg'"));

  options = options || {};

  var js = options.js || !options.css;
  var css = options.css || !options.js;

  delete options.js;
  delete options.css;

  var cache_root = options.cache_root || (options.shrinked && options.shrinked.cache_root);
  var built_root = options.built_root || (options.shrinked && options.shrinked.built_root);

  if (!cache_root || !built_root)
    return callback(new Error("'cache_root' and 'built_root' must be provided"));


  digdep(pkg, options, function(err, diggedDeps, tree) {

    if (js) {
      nconfig({
        tree: tree
      }, function(err, config) {
        if (err) return callback(err);

        var prefix = 'neuron.config(' + JSON.stringify(config, null, 2) + ');';

        jsBundler(diggedDeps, )

      });
    }
  });
};