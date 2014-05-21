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
    // IMG_exts: 'gif|png|jpg|jpeg|bmp|ico',
    exclude_path: ['http://', 'https://', 'lib/', 'seajs/'],
    res_re: {
        'html': /staticUrl\s*\(\s*'([^']+)'\s*,\s*'(?:\w{7})?'\s*\)/gi,
        'css': /\(['"]?([^\)]+\.(?:gif|png|jpg|css))['"]?\)/gi,
        'js': /['"]([^'"]+\.(?:css|gif|jpg|png))['"]/gi
    },
    html_hash_update_re: "(staticUrl\\s*\\(\\s*'RES'\\s*,\\s*')(?:\\w{7})?('\\s*\\))",

    seamod_id_deps_re: /define\("([^"]+)",\[([^\]]+)\]/
};

var project_dir = '/Users/hwp/Frontend/nodejs/shengyb/';
var static_dir = 'static';
var static_dist = 'static_dist';

var seamods_dir = 'static/dist'


var seamods_files = '**/*.js'


// TODO not full real path, like  'images/' + (flag ? 'a' : 'b') + '.gif' , need map to real path
var realpath_map = {};

var hash_map = {};

var seamods_hash_map = {};

var globOptions = {
    cwd: project_dir
};

exports = module.exports = function(src) {

    var exec = require('child_process').exec, child;
    child = exec('rm -rf /Users/hwp/Frontend/nodejs/shengyb/static_dist', function (error, stdout, stderr) {

        // console.log(src)
        // src.forEach(function(s) {
        //     var files = glob.sync(s, globOptions)
        //     files.map(function(f){
        //         distRes(f)
        //     })
        // })


        var seamods = glob.sync(seamods_files, {cwd: path.join(project_dir, seamods_dir)})
        // console.log(seamods)
        seamods.map(function(f){
            distRes(f, 'seamod')
        })

        //seamods process
        // gen hash map
        seamods.forEach(function(m){
            seamods_hash_map[m.slice(0, -3)] = sha(path.join(static_dist, m))
        })
        console.log(seamods_hash_map)

        seamods.forEach(function(m){
            var content = fs.readFileSync(realpath(path.join(static_dist,m)), options.encoding)
            var match = content.match(options.seamod_id_deps_re)
            if(match) {
                // change id
                var id = match[1];
                content = content.replace(id, suffixModId(id))
                // change dep
                var deps = match[2];
                deps.split(',').map(function(dep){
                    dep = dep.replace(/"/g,'');
                    if(/^\.{1,2}\//.test(dep)){
                        var new_dep = suffixModId(path.join(path.dirname(m), dep));
                        new_dep = path.dirname(dep) + '/' + path.basename(new_dep)
                        //change deps with append hash suffix
                        content = content.replace(new RegExp(dep, "g"), new_dep)
                    }
                })
                var file = realpath(path.join(static_dist, m));
                fs.writeFileSync(file, content);
                // rename mod with append hash suffix
                fs.renameSync(file, suffixHash(file, seamods_hash_map[m.slice(0, -3)]));
                console.info('Update and rename: '.info + m)
            }
        })

        //insert mod hash map into seajs-config.js

    });
};


function suffixModId(id){
    var new_id = id + '_' + seamods_hash_map[id]
    if(id.slice(-3) === '.js'){
        new_id = id.slice(0, -3) + '_' + seamods_hash_map[id.slice(0, -3)] + '.js';
    }
    return new_id;
}

function distRes(file, is_res){

    var dist_file = file;
    if(is_res){
        console.info('DIST-File: '.info + file)
        dist_file = copyRes(file, is_res)
        // res not exists
        if(!dist_file){
            return false;
        }
    }

    res = extractRes(dist_file);
    if(realpath_map[file]){
        res = res.concat(realpath_map[file])
    }
    var replace_list = [];
    res.forEach(function(r){
        if(hash_map[r]){
            replace_list.push([r, is_res && suffixHash(r, hash_map[r])])
            return;
        }
        var dist_r;
        if(Object.keys(options.res_re).indexOf(extname(r)) > -1){
            dist_r = distRes(r, true)
        } else {
            console.info('DIST-IMG: '.info + r)
            dist_r = copyRes(r, file)
        }
        // res not exists
        if(!dist_r){
            return;
        }
        hash_map[r] = sha(dist_r)
        var newPath = suffixHash(r, hash_map[r])
        fs.renameSync(realpath(dist_r), realpath(path.join(path.dirname(dist_r), path.basename(newPath))));

        replace_list.push([r, is_res && newPath])
    })
    if(replace_list.length){
        console.info('UPDATE-File: '.info + dist_file)
        updateFile(dist_file, replace_list)
    }

    return dist_file
}

function copyRes(file, ref){
    var src_dir = static_dir;
    if(ref === 'seamod'){
        src_dir = seamods_dir;
    } else if(ref &&  /^\.{1,2}\//.test(file)){
        file  = path.join(path.dirname(ref), file)
    }
    var src = path.join(src_dir, file)
    var dest = path.join(static_dist, file);
    if(fs.existsSync(realpath(src))){
        copy(src, dest);
        return dest;
    } else {
        console.warn('The resource is not exist: '.warn + src)
        return false;
    }
}


function updateFile(file, replace_list) {
    file = realpath(file)
    var contents = fs.readFileSync(file, options.encoding);

    replace_list.forEach(function(r){
        if(!r[1]){
            r[1] = '$1' + hash_map[r[0]] + '$2';
            r[0] = new RegExp(options.html_hash_update_re.replace('RES', r[0]), "g");
        }
        contents = contents.replace(r[0], r[1]);
    })
    fs.writeFileSync(file, contents);
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
    // var ext_re = options.ext_re_map[ext].join('|').replace('IMG', options.IMG_exts)
    var RES_RE = options.res_re[ext];
    var content = fs.readFileSync(realpath(filepath), options.encoding);
    while(match = RES_RE.exec(content)){
        // console.log(match)
        var r = match[1]
        if(options.exclude_path.some(function (element){return r.indexOf(element) > -1})){
            continue;
        }
        res_list.push(r)
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
