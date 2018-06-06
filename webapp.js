const mysql = require('mysql');
const fs = require('fs');
const express = require('express');
const bodyParser = require("body-parser");
const app = express();
var Excel = require('exceljs');
var request = require('request');
const WebSocket = require('ws');

/* 

setup database

*/ 

var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var dbOptions = {
	host: configData.database.host,
	user: configData.database.user,
	password: configData.database.password,
	database: configData.database.database,
	connectionLimit: 1000
}

var dbPool = mysql.createPool(dbOptions);


/* 

setup api routings

*/ 

app.use(bodyParser.urlencoded({
	extended: true
}));


app.use('/', express.static(__dirname + '/public'));

require('./routes')(app, dbPool);

app.get('/*', function(req, res) {
	res.redirect('/');
});

app.listen(configData.port, () => {
	console.log('We are live on ' + configData.port);
});

/*

setup websocket for live data

*/


var livedata = [];


var websocketClients = [];

const wss = new WebSocket.Server({ port: configData.websocketPort });

wss.on('connection', function connection(ws) {
	websocketClients.push(ws);
	sendToAllClients(livedata);
	ws.on("message",function(data){
		var receivedData = JSON.parse(data);
	
		var paramExistsInLivedata = false;
		for(var i=0; i<livedata.length; i++){
			if(livedata[i].shortname == receivedData.shortname){
				paramExistsInLivedata = true;
				livedata[i].value = receivedData.value;
			}
		}
		if(!paramExistsInLivedata){
			livedata.push(receivedData);
		}
		sendToAllClients(livedata)
	});
});


function sendToAllClients(data){
	for(var i=0; i<websocketClients.length; i++){

		try{
			websocketClients[i].send(JSON.stringify(data));
		}
		catch(e){
			 websocketClients.splice(i,1);
		
		}
	}
}