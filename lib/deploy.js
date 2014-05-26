// deploy tool

var path = require("path")

var config = require('./utils').loadConfig();

exports.deploy = function(options) {

    if(!config){
        return false;
    }

    var cmd = [
        'rsync ',
        config.remote_shell ? '-e \'' + config.remote_shell + '\'' : '',
        ' -rtP',
        options.sync ? ' --delete' : '',
        ' ' + config.dist_dir + (config.dist_dir.slice(-1) === '/' ? '' : '/'),
        ' ' + config.remote_server,
        ':' + path.join(config.remote_base_dir, config.remote_dir)
    ].join('');
    // console.log(cmd);
    console.log(('Deploy to remote server: ' + config.dist_dir.verbose + ' ==> ' + config.remote_dir.verbose).underline)
    var exec = require('child_process').exec, child;
    child = exec(cmd , function (error, stdout, stderr) {
        if(error){
            console.log(stderr)
        } else {
            console.log(stdout)
        }
    });
}
