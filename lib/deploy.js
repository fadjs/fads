// deploy tool

var path = require("path")
var utils = require('./utils')

exports.deploy = function(options) {
    var config = loadConfig();
    if(!config){
        return false;
    }
    config.remote_server.forEach(function(server){
        var cmd = [
            'rsync ',
            server.remote_shell ? '-e \'' + server.remote_shell + '\'' : '',
            ' -rtP',
            options.sync ? ' --delete' : '',
            ' ' + config.dist_dir + (config.dist_dir.slice(-1) === '/' ? '' : '/'),
            ' ' + server.remote_host,
            ':' + path.join(server.remote_root, server.remote_dir)
        ].join('');
        console.info(('Deploy to remote server: ' + config.dist_dir.verbose + ' ==> ' + server.remote_dir.verbose).underline)
        execute(cmd)
    })
}

exports.upload = function(local_path, options) {
    var config = utils.loadConfig();
    if(!config){
        return false;
    }
    if(!options.dest_dir){
        console.error(utils.helpInfo + ('Error: Remote target directory is not specified.\n').error)
        return false;
    }
    config.remote_server.forEach(function(server){
        var cmd = [
            'rsync ',
            server.remote_shell ? '-e \'' + server.remote_shell + '\'' : '',
            ' -rtP',
            ' ' + local_path,
            ' ' + server.remote_host,
            ':' + path.join(server.remote_root, options.dest_dir)
        ].join('');
        console.info(('Upload local resources to remote server: ' + local_path.verbose + ' ==> ' + options.dest_dir.verbose).underline)
        execute(cmd, 'The resource url is: ' + (server.remote_domain  + (local_path.slice(-1) === '/' ? options.dest_dir : path.join(options.dest_dir, path.basename(local_path)))).info)
    })
}

function execute(cmd, output){
    console.log(cmd);
    var exec = require('child_process').exec, child;
    child = exec(cmd , function (error, stdout, stderr) {
        if(error){
            console.log(stderr)
        } else {
            console.log(stdout)
            if(output){
                console.info(output)
            }
        }
    });
}

function loadConfig(){
    var config = utils.loadConfig();
    if(config){
        if(!config.remote_server || !config.remote_server.length) {
            console.log(utils.helpInfo + 'Error: Remote server is not configured.\n'.error)
            return false;
        }
    }
    return config;
}

