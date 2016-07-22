/**
 * npm post-install script
 *
 * This script copies adminMongo to root dir, from where `npm i admin-mongo` was called
 */

var fs = require('fs');
var path = require('path');
var ncp = require('ncp').ncp;
var del = require('node-delete');

// __dirname = <root>/node_modules/admin-mongo/lib/
var moduleDir = path.join(__dirname, './../'); // <root>/node_modules/admin-mongo/
var destinationDir = path.join(moduleDir, './../../'); // <root>

try {
  fs.statSync(path.join(moduleDir, './../../', 'node_modules'));
  // adminMongo located under node_modules & right now installing by `npm install admin-mongo`   
  Install();
  // So, we no need to do nothing here, just continue installation process
}
catch (err) {
  // adminMongo cloned from repo and user launched `npm install` or `npm update` (maybe after `npm install admin-mongo`)
  // Now we should figure out how this script was triggered
  try {
    fs.statSync(path.join(moduleDir, 'node_modules', 'admin-mongo'));
    // admin-mongo found in `node_modules` under <root>
    // Script triggered by `npm update`, cause we have unremoved `admin-mongo` folder under node_modules
    npmUpdate();
  }
  catch (err) { // admin-mongo not found in `node_modules` under <root>
    // Script triggered by user launched cmd `npm install`
    npmInstall();
  }
}

// npm i admin-mongo
function Install() {
  console.log('\x1b[1m-=| adminMongo Installation wizard |=-');
  console.log('\x1b[1m--------------------------------------------------------');
  console.log('\x1b[33m-> Copying installed adminMongo from \n\x1b[36m' + moduleDir + '\x1b[33m\nto \n\x1b[36m' + destinationDir + ' \x1b[0m');

  ncp(moduleDir, destinationDir, function (err) {
    if (err) displayError(err);

    console.log('\x1b[1m--------------------------------------------------------');
    console.log('\x1b[33m-> Cleaning after installation...\x1b[0m');

    // Even after cleaning, folder `admin-mongo` will stay under `node_modules`
    del([moduleDir + '*', moduleDir + '*/**'], { force: true }, function (err, paths) {
      if (err) displayError(err);

      // Delete `lib` folder from installed copy of adminMongo
      // del.sync(path.join(destinationDir, 'lib'), { force: true });

      // console.log('\n', paths.join('\n')); // Display paths of deleted files/folders

      console.log('\x1b[32mCompleted successfully!\x1b[0m');
      console.log('\x1b[1m--------------------------------------------------------');
      console.log('\x1b[32m-=| adminMongo successfully installed! |=-\x1b[0m');

      // Everything is okay, so just exit
      process.exit(0);
    });

  });
}

// npm install
function npmInstall() {
  // We no need to copy and delete anything, so just exit
  return process.exit(0);
}

// npm update
function npmUpdate() {
  // We no need to copy and delete anything, so just exit
  return process.exit(0);
}

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