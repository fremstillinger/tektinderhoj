const fs = require('fs');
var request = require('request');
var cron = require('cron');

var isPortOpen = false;

var SerialPort = require('serialport');


var port = new SerialPort("usbAddress", {
	baudRate: 19200,
	autoOpen: false
});



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
		requestReading();
	});
}


setInterval(function() {
	requestReading()
}, 2000);



function requestReading() {
	if (!isPortOpen) {
		console.log("port not open")
		return;
	}

	port.write('LPS 0 1\n')
}

port.on('close', function(err) {
	isPortOpen = false;
	console.log("port closed, trying to open in 5 sec...")
	setTimeout(openPort, 5000);
	openPort();
});

// on data received from device

port.on('data', function(data) {
	

	if (data.length != 100) {
		return;
	}

	data = data.slice(1, 99);

	console.log(data);
	
	console.log(data.toString("hex", 0, 1));


	/*
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

		apiCalls.logData(readingTypes[i].readingTypeID, configData.weatherStationSourceID, value);

	}
	*/
})