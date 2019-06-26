

const SerialPort = require('serialport')
const ByteLength = require('@serialport/parser-byte-length')

var port = new SerialPort("/dev/cu.usbmodem1421", {
    baudRate: 9600,
    autoOpen: true
});


const parser = port.pipe(new ByteLength({length: 8}))
parser.on('data', console.log) // will have 8 bytes per data event

