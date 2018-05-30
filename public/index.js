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
			controller: "chartCtrl"
		})
});


app.controller('liveCtrl', function($scope,$routeParams) {
	$scope.test = "";
});


app.controller('chartCtrl', ['$scope', '$routeParams', '$route', '$http', '$timeout','$location', function($scope, $routeParams, $route, $http, $timeout,$location) {


	if ($routeParams.startDate != undefined) {
		$scope.startDate = new Date($routeParams.startDate);
	}
	else{
		$scope.startDate = new Date();
		$scope.startDate.setDate($scope.startDate.getDate() - 7);
		//$scope.startDate.setFullYear(1900);
	}
	
	if ($routeParams.endDate != undefined) {
		$scope.endDate = new Date($routeParams.endDate);
	}
	else{
		$scope.endDate = new Date();
	}
	


	$scope.parametre = ['temp'];

	if ($routeParams.parametre != undefined) {
		$scope.parametre = $routeParams.parametre.split(",");
	}

	$scope.startDateChanged = function() {
		$route.updateParams({
			"startDate": $scope.startDate.toISOString()
		});
		
	}
	$scope.endDateChanged = function() {
		$route.updateParams({
			"endDate": $scope.endDate.toISOString()
		});
	}

	$scope.parameterSelected = function(readingTypeName){
		var val = $scope.parametre.indexOf(readingTypeName);
		return val != -1;
	}

	$scope.toogleParameter = function(readingTypeName){
		var indexOfParam = $scope.parametre.indexOf(readingTypeName);
		if(indexOfParam != -1){
			$scope.parametre.splice(indexOfParam,1)
		}
		else{
			$scope.parametre.push(readingTypeName)
		}
		console.log($scope.parametre);

		$route.updateParams({
			"parametre": $scope.parametre.join(",")
		});

	}


	$scope.embedCode = "<iframe src='" +  $location.absUrl() + "'></iframe>";

	$scope.charts = [];
	$scope.readingTypes = [];

	$http.get('http://' + configData.apiAdress + ':' + configData.port + '/api/get/readingTypes/').then(function(res){
			$scope.readingTypes = res.data.data;
	});

	$scope.chartController = function(name) {
		var self = this;
		this.name = name;
		/*
		this.colors = [{
			//backgroundColor:"#330",
			//hoverBackgroundColor:"#FF0000",
			borderColor: "#FF0000",
			// hoverBorderColor:"#00F"
		}]
		*/

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


		




		$http.get('http://' + configData.apiAdress + ':' + configData.port + '/api/get/readings/' + self.name, {
				params: {
					startDate: $scope.startDate.toISOString(),
					endDate: $scope.endDate.toISOString()
				}
			})
			.then(function(res) {
				$timeout(function() {
					var readingTypeName = "";
					for (var i = 0; i < res.data.data.length; i++) {
						//var d = new Date(res.data.data[i].readingDate);
						self.data[0].push(res.data.data[i].value);
						self.labels.push(res.data.data[i].scale);
						readingTypeName = res.data.data[i].readingTypeName;


					}	
					
					self.series = [readingTypeName];
					
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

	angular.forEach($scope.parametre, function(value, key) {
		$scope.charts.push(new $scope.chartController(value));
	});

}]);
