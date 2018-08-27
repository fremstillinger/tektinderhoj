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


function readVoltage() {

    //rr.registers[8] * v_scale
    //client.readHoldingRegisters(8, 20, function(err, data) {
    client.readHoldingRegisters(0, 20, function(err, data) {



        if (data != undefined) {


            for (var i = 0; i < readingTypes.length; i++) {
                var rt = readingTypes[i];
                if (rt.deviceType == "tristar") {
                    var readingIndex = rt.readingData * 1 - 1;
                    var value = data.data[readingIndex];
                  
                    eval(rt.readingConversion);
                    // function(readingTypeID, sourceID, value) 
                    apiCalls.logData(rt.readingTypeID, configData.tristartDeviceID, value);
                }
            }


            //console.log("Battery voltage, filtered (τ ≈ 2.5s)",data.data[0]*v_scale);


            /*
        	console.log("Battery voltage, filtered (τ ≈ 2.5s)",data.data[0]*v_scale);


        	console.log("Battery sense voltage, filtered (τ ≈ 2.5s)",data.data[1]*v_scale);
        	var a_scale = 139.15*2**(-15);

        	console.log("Array/Load voltage, filtered (τ ≈ 2.5s)",data.data[2]*v_scale);
        	console.log("Charging current, filtered (τ ≈ 2.5s):",data.data[3]*ampScale);
        	var a_sca = 316.67 *2**(-15);
        	console.log("Load current, filtered (τ ≈ 2.5s):",data.data[4]*a_sca);

        	console.log("Battery voltage, slow filter (τ ≈ 25s):",data.data[5]*v_scale);
        	console.log("Heatsink temperature:",data.data[6]);

        	console.log("Ah_t_HI:",data.data[11]*0.1);
        	console.log("State:",data.data[18]);
        	console.log("control_state:",data.data[19]);
        	       
            */
            //readAmp();
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

setInterval(readVoltage, 2000);