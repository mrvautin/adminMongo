/**
 * npm post-install script
 *
 * This script copies adminMongo to root dir, from where `npm i admin-mongo` was called
 */

var path = require('path');
var ncp = require('ncp').ncp;
var del = require('node-delete');

// __dirname = <root>/node_modules/admin-mongo/lib/
var currentDir = path.join(__dirname, './../'); // <root>/node_modules/admin-mongo/
var destinationDir = path.join(currentDir, './../../'); // <root>
var toCleanDir = path.join(currentDir, './../admin-mongo-fork/'); // Delete all children and the parent

console.log('\x1b[1m-= adminMongo Installation wizard =-');
console.log('\x1b[1m--------------------------------------------------------');
console.log('\x1b[33mCopying installed adminMongo from \n\x1b[36m' + currentDir + '\x1b[33m\nto \n\x1b[36m' + path.resolve(destinationDir) + '\x1b[0m');

// Copy
ncp(currentDir, destinationDir, function (err) {
  if (err) displayError(err);

  console.log('\x1b[1m--------------------------------------------------------');
  console.log('\x1b[33m-> Cleaning after installation...\x1b[0m');
  del([toCleanDir + '*', toCleanDir + '*/**'], {force: true}, function (err, paths) {
    if (err) displayError(err);
    
    // Delete `lib` folder from installed copy of adminMongo
    del.sync(path.join(destinationDir, 'lib'), {force: true});

    // console.log('\n', paths.join('\n')); // Display paths of deleted files/folders

    console.log('\x1b[32m-> Completed successfully!\x1b[0m');
    console.log('\x1b[1m--------------------------------------------------------');
    console.log('\x1b[32m-= adminMongo successfully installed! =-\x1b[0m');

    // Everything is okay, so just exit
    process.exit(0);
  });

});

function displayError(err, willExit) {
  willExit = (willExit === undefined) ? true : willExit; // Set defaut to `true`
  console.log('\x1b[1m--------------------------------------------------------');
  console.log('\x1b[31mError occured :(');
  // Possibly multiple error lines.
  //TODO: Fix something here (typeof err === 'string' ? [err] : err).forEach(function (err) {
    console.log(err);
  // });
  console.log('\x1b[0m'); // Set back default console colors
  if (willExit) process.exit(1);
}