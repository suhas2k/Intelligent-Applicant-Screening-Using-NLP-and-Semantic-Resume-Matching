(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('SettingsService', SettingsService);

  SettingsService.$inject = ['$http', '$q'];
  function SettingsService($http, $q) {
    const service = {
      getSettings: getSettings,
      updateSettings: updateSettings
    };

    return service;

    function getSettings() {
      return $http.get('/api/settings')
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function updateSettings(data) {
      return $http.put('/api/settings', data)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function handleError(err) {
      const msg = (err && err.data && err.data.message) || (err && err.message) || 'A settings service error occurred.';
      return $q.reject({ message: msg, status: err ? err.status : 500 });
    }
  }
})();
