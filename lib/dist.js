// fad distribute tool

// 'use strict';

var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var glob = require("glob")
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
};

var project_dir = '/Users/hwp/Frontend/nodejs/shengyb/';
var static_dir = 'static';
var static_dist = 'static_dist';

// TODO not full real path, like  'images/' + (flag ? 'a' : 'b') + '.gif' , need map to real path
var realpath_map = {};

var hash_map = {};

var globOptions = {
    cwd: project_dir
};

exports = module.exports = function(src, options) {

    var exec = require('child_process').exec, child;
    child = exec('rm -rf /Users/hwp/Frontend/nodejs/shengyb/static_dist', function (error, stdout, stderr) {

        // console.log(src)
        src.forEach(function(s) {
            var files = glob.sync(s, globOptions)
            files.map(distRes)
        })

    });
};

function distRes(file, is_static){

    var dist_file = file;
    if(is_static){
        console.info('DIST-File: '.info + file)
        dist_file = distStatic(file)
        if(!dist_file){
            return false;
        }
    }

    res = extractRes(dist_file);
    var replace_list = [];
    res.forEach(function(r){
        if(is_static && hash_map[r]){
            replace_list.push([r, suffixHash(r, hash_map[r])])
            return;
        }
        if(Object.keys(options.ext_re_map).indexOf(extname(r)) > -1){
            dist_r = distRes(r, true)
        } else {
            console.info('DIST-IMG: '.info + r)
            dist_r = distStatic(r, file)
        }
        if(!dist_r){
            return;
        }
        hash_map[r] = sha(dist_r)
        var newPath = suffixHash(r, hash_map[r])
        fs.renameSync(realpath(dist_r), realpath(path.join(path.dirname(dist_r), path.basename(newPath))));

        replace_list.push([r, newPath])
    })
    if(is_static && replace_list.length){
        console.info('UPDATE-File: '.info + dist_file)
        updateFile(dist_file, replace_list)
    }

    return dist_file
}

function updateFile(file, replace_list) {
    file = realpath(file)
    var contents = fs.readFileSync(file, options.encoding);
    replace_list.forEach(function(r){
        contents = contents.replace(r[0], r[1]);
    })
    fs.writeFileSync(file, contents);
}

function distStatic(file, ref){
    if(ref && file.substr(0, 1) === '.'){
        file  = path.join(path.dirname(ref), file)
    }
    var src = path.join(static_dir, file)
    var dest = path.join(static_dist, file);
    if(fs.existsSync(realpath(src))){
        copy(src, dest);
        return dest;
    } else {
        console.warn('The resource is not exist: '.warn + src)
        return false;
    }
}

function sha(file){
    console.info('HASH-File: '.info + file)
    var shasum = crypto.createHash(options.algorithm);
    shasum.update(fs.readFileSync(realpath(file), options.encoding));
    var d = shasum.digest('hex');
    return d.substr(0, 7);
}

function suffixHash(filepath, hash){
    return path.join(path.dirname(filepath), path.basename(filepath, path.extname(filepath)) + '_' + hash + path.extname(filepath))
}

function extractRes(filepath){
    // console.log(filepath)
    var res_list = [];
    var ext = extname(filepath);
    var ext_re = options.ext_re_map[ext].join('|').replace('IMG', options.IMG_exts)
    // var EXT_RE = new RegExp("[\\w+_\\/\\.:\\-]+\\.(?:" + ext_re + ")", "gi");
    var EXT_RE = new RegExp("[\'\"]\\S+\\.(?:" + ext_re + ")[\'\"]", "gi");
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
