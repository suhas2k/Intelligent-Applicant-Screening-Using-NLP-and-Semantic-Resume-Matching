(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('AlertService', AlertService);

  AlertService.$inject = ['$rootScope', '$timeout'];
  function AlertService($rootScope, $timeout) {
    $rootScope.alerts = [];

    const service = {
      success: success,
      error: error,
      info: info,
      warning: warning,
      close: close,
      clear: clear
    };

    return service;

    function add(type, message, duration) {
      const alert = {
        id: Date.now() + Math.random(),
        type: type, // 'success', 'danger', 'info', 'warning'
        message: message
      };
      $rootScope.alerts.push(alert);

      $timeout(function () {
        close(alert.id);
      }, duration || 5000);
    }

    function success(msg, dur) { add('success', msg, dur); }
    function error(msg, dur) { add('danger', msg, dur || 7000); }
    function info(msg, dur) { add('info', msg, dur); }
    function warning(msg, dur) { add('warning', msg, dur); }

    function close(id) {
      const idx = $rootScope.alerts.findIndex(a => a.id === id);
      if (idx !== -1) {
        $rootScope.alerts.splice(idx, 1);
      }
    }

    function clear() {
      $rootScope.alerts = [];
    }
  }
})();
