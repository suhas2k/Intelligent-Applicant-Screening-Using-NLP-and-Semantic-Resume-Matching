(function () {
  'use strict';

  angular
    .module('screeningApp')
    .config(routeConfig);

  routeConfig.$inject = ['$routeProvider'];
  function routeConfig($routeProvider) {
    $routeProvider
      .when('/login', {
        templateUrl: 'app/views/login.html?v=' + Date.now(),
        controller: 'AuthController',
        controllerAs: 'vm'
      })
      .when('/register', {
        templateUrl: 'app/views/register.html',
        controller: 'AuthController',
        controllerAs: 'vm'
      })
      .when('/dashboard', {
        templateUrl: 'app/views/dashboard.html?v=' + Date.now(),
        controller: 'DashboardController',
        controllerAs: 'vm'
      })
      .when('/jobs', {
        templateUrl: 'app/views/jobs.html?v=' + Date.now(),
        controller: 'JobsController',
        controllerAs: 'vm'
      })
      .when('/jobs/:id', {
        templateUrl: 'app/views/job-detail.html',
        controller: 'JobDetailController',
        controllerAs: 'vm'
      })
      .when('/candidates', {
        templateUrl: 'app/views/candidates.html?v=' + Date.now(),
        controller: 'CandidatesController',
        controllerAs: 'vm'
      })
      .when('/candidates/:id', {
        templateUrl: 'app/views/applicant-detail.html',
        controller: 'ApplicantDetailController',
        controllerAs: 'vm'
      })
      .when('/applicants', {
        redirectTo: '/candidates'
      })
      .when('/applicants/:id', {
        templateUrl: 'app/views/applicant-detail.html',
        controller: 'ApplicantDetailController',
        controllerAs: 'vm'
      })
      .when('/screening', {
        templateUrl: 'app/views/screening.html?v=' + Date.now(),
        controller: 'ScreeningController',
        controllerAs: 'vm'
      })
      .when('/interviews', {
        templateUrl: 'app/views/interviews.html?v=' + Date.now(),
        controller: 'InterviewsController',
        controllerAs: 'vm'
      })
      .when('/analytics', {
        templateUrl: 'app/views/analytics.html?v=' + Date.now(),
        controller: 'AnalyticsController',
        controllerAs: 'vm'
      })
      .when('/team', {
        templateUrl: 'app/views/team.html?v=' + Date.now(),
        controller: 'TeamController',
        controllerAs: 'vm'
      })
      .when('/settings', {
        templateUrl: 'app/views/settings.html?v=' + Date.now(),
        controller: 'SettingsController',
        controllerAs: 'vm'
      })
      .otherwise({
        redirectTo: '/dashboard'
      });
  }
})();
