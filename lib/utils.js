// utils

var fs = require('fs');
var path = require('path');
var colors = require('colors');

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

var pkg = require('../package.json');

exports = module.exports = {
    loadConfig: function(){
        if(!fs.existsSync(this.realpath('fad.config'))){
            console.error(this.helpInfo + 'Fatal error: Unable to find fad.config\n')
            return false;
        } else {
            var config = require(this.realpath('fad.config'));
            config.algorithm = config.algorithm || 'md5';
            config.encoding = config.encoding || 'utf8';
            // dynamic require match string convention in src html files:
            // 1st part: directory start with './', relative to staic dir,
            // 2nd part: regexp warp with '/', may contain folder directory,
            // 2 parts separate with comma.
            // e.g. './images', '/abc-\d+\.png$/',
            // matched of './images/abc-1.png', './images/abc-2.png', ...
            config.src_dynamic_pattern = config.src_dynamic_pattern || /['"](\.\/[^'"]+)['"]\s*,\s*['"]\/(.+?)\/['"]/gi
            // dynamic require match string convention in js files:
            // 1st part: directory start with './', relative to staic dir,
            // 2nd part: regexp of path, end with $, may contain folder directory,
            // 2 parts separate with comma.
            // e.g. './images', '/[\w-]+\/abc-\d+\.png$/',
            // matched of './images/abc-1.png', './images/xx/abc-2.png', ...
            config.res_dynamic_pattern = config.res_dynamic_pattern || /['"](\.\/[^'"]+)['"]\s*,\s*\/([^\$]+\$)\//gi
            return config;
        }
    },

    realpath: function() {
        return path.resolve(Array.prototype.reduce.call(arguments, function(parts, part) {
            return path.join(parts, part)
        }, process.cwd()));
    },

    helpInfo: 'Fad: ' + pkg.description + ' (' + pkg.version + ')\n\n'
}
