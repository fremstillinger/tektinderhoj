const mysql = require('mysql');
const fs = require('fs');
const express = require('express');
const bodyParser = require("body-parser");
const app = express();

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

app.use('/', express.static(__dirname + '/public'));

require('./routes')(app, dbPool);

app.get('/*', function(req, res) {
	res.redirect('/');
});

app.listen(configData.port, () => {
	console.log('We are live on ' + configData.port);
});