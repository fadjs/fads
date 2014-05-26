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

var helpInfo = 'Fad: ' + pkg.description + ' (' + pkg.version + ')\n\n';

exports = module.exports = {
    loadConfig: function(){
        if(!fs.existsSync(this.realpath('fad.config'))){
            console.error(helpInfo + 'Fatal error: Unable to find fad.config\n')
            return false;
        } else {
            var config = require(this.realpath('fad.config'));
            config.algorithm = config.algorithm || 'md5';
            config.encoding = config.encoding || 'utf8';
            return config;
        }
    },

    realpath: function() {
        return path.resolve(Array.prototype.reduce.call(arguments, function(parts, part) {
            return path.join(parts, part)
        }, process.cwd()));
    }
}
