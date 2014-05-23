// deploy tool

exports.sync = function(files) {

    config = require(realpath('fad.config'))

    var cmd = [
        'rsync ',
        config.remote_shell ? '-e ' + config.remote_shell : '',
        ' -rt --delete --stats',
    ];

    var exec = require('child_process').exec, child;
    child = exec("rsync -e 'ssh -p 59163' -rt --delete --stats static_dist/ huangwp@192.168.38.227:/home/huangwp/assets/" , function (error, stdout, stderr) {
        if(error){
            console.log(stderr)
        } else {
            console.log(stdout)
        }
    });
}
