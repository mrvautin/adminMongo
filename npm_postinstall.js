/**
 * npm post-install script
 *
 * This script copies adminMongo to root dir, from where `npm i admin-mongo` was called
 */

var fs = require('fs');
var path = require('path');
var ncp = require('ncp').ncp;

console.log('\x1b[1m-= adminMongo Installation wizard =-');
console.log('\x1b[1m--------------------------------------------------------');
console.log('\x1b[33mCopying installed adminMongo from \n\x1b[36m' + path.resolve('./') + '\x1b[33m\nto \n\x1b[36m' + path.resolve('./../') + '\x1b[0m');

var dirDest = './../../';
ncp('./', dirDest, function (err) {
  if (err) {
    console.log('\x1b[31m--------------------------------------------------------');
    console.log('Error occured :(\x1b[0m');
    // Exit (possibly multiple) error lines.
    (typeof err === 'string' ? [err] : err).forEach(function (err) {
      console.log(err);
    });
    process.exit(1);
  }
  console.log('\x1b[1m--------------------------------------------------------');
  console.log('\x1b[32m-= adminMongo successfully installed! =-\x1b[0m');
  // Delete unnecessary `npm_postinstall.js` script in destination folder
  fs.unlinkSync(path.join(dirDest, 'npm_postinstall.js'));
  process.exit(0);
});