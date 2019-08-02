require('app-module-path').addPath('./jiff/node_modules/');
var argv = require('./jiff/node_modules/minimist')(process.argv.slice(2));
if (argv._.length !== 1) {
  console.log('Please specify a server.');
} else {
  require('./'+argv._[0]+'/server.js');
}
