(function () {
  'use strict';

  angular
    .module('screeningApp')
    .config(routeConfig);

  routeConfig.$inject = ['$routeProvider'];
  function routeConfig($routeProvider) {
    $routeProvider
      .when('/login', {
        templateUrl: 'app/views/login.html',
        controller: 'AuthController',
        controllerAs: 'vm'
      })
      .when('/register', {
        templateUrl: 'app/views/register.html',
        controller: 'AuthController',
        controllerAs: 'vm'
      })
      .when('/dashboard', {
        templateUrl: 'app/views/dashboard.html',
        controller: 'DashboardController',
        controllerAs: 'vm'
      })
      .when('/jobs', {
        templateUrl: 'app/views/jobs.html',
        controller: 'JobsController',
        controllerAs: 'vm'
      })
      .when('/jobs/:id', {
        templateUrl: 'app/views/job-detail.html',
        controller: 'JobDetailController',
        controllerAs: 'vm'
      })
      .when('/applicants', {
        templateUrl: 'app/views/applicants.html',
        controller: 'ApplicantsController',
        controllerAs: 'vm'
      })
      .when('/applicants/:id', {
        templateUrl: 'app/views/applicant-detail.html',
        controller: 'ApplicantDetailController',
        controllerAs: 'vm'
      })
      .otherwise({
        redirectTo: '/dashboard'
      });
  }
})();
