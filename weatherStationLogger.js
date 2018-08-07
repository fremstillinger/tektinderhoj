const fs = require('fs');
var request = require('request');
const WebSocket = require('ws');
var cron = require('cron');


var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
var isPortOpen = false;


var SerialPort = require('serialport');
var port = new SerialPort(configData.weatherstationUSBadress, {
	baudRate: 19200,
	autoOpen: false
});

var readingTypes = [];

// reload readingtypes every hour
new cron.CronJob({
	cronTime: '* 00 * * * *',
	onTick: updateReadingTypes,
	start: true
});


function updateReadingTypes(callback) {
	var url = "http://" + configData.apiadress + "/api/get/readingTypes/";

	request(url, function(error, response, body) {
		if (error != null) {
			console.log(error);
			console.log("Could not load readingtypes :/ trying again in 5 sec...")

			setTimeout(function() {
				updateReadingTypes(callback)
			}, 5000);

			return;
		}
		readingTypes = JSON.parse(body).data;
		if (callback != undefined) {
			callback();
		}
	});
}


function openPort() {
	if (isPortOpen) {
		return;
	}
	port.open(function(err) {
		if (err) {
			isPortOpen = false;
			console.log(err);
			console.log("Error opening port, trying to open in 10 sec...")
			setTimeout(openPort, 10000);
			return;
		}
		isPortOpen = true;
		console.log("Port open :)")
		requestReading();
	});
}

setInterval(function() {
	requestReading(true)
}, configData.logInterval * 1000);


setInterval(function() {
	requestReading(false)
}, 2000);


var logData = false;

function requestReading(log) {
	logData = log;
	if (!isPortOpen) {
		console.log("port not open")
		return;
	}
	port.write('LPS 0 1\n')
}

updateReadingTypes(openPort);

port.on('close', function(err) {
	isPortOpen = false;
	console.log("port closed, trying to open in 5 sec...")
	setTimeout(openPort, 5000);
	openPort();
});

// on data received from Davis USB logger

port.on('data', function(data) {

	if (data.length != 100) {
		return;
	}

	if (data.toString("hex", 0, 1) != "06") {
		return;
	}

	data = data.slice(1, 99);

	for (var i = 0; i < readingTypes.length; i++) {

		var hexCombined = "0x";
		// skip if packageoffset is not set		
		if (readingTypes[i].davisSerialPacketOffset == null) {
			continue;
		}

		// read as little endian 
		for (var p = readingTypes[i].davisSerialPacketParameterSize; p > 0; p--) {
			var hex = data.toString("hex", readingTypes[i].davisSerialPacketOffset + p - 1, readingTypes[i].davisSerialPacketOffset + p);
			hexCombined += hex;
		}

		var value = parseInt(hexCombined);

		switch (readingTypes[i].shortname) {
			case "temp":
				//convert from farenheit to celcius
				value = value / 10;
				value = (value - 32) * 5 / 9;
				value = Math.round(value * 10) / 10;
				break;

			case "barometer":
				//convert from hg to hpa

				value = value / 1000;
				break;
			default:
				break;
		}

		var jsonData = {
			"readingDate": new Date(),
			"shortname": readingTypes[i].shortname,
			"readingTypeID": readingTypes[i].readingTypeID,
			"readingTypeName": readingTypes[i].readingTypeName,
			"sourceID": configData.weatherStationSourceID,
			"value": value,
			"unit": readingTypes[i].unit
		};

		if (!logData) {
			if (isWebsocketOpen) {
			
				ws.send(JSON.stringify(jsonData));
			}
			else{
				openWecsocket();
			}
			continue;
		}
		
		var url = "http://" + configData.apiadress + "/api/insert/reading/";
		request.post({
				url: url,
				form: jsonData
			},
			function(err, httpResponse, body) {
				if (err) {
					console.log("could not write readings :/ ")
					
				} else {
					
					logData = false;
				}

			});
	}
})


var ws = null;
var isWebsocketOpen = false;

function openWecsocket() {
	var wsPath = 'ws://' + configData.apiadress + ':' + configData.websocketPort;
	try{
	ws = new WebSocket(wsPath);
	}
	catch(e){
		console.log(e,wsPath);

	}

	ws.on('open', function(){
		isWebsocketOpen = true;
	});

	ws.on('close', function() {
		isWebsocketOpen = false;
		ws = null;
		console.log("websocket closed, opening in 5 sec...")
		setTimeout(openWecsocket,5000);
	});
}
	

