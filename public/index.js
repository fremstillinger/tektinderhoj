var app = angular.module("solaris", ["ngRoute", 'ngMessages', 'ngMaterial', "chart.js"]);

app.config(function($mdDateLocaleProvider) {
	$mdDateLocaleProvider.formatDate = function(date) {
		return moment(date).format('DD/MM/YYYY');
	};

	$mdDateLocaleProvider.parseDate = function(dateString) {
		var m = moment(dateString, 'DD/MM/YYYY', true);
		return m.isValid() ? m.toDate() : new Date(NaN);
	};
});


app.config(function($routeProvider) {
	$routeProvider
		.when("/om", {
			templateUrl: "about.html"
		})
		.when("/", {
			templateUrl: "charts.html",
			controller: "chartCtrl",
			reloadOnSearch: false
		})
});


app.controller('chartCtrl', ['$scope', '$routeParams', '$route', '$http', '$timeout', '$location', '$window', function($scope, $routeParams, $route, $http, $timeout, $location, $window) {

	if ($routeParams.startDate != undefined) {
		$scope.startDate = new Date($routeParams.startDate);
	} else {
		$scope.startDate = new Date();
		$scope.startDate.setDate($scope.startDate.getDate() - 7);
		//$scope.startDate.setFullYear(1900);
	}

	if ($routeParams.endDate != undefined) {
		$scope.endDate = new Date($routeParams.endDate);
	} else {
		$scope.endDate = new Date();
	}


	$scope.liveData = [];

	$scope.liveDataParameters = [];

	$scope.livedataConnected = false;


	$scope.openWebsocket = function() {

		var connection = new WebSocket(configData.wsAdress);

		connection.onopen = function() {
			$scope.livedataConnected = true;
		};

		// Log errors
		connection.onerror = function(error) {
			console.log('WebSocket Error ' + error);
		};

		// Log messages from the server
		connection.onmessage = function(e) {
		
			$timeout(function() {
				$scope.liveData = JSON.parse(e.data);
				$scope.updateLiveData();
			}, 0);
		};
	}

	$scope.updateLiveData = function() {
		$scope.liveDataParameters = [];

		for (var p = 0; p < $scope.parametre.length; p++) {
			for (var r = 0; r < $scope.readingTypes.length; r++) {
				if ($scope.parametre[p] == $scope.readingTypes[r].shortname) {
					var obj = $scope.readingTypes[r];
					obj.value = "--";
					obj.readingDate = "--";

					for (var l = 0; l < $scope.liveData.length; l++) {
						if ($scope.readingTypes[r].readingTypeID == $scope.liveData[l].readingTypeID) {
							obj.value = $scope.liveData[l].value;
							obj.readingDate = $scope.liveData[l].readingDate;
						}
					}
					$scope.liveDataParameters.push(obj);
				}
			}
		}
	}


	$scope.test = $routeParams;
	$scope.openWebsocket();

	$scope.parametre = ['volt','vind','temp','uv', 'fugt'];

	if ($routeParams.parametre != undefined) {
		$scope.parametre = $routeParams.parametre.split(",");
	}

	$scope.startDateChanged = function() {
		$route.updateParams({
			"startDate": new Date($scope.startDate.getTime() - ($scope.startDate.getTimezoneOffset() * 60000)).toISOString()
		});
		$scope.reloadChartdata();

	}
	$scope.endDateChanged = function() {
		$route.updateParams({
			"endDate": new Date($scope.endDate.getTime() - ($scope.endDate.getTimezoneOffset() * 60000)).toISOString()
		});
		$scope.reloadChartdata();
	}

	$scope.parameterSelected = function(readingTypeName) {
		var val = $scope.parametre.indexOf(readingTypeName);
		return val != -1;
	}

	$scope.toogleParameter = function(readingTypeName) {
		var indexOfParam = $scope.parametre.indexOf(readingTypeName);
		if (indexOfParam != -1) {
			$scope.parametre.splice(indexOfParam, 1)
		} else {
			$scope.parametre.push(readingTypeName)
		}
	}

	$scope.embedCode;

	$scope.updateEmbedcode = function() {
		$scope.embedCode = "<iframe src='" + $location.absUrl() + "&embedMode" + "'></iframe>";
	}

	$scope.charts = [];
	$scope.readingTypes = [];

	$scope.downloadExcelfile = function() {
		var p = $.param({
			parameters: $scope.parametre.join(","),
			startDate: $scope.startDate.toISOString(),
			endDate: $scope.endDate.toISOString()
		});

		var url = configData.apiAdress + '/api/downloadDataset/?' + p;
		$window.open(url, '_blank');
	}

	$http.get(configData.apiAdress + '/api/get/readingTypes/').then(function(res) {
		for (var i = 0; i < res.data.data.length; i++) {
			var obj = res.data.data[i];
			obj.selected = $scope.parametre.indexOf(obj.shortname) != -1;
			$scope.readingTypes.push(obj)
		}
	});


	$scope.chartController = function(name) {
		var self = this;
		this.name = name;

		this.isLoading = true;

		this.colors = [{
			//backgroundColor:"#330",
			//hoverBackgroundColor:"#FF0000",
			borderColor: "#484c92",
			// hoverBorderColor:"#00F"
		}]

		this.datasetOverrides = [{
			label: 'Override Series A',
			borderWidth: 1,
			type: 'bar'
		}];

		this.series = [];


		this.data = [
			[]
		];

		this.labels = [];


		$http.get(configData.apiAdress + '/api/get/readings/' + self.name, {
				params: {
					startDate: $scope.startDate.toISOString(),
					endDate: $scope.endDate.toISOString()
				}
			})
			.then(function(res) {
				$timeout(function() {
					

					var readingTypeName = "";
					for (var i = 0; i < res.data.data.rows.length; i++) {
						//var d = new Date(res.data.data[i].readingDate);
						self.data[0].push(res.data.data.rows[i].value);
						self.labels.push(res.data.data.rows[i].scale);
						readingTypeName = res.data.data.rows[i].readingTypeName + " " + res.data.data.rows[i].unit;
					}

					self.series = [readingTypeName];
					self.isLoading = false;

					self.options = {
						maintainAspectRatio: false,
						fill: false,
						scales: {
							xAxes: [{
								display: true,
								scaleLabel: {
									display: false,
									labelString: 'Dato'
								}
							}],
							yAxes: [{
								display: true,
								scaleLabel: {
									display: true,
									labelString: readingTypeName
								}
							}]
						}

					}
				}, 0);

			});
	}


	$scope.paramUpdates = function() {
		$route.updateParams({
			"parametre": $scope.parametre.join(",")
		});
		$scope.reloadChartdata();
	}

	$scope.reloadTimeout;

	$scope.reloadChartdata = function() {
		clearTimeout($scope.reloadTimeout);

		$scope.reloadTimeout; = setTimeout(function(){
			$scope.updateEmbedcode();
		$scope.charts = [];
		angular.forEach($scope.parametre, function(value, key) {
			$scope.charts.push(new $scope.chartController(value));
		});

		},100)
		
	}

	$scope.reloadChartdata();
}]);
