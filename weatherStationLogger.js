const fs = require('fs');
var request = require('request');
var cron = require('cron');
const apiCalls = require('./apiCalls');

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

function updateReadingTypes() {
	apiCalls.getReadingTypes(function(d) {
		readingTypes = d;
	})
};

updateReadingTypes();

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

		setInterval(function() {
			requestReading()
		}, 2000);

	});
}

function requestReading() {
	console.log("requestReading");
	if (!isPortOpen) {
		console.log("port not open")
		return;
	}
	port.write('LPS 0 1\n')
}

openPort();

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
		eval(readingTypes[i].readingConversion);

		/*
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
		*/

		apiCalls.logData(readingTypes[i].readingTypeID, configData.weatherStationSourceID, value);

	}
})