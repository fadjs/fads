// fad distribute tool, distribute static resources into local dist dir

// 'use strict';

var util = require('util');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');
var glob = require('glob')

var utils = require('./utils');

// res hash map
var hash_map = {};
// hash map of res from src reference files,
// ex. html, view template or assets config json file,
// for generating hashmap.json in HashMapGenerate mode.
var gen_hash_map = {};

// sea modules hash map
var seamods_hash_map = {};
// sea config reference file
var seamods_config_ref = [];

var config;
var realpath = utils.realpath;

var dynamic_require_hash_map_template = [
    '\n\nif(__fad_dynamic_require_hash_map_extend__===undefined){var __fad_dynamic_require_hash_map_extend__=function(a,b){for(var k in b){a[k]=b[k]}}}\n',
    'var __fad_dynamic_require_hash_map__ = __fad_dynamic_require_hash_map__ || {};\n',
    '__fad_dynamic_require_hash_map_extend__(__fad_dynamic_require_hash_map__, MAP)\n'
].join('');

exports = module.exports = function() {
    // load config
    config = utils.loadConfig();
    if(!config){
        return false;
    }

    // commmon resources distribute
    for(var src in config.src_pattern){
        var files = glob.sync(src, {cwd: realpath()})
        console.info('Distribute static resources'.underline)
        files.map(function(f){
            distRes(f, false, config.src_pattern[src]);
        })
    }

    // seajs modules distribute
    if(config.seamods_pattern && config.seamods_dir){
        console.info('\nDistribute seajs modules'.underline)
        distSeaMods(glob.sync(config.seamods_pattern, {cwd: realpath(config.seamods_dir)}))
    }

    // generate hashmap when HashMapGenerate mode
    if(config.mode === 'HashMapGenerate' && config.dist_hashmap){
        generate_hashmap();
    }

    // create syblinks of lib etc. for local test
    if(config.symlinks && config.symlinks.length){
        createSymlinks(config.symlinks)
    }

    // copy resource to dist directory directly
    if(config.copy_libs && config.copy_libs.length){
        copyLib(config.copy_libs)
    }
};

// common static resources distribute
function distRes(file, is_res, pattern){

    var dist_file = file;
    if(is_res){
        dist_file = copyRes(file, is_res)
        // res not exists
        if(!dist_file){
            return false;
        }
    }

    var res = extractRes(dist_file, pattern);
    // path replace list
    var replace_list = [];
    // map of dynamic require res
    var dynamic_res_map = {};
    res.forEach(function(r){
        if(util.isArray(r)){
            r = r[0];
            dynamic_res_map[r] = r;
        }
        var real_r = r, newPath;
        if(is_res && /^\.{1,2}\//.test(r)){
            real_r = path.join(path.dirname(file), r);
        }
        if(hash_map[real_r]){
            newPath = hashSuffix(r, hash_map[real_r]);
            // console.log(('Already Distributed: ' + file).blue);
            replace_list.push([r, is_res && newPath])
            // fix #1, !is_res also work?
            if(pattern && config.mode === 'HashMapGenerate'){
                gen_hash_map[r] = hash_map[real_r];
            }
            if(dynamic_res_map[r]){
                dynamic_res_map[r] = newPath;
            }
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

        if(config.seamods_config  && r === config.seamods_config){
            seamods_config_ref.push(dist_file);
        } else {
            hash_map[real_r] = sha(dist_r)
            if(config.mode === 'HashMapGenerate' && !is_res){
                gen_hash_map[r] = hash_map[real_r];
            }

            newPath = hashSuffix(r, hash_map[real_r])
            if(dynamic_res_map[r]){
                dynamic_res_map[r] = newPath;
            }
            fs.renameSync(realpath(dist_r), realpath(path.dirname(dist_r), path.basename(newPath)));
            replace_list.push([r, is_res && newPath])
        }
    })

    if(replace_list.length && (config.mode === 'HashMapUpdate' || is_res)){
        // console.info('Update file: '.verbose + dist_file)
        updateFile(dist_file, replace_list)
    }

    // append dynamic require res map to given file
    // console.log(dynamic_res_map)
    if(Object.keys(dynamic_res_map).length){
        append_dynamic_hashmap(dist_file, dynamic_res_map)
    }

    return dist_file;
}

// generate hash map json file for HashMapGenerate mode.
function generate_hashmap(){
    var maps = JSON.stringify(gen_hash_map, 'null', '\t');
    var hashmap_file = realpath(config.dist_dir, config.dist_hashmap);
    fs.writeFileSync(hashmap_file, maps);
    console.info('Hash map of resource was generated: ' + config.dist_hashmap)
}

// generate hash map json file for HashMapGenerate mode.
function append_dynamic_hashmap(target_file, hashmap){
    var maps = JSON.stringify(hashmap, 'null', '\t');
    fs.appendFileSync(target_file, dynamic_require_hash_map_template.replace('MAP', maps));
    console.info('Dynamic require resource hash map insert into: ' + target_file)
}

// seajs modules distribute
function distSeaMods(seamods){
    seamods.map(function(f){
        distRes(f, 'seamod')
    })
    // update sea modules
    seamods.map(hashSeamod)

    // insert sea modules hash map into seajs-config.js
    if(config.seamods_config){
        var seaconf = realpath(config.dist_dir, config.seamods_config);
        var content = fs.readFileSync(seaconf, config.encoding);
        var maps = JSON.stringify(seamods_hash_map, 'null', '\t');
        content = '// sea modules hash map \nseajs.hashmap = ' + maps + '\n\n' + content;
        fs.writeFileSync(seaconf, content);
        console.info('Hash map of sea modules was writed into: ' + path.basename(seaconf))
        // rename config file with hash suffix
        hash_map[config.seamods_config] = sha(path.join(config.dist_dir, config.seamods_config));
        fs.renameSync(seaconf, hashSuffix(seaconf, hash_map[config.seamods_config]));
        // update seaconf ref files
        if(config.mode === 'HashMapUpdate'){
            seamods_config_ref.forEach(function(f){
                updateFile(f, [[config.seamods_config]])
            })
        } else {
            gen_hash_map[config.seamods_config] = hash_map[config.seamods_config];
        }
    }
}

function hashSeamod(mod){
    if(mod.slice(-3) !== '.js'){
        mod += '.js'
    }
    if(seamods_hash_map[mod]){
        return;
    }
    var content = fs.readFileSync(realpath(config.dist_dir, mod), config.encoding)
    var match = content.match(config.seamods_id_deps_re)
    if(match) {
        // find id
        var id = match[1];
        // find dep
        var deps = match[2];
        deps.split(',').map(function(dep){
            dep = dep.replace(/"/g,'');
            if(/^\.{1,2}\//.test(dep)){
                var modfile = path.join(path.dirname(mod), dep);
                // update deps recursively
                hashSeamod(modfile)
                var new_dep = seaHashSuffix(modfile);
                new_dep = path.dirname(dep) + '/' + path.basename(new_dep)
                // change deps with hash suffix
                dep = dep.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
                content = content.replace(new RegExp('"' + dep + '"', 'g'), '"' + new_dep + '"')
            }
        })
        var file = realpath(config.dist_dir, mod);
        // fs.writeFileSync(file, content);
        seamods_hash_map[mod] = sha(content, true)
        // update mod id
        content = content.replace(id, seaHashSuffix(id))
        fs.writeFileSync(file, content);
        // rename mod with hash suffix
        fs.renameSync(file, hashSuffix(file, seamods_hash_map[mod]));
        // console.info('Update and rename sea module: '.verbose + m)
    }
}

// extract resources from given file
function extractRes(filepath, re){
    var res_list = [], dynamic_re, is_res;
    if(!re){
        var ext = extname(filepath);
        re = config.res_pattern[ext];
        dynamic_re = config.res_dynamic_pattern;
        is_res = true;
    } else {
        dynamic_re = config.src_dynamic_pattern;
    }
    var content = fs.readFileSync(realpath(filepath), config.encoding);
    var matches;
    while(matches = re.exec(content)){
        var r = matches[1]
        if(config.exclude_path.some(function (element){return r.indexOf(element) > -1})){
            continue;
        }
        res_list.push(r)
    }

    // dynamic require in src html files
    while(matches = dynamic_re.exec(content)){
        var dynamic_res = extractDynamicRes(matches[1], new RegExp(matches[2]), is_res);
        Array.prototype.push.apply(res_list, dynamic_res);
    }

    return res_list;
}

// extract dynamic require resources with given RegExp
function extractDynamicRes(dir, re, is_res){
    var glob_pattern = dir.replace(/\/$/, '') + '/*.*';
    return glob.sync(glob_pattern, {cwd: realpath(config.static_dir)}).filter(function(file){
        return re.test(file)
    }).map(function(file){
        file = file.replace(/^\.\//, '');
        if(is_res) {
            file = [file];
        }
        return file;
    })
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
    if(fs.existsSync(realpath(dest))){
        // console.log(('Already Distributed: ' + file).blue);
        return dest;
    }
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
            r[0] = new RegExp(config.html_hash_update_re.replace('RES', r[0]), 'g');
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

// create sybmlinks for local test
function createSymlinks(symlinks){
    var exec = require('child_process').exec, child;
    for (var i = 0; i < symlinks.length; i++) {
        var sl = symlinks[i];
        if(!fs.existsSync(realpath(path.join(config.dist_dir, sl)))){
            var cmd = [
                'ln -s ',
                realpath(path.join(config.static_dir, sl)),
                ' ' + path.join(config.dist_dir, sl)
            ].join('')
            child = exec(cmd);
            console.info('Symbolic link "' + sl + '" is created')
        }
    }
}

// copy libs to dist dir
function copyLib(libs){
    var exec = require('child_process').exec, child;
    for (var i = 0; i < libs.length; i++) {
        var cmd = [
            'rm -rf ',
            path.join(config.dist_dir, libs[i]),
            ' && cp -r ',
            path.join(config.static_dir, libs[i]),
            ' ' + config.dist_dir
        ].join('');
        child = exec(cmd);
        console.info('Lib "' + libs[i] + '" has copied to dist dir.')
    }
}

// hash file
function sha(file, isString){
    var shasum = crypto.createHash(config.algorithm);
    if(!isString){
        // console.info('File hashed: '.verbose + file)
        file = fs.readFileSync(realpath(file))
    }
    shasum.update(file, config.encoding);
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
