// fad intial
'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');

exports = module.exports = function() {
    var cwd = process.cwd();
    if(fs.existsSync(path.join(cwd, 'fad.config'))){
        console.warn('fad.config is already exists.'.warn);
        return false;
    }

    var config = {
        algorithm: 'md5',
        encoding: 'utf8',

        dist_dir: 'static_dist',
        static_dir: 'static',
        src_pattern: ['templates/*.html'],
        exclude_path: ['http://', 'https://'],
        res_pattern: {
            'html': /staticUrl\s*\(\s*'([^']+)'\s*,\s*'(?:\w{7})?'\s*\)/gi,
            'css': /\(['"]?([^\)]+\.(?:gif|png|jpg|css))['"]?\)/gi,
            'js': /['"]([^'"]+\.(?:css|gif|jpg|png))['"]/gi
        },
        html_hash_update_re: "(staticUrl\\s*\\(\\s*'RES'\\s*,\\s*')(?:\\w{7})?('\\s*\\))",

        seamods_dir: 'static/.build',
        seamods_pattern: '**/*.js',
        seamods_config: "seajs-config.js",
        seamods_id_deps_re: /define\("([^"]+)",\[([^\]]+)\]/,

        symlinks: [],

        remote_domain: 'http://example.com/',
        remote_server: 'user@server',
        remote_shell: 'ssh',
        remote_base_dir: '/home/user',
        remote_dir: 'static',

        grunt_file: 'static/Gruntfile.js',
        grunt_build: 'build',
        grunt_test_dev: 'env:dev',
        grunt_test_local: 'env:local',
        grunt_test_remote: 'env:remote'
    }

    var content = 'exports = module.exports = ' + util.inspect(config, {depth: null });
    fs.writeFileSync(path.join(cwd, 'fad.config'), content);
    console.info('Initial successfully! Create fad.config into ' + cwd)
}
