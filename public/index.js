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


app.controller('chartCtrl', ['$scope', '$routeParams', '$route', '$http', '$timeout', function($scope, $routeParams, $route, $http, $timeout) {
	

	if ($routeParams.startDate != undefined) {
		$scope.startDate = new Date($routeParams.startDate);
	}
	else{
		$scope.startDate = new Date();
		$scope.startDate.setFullYear(1900);
	}
	
	if ($routeParams.endDate != undefined) {
		$scope.endDate = new Date($routeParams.endDate);
	}
	else{
		$scope.endDate = new Date();
	}
	
	/*
	$scope.$watch('startDate',function(newVal,oldVal){

	 	$route.updateParams({
			"startDate": $scope.startDate.toISOString()
		});
	 	//alert(newVal + " " + oldVal);
         //code goes here
      },true);
	


	$scope.$watch('endDate',function(newVal,oldVal){
		alert(oldVal + " ny " +  newVal);
	 	$route.updateParams({
			"endDate": $scope.endDate.toISOString()
		});
	 	//alert(newVal + " " + oldVal);
         //code goes here
      },false);
      */

	$scope.parametre = ['temp'];

	//$route.updateParams({"test":"wuq"});


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

	$scope.charts = [];

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

		this.series = ['Temperatur'];

		
		this.data = [
			[]
		];


		this.labels = [];


		$http.get('http://m80459.local:1972/api/get/readings/' + self.name, {
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
				//$scope.$apply(); 

			});


	}

	angular.forEach($scope.parametre, function(value, key) {
		$scope.charts.push(new $scope.chartController(value));
	});

}]);
