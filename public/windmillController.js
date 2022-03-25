app.controller('windmillCtrl', ['$scope', '$routeParams', '$route', '$http', '$timeout', '$interval', '$location', '$window', '$document', function($scope, $routeParams, $route, $http, $timeout, $interval, $location, $window, $document) {

    $scope.windSpeed = 0;
    $scope.windDirection = 0;

    $scope.parametre = ['vindret', 'vind'];
    $scope.readingTypes = [];

    $http.get(configData.apiAdress + '/api/get/readingTypes/').then(function(res) {
        for (var i = 0; i < res.data.data.length; i++) {
            var obj = res.data.data[i];
            obj.selected = $scope.parametre.indexOf(obj.shortname) != -1;
            $scope.readingTypes.push(obj)
        }
    });

    $scope.batteryLevel = 0;

    
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
                //alert(e.data);
                $scope.updateLiveData();
            }, 10);
        };
    }

    $scope.openWebsocket();
    

    $scope.requestWindSpeedFromDatabase = function() {
        $http.get(configData.apiAdress + '/api/get/latestReadingByReadingTypeID/2').then(function(res) {
          
            if (!$scope.simulationMode) {
                $scope.windSpeed = res.data.data.rows[0].value;
            }

        });
    }


    //$scope.requestWindSpeedFromDatabase();
    setInterval($scope.requestWindSpeedFromDatabase, 1000 * 30);



    $scope.requestWindSHeadingFromDatabase = function() {
        $http.get(configData.apiAdress + '/api/get/latestReadingByReadingTypeID/7').then(function(res) {
            if (!$scope.simulationMode) {
                $scope.windDirection = res.data.data.rows[0].value;
                var innerArrow = document.getElementById("inner-arrow");
                innerArrow.setAttribute("transform", "rotate(" + $scope.windDirection + ")");

            }

        });
    }


    //$scope.requestWindSHeadingFromDatabase();
    setInterval($scope.requestWindSHeadingFromDatabase, 1000 * 30);


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

                            if ($scope.readingTypes[r].shortname == "vind") {
                                if (!$scope.simulationMode) {
                                    $scope.windSpeed = $scope.liveData[l].value;
                                }
                            }

                            if ($scope.readingTypes[r].shortname == "vindret") {
                                $scope.windDirection = $scope.liveData[l].value;
                                var innerArrow = document.getElementById("inner-arrow");
                                innerArrow.setAttribute("transform", "rotate(" + $scope.windDirection + ")");

                            }
                        }
                    }
                    $scope.liveDataParameters.push(obj);
                }
            }
        }
    }

    $scope.windmillStage = new createjs.Stage("windmillCanvas");
    $scope.windmillWingStage = new createjs.Stage("windmillWingCanvas");
    $scope.batteryStage = new createjs.Stage("batteryCanvas");
    $scope.windmillWingStage.scale = 1;
    $scope.curRotation = 0;
    $scope.windmillWings = new createjs.Bitmap("./img/vindmollevinger250.png");

    var wingSize = 250;
    $scope.windmillWings.regX = wingSize / 2;
    $scope.windmillWings.regY = wingSize / 2;
    $scope.windmillWings.x = wingSize / 2;
    $scope.windmillWings.y = wingSize / 2;
    $scope.windmillRotation = 0;

    $scope.battery = new createjs.Container();
    var batteryBackground = new createjs.Bitmap("./img/noun_Battery_855097_000000.png");
    $scope.battery.addChild(batteryBackground);
    $scope.batteryLevelRect = new createjs.Shape();
    $scope.batteryLevelRect.graphics.beginFill("#000000").drawRect(0, 0, 278, 146);
    $scope.batteryLevelRect.x = 34;
    $scope.batteryLevelRect.y = 36;

    $scope.battery.addChild($scope.batteryLevelRect);
    $scope.batteryStage.addChild($scope.battery);

    var windmill = new createjs.Container();
    windmill.scale = 1;

    var windmillTower = new createjs.Bitmap("./img/vindmolle-01.png");
    windmillTower.x = 0;
    windmillTower.y = 0;
    windmillTower.scale = 0.4;
    windmill.addChild(windmillTower);
    $scope.windmillStage.addChild(windmill)

    $scope.windmillWingStage.addChild($scope.windmillWings);

    $scope.updateWindmillPosition = function() {
        $scope.windmillWingStage.update();
        $scope.windmillStage.update();
        $scope.batteryStage.update();
        $scope.windmillStage.update();
    }


    $(window).resize(function() {
        $scope.updateWindmillPosition();
    });

    $scope.updateWindmillPosition();

    $scope.updateInterval = 1000 / 12;
    $scope.batteryCharging = true;
    $scope.simulationMode = false;

    setInterval(function() {
        var acc = 0.5;

        if ($scope.windSpeed > $scope.windmillRotation) {
            $scope.windmillRotation += acc;
        }
        if ($scope.windSpeed < $scope.windmillRotation) {
            $scope.windmillRotation -= acc;
        }

        if ($scope.batteryCharging) {
            $scope.batteryLevel += ($scope.windmillRotation / 18) * 0.01;

            if ($scope.batteryLevel >= 1) {
                $scope.batteryLevel = 1;
                $scope.batteryCharging = false;
                $scope.updateLights();

                $http.get('http://localhost:8282/startRun/0/92/255/255/0/80');

                $http.get('http://localhost:8282/setColor/93/499/40/20/0');
            }
        } else {
            $scope.batteryLevel -= 0.01;

            if ($scope.batteryLevel <= 0) {
                $scope.batteryLevel = 0;
                $scope.updateLights();
                $http.get('http://localhost:8282/stopRun/0/92/255/255/0/80');

                $http.get('http://localhost:8282/setColor/93/499/0/0/0');
                $scope.batteryCharging = true;
            }
        }

        if (!$scope.batteryCharging) {


        }
    }, $scope.updateInterval);

    $document.bind('keyup', function(e) {

        switch (e.keyCode) {
            case 82:

                $scope.stopSimulationmode();
                break;

            case 65:
                $scope.startSimulationmode();
                if ($scope.windSpeed < 39) {
                    $scope.windSpeed += 1;
                }
                $scope.$apply();
                break;

            case 90:
                $scope.startSimulationmode();
                if ($scope.windSpeed > 0) {
                    $scope.windSpeed -= 1;
                }
                $scope.$apply();
                break;

            case 73:
                $window.location.reload();
                break;



        }
    });

    $scope.simulationModeTimeout;
    $scope.blinkMode = false;

    $scope.blinkInterval = setInterval(function() {
        $scope.blinkMode = !$scope.blinkMode;
        $scope.$apply();
    }, 500);


    $scope.stopSimulationmode = function() {
        $scope.simulationMode = false;

    }

    $scope.startSimulationmode = function() {
        $scope.simulationMode = true;
        
        clearTimeout($scope.simulationModeTimeout);

        $scope.simulationModeTimeout = setTimeout(function() {
            $scope.simulationMode = false;
        }, 30000);
    }

    $scope.updateLights = function() {


    }
    $scope.tick = function() {
        $scope.windmillWings.rotation += $scope.windmillRotation * 2;
        $scope.batteryLevelRect.scaleX = $scope.batteryLevel;
        $scope.windmillWingStage.update();
        $scope.batteryStage.update();
        $scope.windmillStage.update();
    }

    createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.framerate = 12;
    createjs.Ticker.on("tick", $scope.tick);

}]);
