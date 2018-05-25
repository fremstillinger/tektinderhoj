const fs = require('fs');
var request = require('request');


var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));


var SerialPort = require('serialport');

var port = new SerialPort(configData.weatherstationUSBadress, {
  baudRate: 19200,
  autoOpen: false
});
var readingTypes = [];


function updateReadingTypes(){

	var url = "http://" + configData.apiadress + ":" + configData.port + "/api/get/readingTypes/";
    
    request(url, function (error, response, body) {
    	if(error != null){
    		console.log(error);
    		return;
    	}
    	readingTypes = JSON.parse(body).data;
    	console.log(readingTypes);
	});
}

updateReadingTypes();

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }	
 port.write("LOOP\n")
 
});


// on data received from Davis USB logger

port.on('data', function(data){
	// check reading, if not 

	if(data.length != 99){
		console.log("error in data :/ ",data.length,data)
		return;
	}
	console.log("reading:")
	for(var i=0; i<readingTypes.length; i++){
		var hexCombined = "0x";	 	
	 	// read as little endian 
		for(var p=readingTypes[i].davisSerialPacketParameterSize; p>0; p--){
			var hex = data.toString("hex", readingTypes[i].davisSerialPacketOffset+p-1,readingTypes[i].davisSerialPacketOffset+p);
			hexCombined +=hex;
		}
		
		
		var value = parseInt(hexCombined);

		switch(readingTypes[i].shortname){
			case "temp":
			//convert from farenheit to celcius
			value = value/10;
			value = (value-32)* 5/9;
			value = Math.round(value * 10) / 10;
			break;

			case "barometer":
			//convert from hg to hpa
		
			value = value/1000;
			console.log(value);
			break;
			default:
			break;
		}
		console.log(readingTypes[i].readingTypeName,value);


		var jsonData = {
            "readingDate": new Date(),
            "readingTypeID": readingTypes[i].readingTypeID,
            "sourceID": configData.weatherStationSourceID,
            "value": value
        };
   
        request.post({url:"http://" + configData.apiadress + ":" + configData.port + "/api/insert/reading/", 
            form: jsonData}, 
            function(err,httpResponse,body){      
        });  

		//console.log(configData.parameters[i].name,int);

	}
}) 
