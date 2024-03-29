var moment = require('moment');
const fs = require('fs');
var Excel = require('exceljs');
var request = require('request');
const url = require('url');

var configData = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));

module.exports = function(app, dbPool) {

	/* download excelfile */

	app.get("/api/downloadDataset/", (req, res) => {



		var params = req.query.parameters.split(",")

		res.setHeader('Content-disposition', 'attachment; filename=TinderhoejData(' + params.join("+") + ')_fra_' + moment(new Date(req.query.startDate)).format("DD/MM/YYYY") + '_til_' + moment(new Date(req.query.endDate)).format("DD/MM/YYYY") + '.xlsx');


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
				var url = 'http://' + configData.apiadress + '/api/get/readings/' + params[numDownloaded];
				request({
					url: url,
					qs: {
						startDate: req.query.startDate,
						endDate: req.query.endDate
					},
					json: true
				}, function(error, response, body) {
					if (error) {
						res.send(error);
						return;
					} else {
						var ws = workbook.addWorksheet(params[numDownloaded]);
						ws.columns = [{
							header: 'Tidspunkt',
							key: 'scale',
							width: 30
						}, {
							header: 'Værdi',
							key: 'value',
							width: 30,
							outlineLevel: 1
						}];

						if (body.data.rows.length > 0) {
							ws.columns[1].header = body.data.rows[0].readingTypeName;
						}

						ws.addRows(body.data.rows);
						numDownloaded += 1;
						downloadNextParameter();
					}
				});

			}

		}



	});



	/**
	 * get reading types
	 */

	app.get("/api/get/readingTypes/", (req, res) => {

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}

			db.query("SELECT * FROM readingTypes", function(err, rows) {
				db.release();

				if (!err) {
					sendData(res, true, rows);
				} else {
					sendData(res, false, err);
				}
			})
		});
	})



	/**
	 * Get readings by type / timespan
	 */

	app.get('/api/get/readings/:readingTypeShortName', (req, res) => {

		var startDate = moment(new Date());
		if (req.query.startDate != undefined) {
			startDate = moment(new Date(req.query.startDate));

		}
		var endDate = moment(new Date());

		if (req.query.endDate != undefined) {
			endDate = moment(new Date(req.query.endDate));
		}

		var daysSpan = (endDate - startDate) / 1000 / 60 / 60 / 24;
		startDate = startDate.startOf('day');
		endDate = endDate.endOf('day');

		//var groupBy = "DATE_FORMAT(readingDate, '%Y-%m-%d %H:%i:%S')";
		//var groupBy = "DATE_FORMAT(readingDate, '%Y-%m-%d %H:%i')";
		//var groupBy = 'Round(date_format(readingDate, "%i") / (15*60))';

		var groupBy = "CONCAT(LPAD(day(readingDate),2,'0'),'-',LPAD(month(readingDate),2,'0'),'-',year(readingDate),' ',LPAD(HOUR( readingDate),2,'0'),':',LPAD(FLOOR(MINUTE( readingDate ) / 15 )*15,2,'0'))";

		if (daysSpan > 365 * 50) {
			startDate = startDate.startOf('year');
			startDate.year(Math.floor(startDate.year() / 10) * 10);
			endDate = endDate.endOf('year');
			endDate.year(Math.ceil(endDate.year() / 10) * 10);
			groupBy = "CEIL(YEAR(readingDate)/10)*10";
		} else if (daysSpan > 365 * 25) {
			startDate = startDate.startOf('year');
			startDate.year(Math.floor(startDate.year() / 10) * 10);
			endDate = endDate.endOf('year');
			endDate.year(Math.ceil(endDate.year() / 10) * 10);
			groupBy = "CEIL(YEAR(readingDate)/5)*5";
		} else if (daysSpan > 365 * 5) {
			//startDate = startDate
			//startDate.setFullYear(startDate.getFullYear())
			startDate = startDate.startOf('year');
			startDate.year(Math.floor(startDate.year() / 10) * 10);
			endDate = endDate.endOf('year');
			groupBy = "CEIL(YEAR(readingDate))";

		} else if (daysSpan > 365) {
			groupBy = "CONCAT(LPAD(MONTH(readingDate),2,0),'-',YEAR(readingDate))";
		} else if (daysSpan > 30) {
			groupBy = "CONCAT(LPAD(DAY(readingDate),2,0),'-',LPAD(MONTH(readingDate),2,0),'-',YEAR(readingDate))";
		} else if (daysSpan > 1) {
			groupBy = "CONCAT(LPAD(day(readingDate),2,0),'-',LPAD(month(readingDate),2,0),'-',year(readingDate),' ',LPAD(HOUR( readingDate ),2,0),':00')";
		}

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}

			var query = 'SELECT ' + groupBy + '  as scale, readings.readingDate,readingTypes.readingTypeName,ROUND(AVG(readings.value),1) as value,readings.value as origValue,sources.sourceName,readingTypes.unit FROM readings LEFT JOIN sources ON sources.sourceID = readings.sourceID LEFT JOIN readingTypes ON readingTypes.readingTypeID = readings.readingTypeID WHERE readingTypes.shortname=? AND readingDate BETWEEN ? AND ? GROUP BY scale ORDER BY readingDate ';

			db.query(query, [req.params.readingTypeShortName, startDate.toDate(), endDate.toDate()], function(err, rows, fields) {

				db.release();
				if (err) {
					sendData(res, 0, err);


				} else {
					var obj = {
						fields: fields,
						rows: rows
					}
					sendData(res, true, obj);

				}
			});
		})
	});


	/**
	 * Get latest reading by readingTypeID
	 */


	app.get('/api/get/latestReadingByReadingTypeID/:readingTypeID', (req, res) => {

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}

			var query = 'SELECT *  FROM readings INNER JOIN readingTypes ON readingTypes.readingTypeID = readings.readingTypeID  WHERE readings.readingTypeID=? ORDER BY readingDate DESC LIMIT 0,1';

			db.query(query, [req.params.readingTypeID], function(err, rows, fields) {

				db.release();
				if (err) {
					sendData(res, 0, err);
				} else {
					var obj = {
						fields: fields,
						rows: rows
					}
					sendData(res, true, obj);
				}
			});
		})
	});



	/**
	 * Get latest reading by shortname
	 */

	app.get('/api/get/latestReading/:readingTypeShortName', (req, res) => {

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}

			var query = 'SELECT readings.readingDate,readingTypes.readingTypeName,readingTypes.shortname,readings.value,sources.sourceName,readingTypes.unit  FROM readings LEFT JOIN sources ON sources.sourceID = readings.sourceID LEFT JOIN readingTypes ON readingTypes.readingTypeID = readings.readingTypeID WHERE readingTypes.shortname=? ORDER BY readingDate DESC  LIMIT 0,1';

			db.query(query, [req.params.readingTypeShortName], function(err, rows, fields) {

				db.release();
				if (err) {
					sendData(res, 0, err);


				} else {
					var obj = {
						fields: fields,
						rows: rows
					}
					sendData(res, true, obj);

				}
			});
		})
	});


	/**
	 * insert reading
	 */

	app.post("/api/insert/reading/", (req, res) => {
		console.log("insert reading",req);
	

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}
			console.log(req.body);


			var readingDate = new Date(req.body.readingDate);
			var readingTypeID = req.body.readingTypeID;
			var sourceID = req.body.sourceID;
			var value = req.body.value;
			var readingDateMySql = moment(readingDate).format('YYYY-MM-DD HH:mm:ss');

			db.query("INSERT INTO readings (readingDate,readingTypeID,sourceID,value) VALUES (?,?,?,?)", [readingDateMySql, readingTypeID, sourceID, value], function(err) {
				db.release();

				if (!err) {
					sendData(res, true, "reading created");
				} else {
					sendData(res, false, err);
				}
			})
		});
	})

	this.sendData = function(res, stat, data) {
		var returnObj = {
			status: stat,
			data: data
		}
		res.status(200).send(JSON.stringify(returnObj))
	}

};
