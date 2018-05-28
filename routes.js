var moment = require('moment');

module.exports = function(app, dbPool) {

	/**
	 * Get latest readings
	 */

	 app.get('/api/get/readings/live', (req, res) => {


	 })


	 /**
	 * get reading types
	 */

	app.get("/api/get/readingTypes/", (req, res) => {

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}
			
			db.query("SELECT * FROM readingTypes", function(err,rows) {
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
		var startDate = moment(new Date(req.query.startDate));
		var endDate = moment(new Date(req.query.endDate));

		var daysSpan = (endDate-startDate)/1000/60/60/24;
		
		startDate = startDate.startOf('day');
		endDate = endDate.endOf('day');

		//var groupBy = "DATE_FORMAT(readingDate, '%Y-%m-%d %H:%i:%S')";
		var groupBy = "DATE_FORMAT(readingDate, '%Y-%m-%d %H:%i')";

		if(daysSpan > 365*50){
			startDate = startDate.startOf('year');
			startDate.year(Math.floor(startDate.year()/10)*10);
			endDate = endDate.endOf('year');
			endDate.year(Math.ceil(endDate.year()/10)*10);
			groupBy = "CEIL(YEAR(readingDate)/10)*10";
		}else if(daysSpan > 365*25){
			startDate = startDate.startOf('year');
			startDate.year(Math.floor(startDate.year()/10)*10);
			endDate = endDate.endOf('year');
			endDate.year(Math.ceil(endDate.year()/10)*10);
			groupBy = "CEIL(YEAR(readingDate)/5)*5";
		}else if(daysSpan > 365*5){
			//startDate = startDate
			//startDate.setFullYear(startDate.getFullYear())
			startDate = startDate.startOf('year');
			startDate.year(Math.floor(startDate.year()/10)*10);
			endDate = endDate.endOf('year');
			groupBy = "CEIL(YEAR(readingDate))";

		}else if(daysSpan > 365){
			groupBy = "CONCAT(MONTH(readingDate),'/',YEAR(readingDate))";
		}else if(daysSpan > 30){
			groupBy =  "CONCAT(DAY(readingDate),'/',MONTH(readingDate),'/',YEAR(readingDate))"; 
		}

		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}

			var query = 'SELECT ' + groupBy + '  as scale, readings.readingDate,readingTypes.readingTypeName,AVG(readings.value) as value,sources.sourceName FROM readings INNER JOIN sources ON sources.sourceID = readings.sourceID INNER JOIN readingTypes ON readingTypes.readingTypeID = readings.readingTypeID WHERE readingTypes.shortname=? AND readingDate BETWEEN ? AND ? GROUP BY scale ORDER BY readingDate ';
			
			db.query(query, [req.params.readingTypeShortName,startDate.toDate(),endDate.toDate()], function(err, rows, fields) {
			
				db.release();
				if (err) {
					sendData(res, 0, err);


				} else {
					sendData(res, true, rows);

				}
			});
		})
	});

	app.get("/api/set/reading/", (req, res) => {

		

		var readingDate = new Date();
		var value = req.query.id + " " + req.query.lat + "," + req.query.lon;

		var sourceID = 100;

		var value = req.body.value;
		var readingTypeID = "100";


		dbPool.getConnection(function(err, db) {
			if (err) {
				console.log(err);
				return;
			}
			console.log(req.body);
			

			
			var readingDateMySql =  moment(readingDate).format('YYYY-MM-DD HH:mm:ss');

			db.query("INSERT INTO readings (readingDate,readingTypeID,sourceID,value) VALUES (?,?,?,?)", [readingDateMySql,readingTypeID, sourceID, value], function(err) {
				db.release();

				if (!err) {
					sendData(res, true, "reading created");
				} else {
					sendData(res, false, err);
				}
			})
		});
	})


	/**
	 * insert reading
	 */

	app.post("/api/insert/reading/", (req, res) => {

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
			var readingDateMySql =  moment(readingDate).format('YYYY-MM-DD HH:mm:ss');

			db.query("INSERT INTO readings (readingDate,readingTypeID,sourceID,value) VALUES (?,?,?,?)", [readingDateMySql,readingTypeID, sourceID, value], function(err) {
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