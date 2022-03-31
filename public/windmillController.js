app.controller('windmillCtrl', ['$scope', '$routeParams', '$route', '$http', '$timeout', '$location', '$window', '$document', function($scope, $routeParams, $route, $http, $timeout, $location, $window, $document) {

    $scope.windSpeed = "--";
    $scope.windDirection = "--";
    $scope.temperature = "--";

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
            console.log("websocket connected");
            $scope.livedataConnected = true;
        };


        connection.onerror = function(error) {
             console.log('WebSocket Error ' + error);
            $scope.livedataConnected = false;
            connection.close();
           
        };

        connection.onclose = function(){
            console.log("websocket closed, connecting in 5 sec")
            setTimeout($scope.openWebsocket,5000);
        }

        connection.onmessage = function(e) {
            $scope.liveData = JSON.parse(e.data);
            $scope.updateLiveData();
        };
    }



    $scope.requestWindSpeedFromDatabase = function() {
         if($scope.simulationMode){
            return;
        }

        $http.get(configData.apiAdress + '/api/get/latestReadingByReadingTypeID/2').then(function(res) {

            if (!$scope.simulationMode) {
                $scope.windSpeed = res.data.data.rows[0].value;
            }

        });
    }


    $scope.requestWindSpeedFromDatabase();

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
 
        if($scope.simulationMode){
            return;
        }


        for (var l = 0; l < $scope.liveData.length; l++) {
            switch ($scope.liveData[l].readingTypeID) {
                case 1:
$scope.temperature = $scope.liveData[l].value;
                break;

                case 2:
                    $scope.windSpeed = $scope.liveData[l].value;
                    break;

                case 7:
                    $scope.windDirection = $scope.liveData[l].value;
                
                    document.getElementById("inner-arrow").setAttribute("transform", "rotate(" + $scope.windDirection + ")");
                    break;

                default:

                    break;

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
        var acc = 0.2;

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
                $scope.turnOnLights();
            }
        } else {
            $scope.batteryLevel -= 0.01;

            if ($scope.batteryLevel <= 0) {
                $scope.batteryLevel = 0;
               
                $scope.turnOffLights();
                $scope.batteryCharging = true;
            }
        }

        if (!$scope.batteryCharging) {


        }
    }, $scope.updateInterval);

    $document.bind('keyup', function(e) {

        switch (e.keyCode) {
            case 82:
                $window.location.reload();
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
                $scope.turnOnLights();
                $scope.batteryCharging = false;
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
        $scope.windSpeed = "--";
        $scope.simulationMode = false;

    }

    $scope.startSimulationmode = function() {
        if($scope.windSpeed == "--"){
            $scope.windSpeed  = 0;
        }
        $scope.simulationMode = true;

        clearTimeout($scope.simulationModeTimeout);

        $scope.simulationModeTimeout = setTimeout(function() {
            $scope.simulationMode = false;
        }, 30000);
    }

    $scope.turnOnLights = function() {
        $http.get('http://localhost:8282/startRun/0/92/255/255/0/120');
        $http.get('http://localhost:8282/setColor/93/499/40/20/0');
    }

    $scope.turnOffLights = function() {
        $http.get('http://localhost:8282/stopAllRuns');
        $http.get('http://localhost:8282/setColor/0/499/0/0/0');

    }
    $scope.tick = function() {
        $scope.windmillWings.rotation += $scope.windmillRotation * 2;
        $scope.batteryLevelRect.scaleX = $scope.batteryLevel;
        $scope.windmillWingStage.update();
        $scope.batteryStage.update();
        $scope.windmillStage.update();
    }

    createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.framerate = 25;
    createjs.Ticker.on("tick", $scope.tick);

    $scope.turnOffLights();

     $scope.openWebsocket();
       


}]);