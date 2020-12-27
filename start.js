require('app-module-path').addPath('./jiff/node_modules/');
const argv = require('minimist')(process.argv.slice(2))._;
if (argv.length === 0) {
  console.log('Please specify a server.');
} else {
  require('./'+argv[0]+'/server.js');
}
