(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('AuthService', AuthService);

  AuthService.$inject = ['$http', '$q', '$rootScope'];
  function AuthService($http, $q, $rootScope) {
    const TOKEN_KEY = 'screening_token';
    const USER_KEY = 'screening_user';

    const service = {
      register: register,
      login: login,
      sendOtp: sendOtp,
      verifyOtp: verifyOtp,
      googleAuth: googleAuth,
      getGoogleConfig: getGoogleConfig,
      setGoogleConfig: setGoogleConfig,
      setMailConfig: setMailConfig,
      logout: logout,
      getToken: getToken,
      getUser: getUser,
      isAuthenticated: isAuthenticated,
      getProfile: getProfile
    };

    return service;

    function register(credentials) {
      return $http.post('/api/auth/register', credentials)
        .then(function (response) {
          saveSession(response.data.token, response.data.user);
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'Registration failed.' });
        });
    }

    function login(credentials) {
      return $http.post('/api/auth/login', credentials)
        .then(function (response) {
          saveSession(response.data.token, response.data.user);
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'Login failed.' });
        });
    }

    function sendOtp(identifier) {
      const payload = identifier && identifier.includes('@')
        ? { email: identifier }
        : { phone: identifier, email: identifier };

      return $http.post('/api/auth/otp/send', payload)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'Failed to send OTP code.' });
        });
    }

    function verifyOtp(otpData) {
      return $http.post('/api/auth/otp/verify', otpData)
        .then(function (response) {
          saveSession(response.data.token, response.data.user);
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'OTP verification failed.' });
        });
    }

    function googleAuth(payload) {
      return $http.post('/api/auth/google', payload)
        .then(function (response) {
          saveSession(response.data.token, response.data.user);
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'Google authentication failed.' });
        });
    }

    function getGoogleConfig() {
      return $http.get('/api/auth/google/config')
        .then(function (response) {
          return response.data;
        })
        .catch(function () {
          return { clientId: null };
        });
    }

    function setGoogleConfig(clientId) {
      return $http.post('/api/auth/google/config', { clientId: clientId })
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'Failed to update Google configuration.' });
        });
    }

    function setMailConfig(smtpData) {
      return $http.post('/api/auth/mail/config', smtpData)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          return $q.reject(error.data || { message: 'Failed to update SMTP configuration.' });
        });
    }

    function logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      $rootScope.currentUser = null;
    }

    function getToken() {
      return localStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    function isAuthenticated() {
      return !!getToken();
    }

    function getProfile() {
      return $http.get('/api/auth/me')
        .then(function (res) {
          return res.data.user;
        });
    }

    function saveSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      $rootScope.currentUser = user;
    }
  }
})();
