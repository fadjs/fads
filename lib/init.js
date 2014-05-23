// fad intial
'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');

exports = module.exports = function() {
    var config = {
        algorithm: 'md5',
        encoding: 'utf8',

        dist_dir: 'static_dist',
        static_dir: 'static',
        src_pattern: ['templates/*.html'],
        exclude_path: ['http://', 'https://', 'lib/', 'seajs/'],
        res_pattern: {
            'html': /staticUrl\s*\(\s*'([^']+)'\s*,\s*'(?:\w{7})?'\s*\)/gi,
            'css': /\(['"]?([^\)]+\.(?:gif|png|jpg|css))['"]?\)/gi,
            'js': /['"]([^'"]+\.(?:css|gif|jpg|png))['"]/gi
        },
        html_hash_update_re: "(staticUrl\\s*\\(\\s*'RES'\\s*,\\s*')(?:\\w{7})?('\\s*\\))",

        seamods_dir: 'static/dist',
        seamods_pattern: '**/*.js',
        seamods_config_pattern: "seajs-config*.js",
        seamods_id_deps_re: /define\("([^"]+)",\[([^\]]+)\]/
    }

    var cwd = process.cwd();
    var content = 'exports = module.exports = ' + util.inspect(config, {depth: null });
    fs.writeFileSync(path.join(cwd, 'fad.config'), content);
    console.log('Initial successfully! Create fad.config into ' + cwd + ' .')
}
