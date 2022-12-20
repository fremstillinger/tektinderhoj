const fs = require('fs');
const WebSocket = require('ws');
var request = require('request');
var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var saveData = true;
var ws = null;
var isWebsocketOpen = false;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


function openWebsocket() {
	var wsPath = configData.websocketAdress;
	try {
		ws = new WebSocket(wsPath,{ rejectUnauthorized: false});
	} catch (e) {
		console.log(e, wsPath);
	}

	ws.on('open', function() {

		isWebsocketOpen = true;
	});

	ws.on('error', function(e) {

		console.log("websocket error", wsPath)
		ws.close();
		isWebsocketOpen = true;
	});

	ws.on('close', function() {
		isWebsocketOpen = false;
		ws = null;
		console.log("websocket closed, opening in 5 sec...")
		setTimeout(openWecsocket, 5000);
	});
}


openWebsocket();


exports.getReadingTypes = function(callback) {
	var url = "https://" + configData.apiadress + "/api/get/readingTypes/";

	request(url, function(error, response, body) {
		if (error != null) {
console.log(error);
			setTimeout(function() {
				exports.getReadingTypes(callback)
			}, 5000);
			return;
		}


		readingTypes = JSON.parse(body).data;

		if (callback != undefined) {
			callback(readingTypes);
		}
	});
}


exports.logData = function(readingTypeID, sourceID, value) {

	var jsonData = {
		"readingDate": new Date(),
		"readingTypeID": readingTypeID,
		"sourceID": configData.tristartDeviceID,
		"value": value
	};

	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(jsonData));
	}

	if (saveData) {
		var url = "https://" + configData.apiadress + "/api/insert/reading/";
		request.post({
				url: url,
				form: jsonData
			},
			function(err, httpResponse, body) {
				if (err) {
					console.log("could not write readings :/ ")
					console.log(err);
				} else {
					saveData = false;
				}

			});
	}
}

setInterval(toogleSaveData, configData.logInterval * 1000);

function toogleSaveData() {
	saveData = true;
}
