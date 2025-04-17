var app = angular.module('RealEstateApp', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/home.html'
        })
        .when('/listings', {
            templateUrl: 'views/listings.html',
            controller: 'ListingsController as vm'
        })
        .when('/rentals', {
            templateUrl: 'views/rentals.html',
            controller: 'RentalsController as vm'
        })
        .when('/add-property', {
            templateUrl: 'views/add-property.html',
            controller: 'AddPropertyController as vm'
        })
        .when('/aws', {
            templateUrl: 'views/aws.html',
            controller: 'AwsController as vm'
        })
        .otherwise({
            redirectTo: '/'
        });
}]);