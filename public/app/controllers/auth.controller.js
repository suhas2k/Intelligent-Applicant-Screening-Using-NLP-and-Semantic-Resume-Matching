(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('AuthController', AuthController);

  AuthController.$inject = ['$location', 'AuthService', 'AlertService'];
  function AuthController($location, AuthService, AlertService) {
    const vm = this;

    vm.loginData = {
      email: '',
      password: ''
    };

    vm.registerData = {
      name: '',
      email: '',
      password: '',
      company: '',
      role: 'recruiter'
    };

    vm.isLoading = false;
    vm.login = login;
    vm.register = register;
    vm.fillDemoCredentials = fillDemoCredentials;

    function login() {
      if (!vm.loginData.email || !vm.loginData.password) {
        AlertService.error('Please enter both email and password.');
        return;
      }

      vm.isLoading = true;
      AuthService.login(vm.loginData)
        .then(function (res) {
          AlertService.success('Welcome back, ' + res.user.name + '!');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Login failed. Please check your credentials.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function register() {
      if (!vm.registerData.name || !vm.registerData.email || !vm.registerData.password) {
        AlertService.error('Name, email, and password are required.');
        return;
      }

      if (vm.registerData.password.length < 6) {
        AlertService.error('Password must be at least 6 characters.');
        return;
      }

      vm.isLoading = true;
      AuthService.register(vm.registerData)
        .then(function (res) {
          AlertService.success('Account created successfully! Welcome, ' + res.user.name + '.');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Registration failed.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function fillDemoCredentials() {
      vm.loginData.email = 'recruiter@demo.com';
      vm.loginData.password = 'password123';
      vm.login();
    }
  }
})();
