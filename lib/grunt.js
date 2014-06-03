// grunt tool

var utils = require('./utils')

exports.execute = function(task, callback){
    config = utils.loadConfig();
    if(!config){
        return false;
    }
    var cmd = 'grunt --gruntfile ' + config.grunt_file;
    if(task !== ''){
        cmd += ' ' + (config[task] || task);
    }
    // console.info(cmd);
    var exec = require('child_process').exec, child;
    child = exec(cmd, function(error, stdout, stderr){
        if(error){
            console.log(stderr)
        } else if(callback) {
            callback()
        }
    });
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
    });

}