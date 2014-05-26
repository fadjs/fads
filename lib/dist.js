// fad distribute tool, distribute static resources into local dist dir

// 'use strict';

var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var glob = require("glob")

var utils = require('./utils');

// TODO not full real path, like  'images/' + (flag ? 'a' : 'b') + '.gif' , need map to real path
var extra_res_map = {};
// res hash map
var hash_map = {};
// sea modules hash map
var seamods_hash_map = {};

var config;
var realpath = utils.realpath;

exports = module.exports = function() {
    // load config
    config = utils.loadConfig();
    if(!config){
        return false;
    }

    // commmon resources distribute
    config.src_pattern.forEach(function(s) {
        var files = glob.sync(s, {cwd: realpath()})
        console.info('Distribute static resources'.underline)
        files.map(function(f){
            distRes(f)
        })
    })
    // seajs modules distribute
    if(config.seamods_pattern && config.seamods_dir){
        console.info('\nDistribute seajs modules'.underline)
        distSeaMods(glob.sync(config.seamods_pattern, {cwd: realpath(config.seamods_dir)}))
    }
};

// common static resources distribute
function distRes(file, is_res){

    var dist_file = file;
    if(is_res){
        dist_file = copyRes(file, is_res)
        // res not exists
        if(!dist_file){
            return false;
        }
    }

    res = extractRes(dist_file);
    if(extra_res_map[file]){
        res = res.concat(extra_res_map[file])
    }
    var replace_list = [];
    res.forEach(function(r){
        if(hash_map[r]){
            replace_list.push([r, is_res && hashSuffix(r, hash_map[r])])
            return;
        }
        var dist_r;
        if(Object.keys(config.res_pattern).indexOf(extname(r)) > -1){
            dist_r = distRes(r, true)
        } else {
            dist_r = copyRes(r, file)
        }
        // res not exists
        if(!dist_r){
            return;
        }
        hash_map[r] = sha(dist_r)
        var newPath = hashSuffix(r, hash_map[r])
        fs.renameSync(realpath(dist_r), realpath(path.dirname(dist_r), path.basename(newPath)));

        replace_list.push([r, is_res && newPath])
    })
    if(replace_list.length){
        // console.info('Update file: '.verbose + dist_file)
        updateFile(dist_file, replace_list)
    }

    return dist_file
}

// seajs modules distribute
function distSeaMods(seamods){
    seamods.map(function(f){
        distRes(f, 'seamod')
    })
    // gen hash map
    seamods.forEach(function(m){
        seamods_hash_map[m] = sha(path.join(config.dist_dir, m))
    })
    // update sea modules
    seamods.forEach(function(m){
        var content = fs.readFileSync(realpath(config.dist_dir, m), config.encoding)
        var match = content.match(config.seamods_id_deps_re)
        if(match) {
            // change id
            var id = match[1];
            content = content.replace(id, seaHashSuffix(id))
            // change dep
            var deps = match[2];
            deps.split(',').map(function(dep){
                dep = dep.replace(/"/g,'');
                if(/^\.{1,2}\//.test(dep)){
                    var new_dep = seaHashSuffix(path.join(path.dirname(m), dep));
                    new_dep = path.dirname(dep) + '/' + path.basename(new_dep)
                    // change deps with hash suffix
                    content = content.replace(new RegExp(dep, "g"), new_dep)
                }
            })
            var file = realpath(config.dist_dir, m);
            fs.writeFileSync(file, content);
            // rename mod with hash suffix
            fs.renameSync(file, hashSuffix(file, seamods_hash_map[m]));
            // console.info('Update and rename sea module: '.verbose + m)
        }
    })
    //insert sea modules hash map into seajs-config.js
    var seaconf =  glob.sync(config.seamods_config_pattern, {cwd: realpath(config.dist_dir)})
    if(seaconf.length){
        seaconf = realpath(config.dist_dir, seaconf[0]) ;
        var content = fs.readFileSync(seaconf, config.encoding);
        var maps = JSON.stringify(seamods_hash_map, 'null', '\t');
        content = '// sea modules hash map \nseajs.hashmap = ' + maps + '\n\n' + content;
        fs.writeFileSync(seaconf, content);
        console.info('Hash map of sea modules was writed into: ' + path.basename(seaconf))
    }
}

// extract resources from given file
function extractRes(filepath){
    var res_list = [];
    var ext = extname(filepath);
    var re = config.res_pattern[ext];
    var content = fs.readFileSync(realpath(filepath), config.encoding);
    while(match = re.exec(content)){
        var r = match[1]
        if(config.exclude_path.some(function (element){return r.indexOf(element) > -1})){
            continue;
        }
        res_list.push(r)
    }
    return res_list;
}

// copy file from src to dist dir
function copyRes(file, ref){
    var src_dir = config.static_dir;
    if(ref === 'seamod'){
        src_dir = config.seamods_dir;
    } else if(ref &&  /^\.{1,2}\//.test(file)){
        file = path.join(path.dirname(ref), file)
    }
    var src = path.join(src_dir, file)
    var dest = path.join(config.dist_dir, file);
    if(fs.existsSync(realpath(src))){
        copy(src, dest);
        console.info('Resource "' + file + '" distributed.')
        return dest;
    } else {
        console.warn('WRAN: '.warn + 'Resource "' + src.bold.error + '" not exist.')
        return false;
    }
}

// update reference source file with hash suffix
function updateFile(file, replace_list) {
    file = realpath(file)
    var contents = fs.readFileSync(file, config.encoding);

    replace_list.forEach(function(r){
        if(!r[1]){
            r[1] = '$1' + hash_map[r[0]] + '$2';
            r[0] = new RegExp(config.html_hash_update_re.replace('RES', r[0]), "g");
        }
        contents = contents.replace(r[0], r[1]);
    })
    fs.writeFileSync(file, contents);
}

// add hash suffix to resource
function hashSuffix(filepath, hash){
    return path.join(path.dirname(filepath), path.basename(filepath, path.extname(filepath)) + '_' + hash + path.extname(filepath))
}

// add hash suffix to sea module id
function seaHashSuffix(id){
    var new_id;
    if(id.slice(-3) === '.js'){
        new_id = id.slice(0, -3) + '_' + seamods_hash_map[id] + '.js';
    } else {
        new_id = id + '_' + seamods_hash_map[id + '.js']
    }
    return new_id;
}

// hash file
function sha(file){
    // console.info('File hashed: '.verbose + file)
    var shasum = crypto.createHash(config.algorithm);
    shasum.update(fs.readFileSync(realpath(file), config.encoding));
    var d = shasum.digest('hex');
    return d.substr(0, 7);
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
