const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

var express = require('./app.js');

const{dialog} = require('electron');
const{Menu} = require('electron');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow(){
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1400, height: 800, 'node-integration': false});

    // and load the index.html of the app.
    mainWindow.loadURL('http://' + express.locals.app_host + ':' + express.locals.app_port);

    // max the window
    mainWindow.maximize();

    // Emitted when the window is closed.
    mainWindow.on('closed', function (){
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

        // Create the Application's main menu
    var template = [{
        label: 'Application',
        submenu: [
            {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
            {type: 'separator'},
            {label: 'Quit', accelerator: 'Command+Q', click: function(){ app.quit(); }}
        ]}, {
            label: 'Edit',
            submenu: [
                {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
                {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
                {type: 'separator'},
                {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
                {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
                {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
                {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
            ]}
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// express.on('startedAdminMongo', createWindow);
app.on('ready', function (){
    express.on('startedAdminMongo', function (){
        createWindow();
    });
});

express.on('errorAdminMongo', function (){
    dialog.showErrorBox('Error', 'Error starting adminMongo. Please ensure no other instances are running before trying again.');
    app.quit();
});

// Quit when all windows are closed.
app.on('window-all-closed', function (){
    app.quit();
});

app.on('activate', function (){
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if(mainWindow === null){
        createWindow();
    }
});
