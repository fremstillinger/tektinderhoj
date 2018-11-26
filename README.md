# tektinderhoj

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


