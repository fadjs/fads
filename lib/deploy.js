// deploy tool

var client = require('scp2')

exports.upload = function(files) {
  console.log(files)
  client.scp(files, {
        host: '192.168.38.227',
        port: 59163,
        username: 'huangwp',
        password: '166181',
        path: '/home/huangwp/assets'
    }, function(err) {}
  )

}


