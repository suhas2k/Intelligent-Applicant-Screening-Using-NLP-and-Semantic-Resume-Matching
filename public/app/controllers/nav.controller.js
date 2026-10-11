(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('NavController', NavController);

  NavController.$inject = ['$location', 'AuthService'];
  function NavController($location, AuthService) {
    const vm = this;

    vm.isAuthenticated = AuthService.isAuthenticated;
    vm.getUser = AuthService.getUser;
    vm.isActive = isActive;
    vm.logout = logout;

    function isActive(route) {
      return $location.path().indexOf(route) === 0;
    }

    function logout() {
      AuthService.logout();
      $location.path('/login');
    }
  }
})();
