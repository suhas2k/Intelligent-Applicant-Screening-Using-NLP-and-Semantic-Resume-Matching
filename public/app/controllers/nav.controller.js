(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('NavController', NavController);

  NavController.$inject = ['$location', '$rootScope', 'AuthService'];
  function NavController($location, $rootScope, AuthService) {
    const vm = this;

    vm.isAuthenticated = AuthService.isAuthenticated;
    vm.getUser = AuthService.getUser;
    vm.isActive = isActive;
    vm.logout = logout;
    vm.isMobileMenuOpen = false;
    vm.toggleMobileMenu = toggleMobileMenu;
    vm.closeMobileMenu = closeMobileMenu;

    function toggleMobileMenu() {
      vm.isMobileMenuOpen = !vm.isMobileMenuOpen;
    }

    function closeMobileMenu() {
      vm.isMobileMenuOpen = false;
    }

    $rootScope.$on('$routeChangeSuccess', function () {
      vm.isMobileMenuOpen = false;
    });

    function isActive(route) {
      return $location.path().indexOf(route) === 0;
    }

    function logout() {
      vm.isMobileMenuOpen = false;
      AuthService.logout();
      $location.path('/login');
    }
  }
})();
