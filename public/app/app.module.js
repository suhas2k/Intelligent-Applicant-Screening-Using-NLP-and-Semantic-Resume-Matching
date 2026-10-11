(function () {
  'use strict';

  angular
    .module('screeningApp', ['ngRoute'])
    .config(httpConfig)
    .run(runBlock);

  httpConfig.$inject = ['$httpProvider'];
  function httpConfig($httpProvider) {
    // Interceptor to inject JWT token into all API requests
    $httpProvider.interceptors.push(['$q', '$location', function ($q, $location) {
      return {
        request: function (config) {
          const token = localStorage.getItem('screening_token');
          if (token && config.url.startsWith('/api')) {
            config.headers = config.headers || {};
            config.headers.Authorization = 'Bearer ' + token;
          }
          return config;
        },
        responseError: function (rejection) {
          if (rejection.status === 401 && !rejection.config.url.includes('/api/auth/login')) {
            localStorage.removeItem('screening_token');
            localStorage.removeItem('screening_user');
            $location.path('/login');
          }
          return $q.reject(rejection);
        }
      };
    }]);
  }

  runBlock.$inject = ['$rootScope', '$location', 'AuthService'];
  function runBlock($rootScope, $location, AuthService) {
    // Check route permissions on each state transition
    $rootScope.$on('$routeChangeStart', function (event, next) {
      const publicRoutes = ['/login', '/register'];
      const targetPath = next && next.originalPath ? next.originalPath : '/dashboard';

      if (!publicRoutes.includes(targetPath) && !AuthService.isAuthenticated()) {
        $location.path('/login');
      } else if (publicRoutes.includes(targetPath) && AuthService.isAuthenticated()) {
        $location.path('/dashboard');
      }
    });

    // Provide global logout helper on rootScope for quick navbar access
    $rootScope.logout = function () {
      AuthService.logout();
      $location.path('/login');
    };

    $rootScope.currentUser = AuthService.getUser();
  }
})();
