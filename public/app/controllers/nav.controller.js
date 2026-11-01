(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('NavController', NavController);

  NavController.$inject = ['$location', '$rootScope', 'AuthService', 'ThemeService'];
  function NavController($location, $rootScope, AuthService, ThemeService) {
    const vm = this;

    vm.isAuthenticated = AuthService.isAuthenticated;
    vm.getUser = AuthService.getUser;
    vm.isActive = isActive;
    vm.isAuthPage = isAuthPage;
    vm.isLoginPage = isLoginPage;
    vm.logout = logout;
    vm.isMobileMenuOpen = false;
    vm.toggleMobileMenu = toggleMobileMenu;
    vm.closeMobileMenu = closeMobileMenu;

    // Theme Management Interface
    vm.currentTheme = ThemeService.getTheme();
    vm.getTheme = ThemeService.getTheme;
    vm.getResolvedTheme = ThemeService.getResolvedTheme;
    vm.setTheme = function (theme) {
      ThemeService.setTheme(theme);
      vm.currentTheme = theme;
    };
    vm.cycleTheme = function () {
      vm.currentTheme = ThemeService.cycleTheme();
    };

    $rootScope.$on('theme:changed', function (event, data) {
      vm.currentTheme = data.setting;
    });

    function isLoginPage() {
      return $location.path() === '/login';
    }

    function isAuthPage() {
      const p = $location.path();
      return p === '/login' || p === '/register';
    }

    function toggleMobileMenu() {
      vm.isMobileMenuOpen = !vm.isMobileMenuOpen;
      updateBodyDrawerLock();
    }

    function closeMobileMenu() {
      vm.isMobileMenuOpen = false;
      updateBodyDrawerLock();
    }

    function updateBodyDrawerLock() {
      if (typeof document !== 'undefined' && document.body) {
        if (vm.isMobileMenuOpen) {
          document.body.classList.add('drawer-open');
        } else {
          document.body.classList.remove('drawer-open');
        }
      }
    }

    $rootScope.$on('$routeChangeSuccess', function () {
      closeMobileMenu();
    });

    function isActive(route) {
      return $location.path().indexOf(route) === 0;
    }

    function logout() {
      closeMobileMenu();
      AuthService.logout();
      $location.path('/login');
    }
  }
})();
