#!/usr/bin/env node

var fs = require('fs');
var request = require('request');
var parse = require('csv-parse');
var prompt = require('prompt');
var file = __dirname + '/config.json';

var configData;
configData = JSON.parse(fs.readFileSync(file, 'utf8'));



var inputFile = __dirname + '/datasources/DMIRep17-02/dk_daily_27080_6132_101.csv';
var lineNo = 1;
var data = [];

var parser = parse({
    delimiter: ';'
}, function(err, d) {
    data = d;
    insertNextLine();
    // when all countries are available,then process them
    // note: array element at index 0 contains the row of headers that we should skip
    
});



function insertNextLine(){
    //for (var i = 1; i < data.length; i++) {
        var line = data[lineNo];

        console.log("inserting " + line + "/" + data.length);
        // create country object out of parsed fields
        var dateTime = new Date();
        dateTime.setFullYear(line[1]);
        dateTime.setMonth(line[2] * 1 - 1);
        dateTime.setDate(line[3]);
        dateTime.setHours(line[4] * 1);
        dateTime.setMinutes(0);
        dateTime.setSeconds(0);
        dateTime.setMilliseconds(0);

        var jsonData = {
            "readingDate": dateTime,
            "readingTypeID": 1,
            "sourceID": 3,
            "value": line[5].replace(",", ".")
        };

   
         lineNo ++;
        request.post({url:"http://localhost:1972/api/insert/reading/", 
            form: jsonData}, 
            function(err,httpResponse,body){ 
                console.log(body);
                insertNextLine();
        });  
    //}
}


var schema = {
    properties: {
        continue: {
            message: 'Du er ved at indsætte ny data i systemet. Vil du fortsætte? (skriv ja eller nej)',
            required: true
        }
    }
};

prompt.get(schema, function(err, result) {

    if (result.continue == "ja") {

        fs.createReadStream(inputFile).pipe(parser);
    } else {
        console.log("afslutter");
        process.exit();
    }

});
prompt.start();

// read the inputFile, feed the contents to the parser