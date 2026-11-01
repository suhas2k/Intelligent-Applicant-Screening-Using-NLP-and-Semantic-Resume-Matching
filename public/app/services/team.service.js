(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('TeamService', TeamService);

  TeamService.$inject = ['$http', '$q'];
  function TeamService($http, $q) {
    const service = {
      getTeamMembers: getTeamMembers,
      inviteMember: inviteMember,
      removeMember: removeMember
    };

    return service;

    function getTeamMembers(params) {
      return $http.get('/api/team', { params: params || {} })
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function inviteMember(data) {
      return $http.post('/api/team/invite', data)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function removeMember(id) {
      return $http.delete('/api/team/' + id)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function handleError(err) {
      const msg = (err && err.data && err.data.message) || (err && err.message) || 'A team service error occurred.';
      return $q.reject({ message: msg, status: err ? err.status : 500 });
    }
  }
})();
