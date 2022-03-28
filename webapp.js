const mysql = require('mysql');
const fs = require('fs');
const express = require('express');
const bodyParser = require("body-parser");
const app = express();
//app.use(cors());
var Excel = require('exceljs');
var request = require('request');
const WebSocket = require('ws');
const open = require('open');






/* 

setup database

*/

var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var dbOptions = {
    host: configData.database.host,
    user: configData.database.user,
    password: configData.database.password,
    database: configData.database.database,
    connectionLimit: 1000,
    timezone: 'utc'
}

var dbPool = mysql.createPool(dbOptions);

/* 

setup api routings

*/

app.use(bodyParser.urlencoded({
    extended: true
}));


app.use('/', express.static(__dirname + '/public'));

require('./api')(app, dbPool);

app.listen(configData.port, () => {
    if (configData.openURL) {

        (async () => {
            await open(configData.openURL.url, { app: configData.openURL.arguments });
        })();



    }
    console.log('We are live on ' + configData.port);
});

/*

setup websocket for live data

*/

var livedata = [];
var websocketClients = [];


// read ssl certificate

var privateKey = fs.readFileSync(configData.privatekeyPath, 'utf8');
var certificate = fs.readFileSync(configData.fullchainPath, 'utf8');

var credentials = { key: privateKey, cert: certificate };
var https = require('https');

//pass in your credentials to create an https server
var httpsServer = https.createServer(credentials);
httpsServer.listen(configData.websocketPort);


const wss = new WebSocket.Server({ server: httpsServer });


wss.on('connection', function connection(ws) {
    websocketClients.push(ws);
    console.log("connection established");
    sendToAllClients(livedata);
    ws.on("message", function(data) {

        var receivedData = JSON.parse(data);

        var paramExistsInLivedata = false;

        for (var i = 0; i < livedata.length; i++) {
            if (livedata[i].readingTypeID == receivedData.readingTypeID) {
                paramExistsInLivedata = true;
                livedata[i].value = receivedData.value;
            }
        }

        if (!paramExistsInLivedata) {
            livedata.push(receivedData);
        }

        sendToAllClients(livedata)
    });
});

function sendToAllClients(data) {
    for (var i = 0; i < websocketClients.length; i++) {

        try {
            websocketClients[i].send(JSON.stringify(data));
        } catch (e) {
            websocketClients.splice(i, 1);
        }
    }
}