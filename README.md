# TekTinderhøj

This project contains applications for reading, logging and showing data form the TekTinderhøj project.  

## Webserver

The webapp.js contains server which is to be run in a Nodejs enviroment

## Tristar logger
The tristarMorningstarLogger.js file contains application for reading data from the MODBUS output of the Tristar Morningstar charge controller

## Davis Weatherstations Logger

The weatherstationLogger.js file contains the application for reading the parameters of the Davis Weatherstation.


## needs config.json with following parameters

{	
	"port":****, // port of the webserver
	"apiadress":"********", // ip og url to api 
	"weatherstationUSBadress":***, //t
	"tristarUSBadress":"/dev/cu.usbserial", // the USB adress of the tristar controller
	"weatherStationSourceID":1, // the device id of the weatherstation
	"tristartDeviceID":2, // the device id of the tristar controller
	"logInterval":30, // the interval logging data to be stored
	"websocketPort":***, // port of the websocket connection between server and clients
	"database" : {
		"socketPath":"***",
		"host":"***",
		"user":"***",
		"password":"***",
		"database":"***"
	}
}


