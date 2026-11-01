(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('AnalyticsService', AnalyticsService);

  AnalyticsService.$inject = ['$http', '$q'];
  function AnalyticsService($http, $q) {
    const service = {
      getDashboardStats: getDashboardStats
    };

    return service;

    function getDashboardStats() {
      return $http.get('/api/analytics/dashboard')
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function handleError(err) {
      const msg = (err && err.data && err.data.message) || (err && err.message) || 'An analytics service error occurred.';
      return $q.reject({ message: msg, status: err ? err.status : 500 });
    }
  }
})();
