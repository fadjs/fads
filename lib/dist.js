// fad hashres tool

// 'use strict';

var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var glob = require("glob")

var options = {
    algorithm: 'md5',
    encoding: 'utf8',
    IMG_exts: 'gif|png|jpg|jpeg|bmp|ico',
    exclude_path: ['http://', 'https://', 'lib/', 'seajs/'],
    ext_re_map: {
        'html': ['js', 'css', 'IMG'],
        'css': ['IMG', 'css'],
        'js': ['IMG', 'css']
    }
    // map_tpl: path.join(__dirname, 'map.tpl'),
    // MAP_BLOCK_RE: /\/\*map start\*\/[\s\S]*\/\*map end\*\//,
};

var project_dir = '/Users/hwp/Frontend/nodejs/shengyb/';
var static_dir = 'static';
var static_dist = 'dist';

// file reference map
var ref_map = {};
// not full real path, like  'images/' + (flag ? 'a' : 'b') + '.gif' , need calculate
var calc_path_map = {};

var globOptions = {
    cwd: project_dir
};

exports = module.exports = function(src, options) {
    // console.log(src)

    // Iterate over all specified file groups.
    src.forEach(function(s) {
        var files = glob.sync(s, globOptions)
        files.map(hashRes)
    })
    // console.log(ref_map)
};

var hash_map = {};
function hashRes(file, is_static){
    console.log(is_static)
    console.log('++ ' + file)

    //copy file to tmp
    var dist_file;
    if(is_static){
       dist_file = distStatic(file)
    }

    res = extractRes(dist_file || file);
    res.forEach(function(r){
        if(hash_map[r]){
            // update(file)
            console.log('update: ' + dist_file)
            return;
        }
        console.log(file + ':-- ' + r)
        if(Object.keys(options.ext_re_map).indexOf(extname(r)) > -1){
            hashRes(r, true)
        }

        // update(file)
        console.log('update: ' + dist_file)
    })
    // hash file
    hash_map[file] = sha(dist_file || file);
    console.log('hash: ' + file)
}

function updateFile(file) {

}

function distStatic(file){
    var src = path.join(static_dir, file)
    var dest = path.join(static_dist, file);
    copy(src, dest);
    return dest;
}

function sha(file){
    var shasum = crypto.createHash(options.algorithm);
    shasum.update(fs.readFileSync(realpath(file), options.encoding));
    var d = shasum.digest('hex');
    console.log(d.substr(0, 7))
    return d;
}

function extractRes(filepath){
    // console.log(filepath)
    var res_list = [];
    var ext = extname(filepath);
    var ext_re = options.ext_re_map[ext].join('|').replace('IMG', options.IMG_exts)
    // var EXT_RE = new RegExp("[\\w+_\\/\\.:\\-]+\\.(?:" + ext_re + ")", "gi");
    var EXT_RE = new RegExp("[\'\"]\\S+\\.(?:" + ext_re + ")[\'\"]", "gi");
    // console.log(realpath(filepath))
    var content = fs.readFileSync(realpath(filepath), options.encoding);
    var res = content.match(EXT_RE)

    if(res){
        res.forEach(function(r){
            if(options.exclude_path.length){
                if(options.exclude_path.some(function (element){return r.indexOf(element) > -1})){
                    return false;
                }
            }
            res_list.push(r.substr(1).slice(0, -1))
        })
    }
    return res_list;
}

function realpath(filepath) {
    return globOptions.cwd ? path.join(globOptions.cwd, filepath) : filepath;
}

function extname(filepath){
    return path.extname(filepath).substr(1);
}

function copy(src, dest){
    // src = realpath(src)
    var contents = fs.readFileSync(realpath(src));
    dest = realpath(dest)
    mkdir(path.dirname(dest));
    fs.writeFileSync(dest, contents);
}

var pathSeparatorRe = /[\/\\]/g;
// Like mkdir -p. Create a directory and any intermediary directories. from grunt
function mkdir(dirpath, mode) {
  // Set directory mode in a strict-mode-friendly way.
    if (mode == null) {
        mode = parseInt('0777', 8) & (~process.umask());
    }
    dirpath.split(pathSeparatorRe).reduce(function(parts, part) {
        parts += part + '/';
        var subpath = path.resolve(parts);
        if (!fs.existsSync(subpath)) {
            fs.mkdirSync(subpath, mode);
        }
        return parts;
    }, '');
}
