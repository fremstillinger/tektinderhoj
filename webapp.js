const mysql = require('mysql');
const fs = require('fs');
const express = require('express');
const bodyParser = require("body-parser");
const app = express();
var Excel = require('exceljs');
var request = require('request');


var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

var dbOptions = {
	host: configData.database.host,
	user: configData.database.user,
	password: configData.database.password,
	database: configData.database.database,
	connectionLimit: 1000
}

var dbPool = mysql.createPool(dbOptions);

app.use(bodyParser.urlencoded({
	extended: true
}));


/* download excelfile */

app.get("/api/download/TekTinderhoejDataSet.xlsx", (req, res) => {
	var params = req.query.parameters.split(",")


	var workbook = new Excel.Workbook();
	workbook.creator = 'TEK Tinderhøj';

	workbook.created = new Date();
	workbook.modified = new Date();


	var numDownloaded = 0;


	downloadNextParameter();
	
	function downloadNextParameter() {
		if (numDownloaded == params.length) {
			if (numDownloaded == params.length) {
				workbook.xlsx.write(res)
					.then(function() {
						// done
					});
			}

		} else {

			var url = 'http://' + configData.apiadress + ':' + configData.port + '/api/get/readings/' + params[numDownloaded];
			console.log(url,req.query.startDate,req.query.endDate);
			request({
				url: url,
				formData: {
					startDate: req.query.startDate,
					endDate: req.query.endDate
				},
				json: true
			}, function(error, response, body) {
				
				if (error) {
					res.send(error);
					return;
				} else {
					console.log("param", params[numDownloaded]);
					var ws = workbook.addWorksheet(params[numDownloaded]);
					console.log(body.data);
					ws.addRows(body.data.rows);

					numDownloaded += 1;
					downloadNextParameter();


				}
			});

		}

	}



});


app.use('/', express.static(__dirname + '/public'));

require('./routes')(app, dbPool);

app.get('/*', function(req, res) {
	res.redirect('/');
});

app.listen(configData.port, () => {
	console.log('We are live on ' + configData.port);
});