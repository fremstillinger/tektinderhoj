var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
const fs = require('fs');
const WebSocket = require('ws');
const apiCalls = require('./apiCalls');
var cron = require('cron');

// reload readingtypes every hour
new cron.CronJob({
    cronTime: '* 00 * * * *',
    onTick: updateReadingTypes,
    start: true
});


var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

// open connection to a serial port
client.connectRTUBuffered(configData.tristarUSBadress, {
    baudRate: 9600
});

client.setID(1);

var v_scale = 96.667 * 2 ** (-15);
var ampScale = 66.667 * 2 ** (-15);

function doReading() {
  
    client.readHoldingRegisters(0, 50, function(err, data) {
           
        if (data != undefined) {

            for (var i = 0; i < readingTypes.length; i++) {
                var rt = readingTypes[i];
                if (rt.deviceType == "tristar") {
                    var readingIndex = rt.readingData * 1 - 1;
                    var value = data.data[readingIndex];
                  
                    eval(rt.readingConversion);
                    console.log(value);
                    apiCalls.logData(rt.readingTypeID, configData.tristartDeviceID, value);
                }
            }

        }
    });
}

var readingTypes = [];

function updateReadingTypes() {
    apiCalls.getReadingTypes(function(d) {
        readingTypes = d;
    })
};

updateReadingTypes();

setInterval(doReading, 2000);
