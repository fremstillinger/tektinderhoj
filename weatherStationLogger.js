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
openPort();

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
		
	});
}



var timeAtLastDataDump = new Date();
var timeWhenDataWasLastSaved = new Date();

var checkInterval = 10;

setInterval(function() {
	var secondsSinceLastDataDump =  (new Date().getTime()-timeAtLastDataDump.getTime())/1000;
	console.log("seconds since last data dump",secondsSinceLastDataDump);
	if(secondsSinceLastDataDump > checkInterval){
		requestReading();
	}
}, 1000);


function requestReading() {
	if (!isPortOpen) {
		console.log("port not open")
		return;
	}
	port.write('LOOP 1\n')
}

port.on('close', function(err) {
	isPortOpen = false;
	console.log("port closed, trying to open in 5 sec...")
	setTimeout(openPort, 5000);
	openPort();
});

// on data received from Davis USB logger

port.on('data', function(data) {
	timeAtLastDataDump = new Date();
	
	if (data.length != 100) {
		console.log("data corrupted")
		return;
	}

	if (data.toString("hex", 0, 1) != "06") {
console.log("data does not begin with 06");
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

		console.log(readingTypes[i].readingTypeName,value);


		var secondsSinceDataWasLastSaved =  (new Date().getTime()-timeWhenDataWasLastSaved.getTime())/1000;
		
		var saveData = secondsSinceLastDataDump > configData.logInterval;

		apiCalls.logData(readingTypes[i].readingTypeID, configData.weatherStationSourceID, saveData);

		if(saveData){
			timeWhenDataWasLastSaved = new Date();
		}

	}
})
