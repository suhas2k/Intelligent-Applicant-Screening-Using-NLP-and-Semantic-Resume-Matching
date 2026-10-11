(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('JobService', JobService);

  JobService.$inject = ['$http', '$q'];
  function JobService($http, $q) {
    const service = {
      getJobs: getJobs,
      getJobById: getJobById,
      createJob: createJob,
      updateJob: updateJob,
      deleteJob: deleteJob
    };

    return service;

    function getJobs(params) {
      return $http.get('/api/jobs', { params: params || {} })
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function getJobById(id) {
      return $http.get('/api/jobs/' + id)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function createJob(jobData) {
      return $http.post('/api/jobs', jobData)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function updateJob(id, jobData) {
      return $http.put('/api/jobs/' + id, jobData)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function deleteJob(id) {
      return $http.delete('/api/jobs/' + id)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function handleError(err) {
      return $q.reject(err.data || { message: 'An unexpected job operation error occurred.' });
    }
  }
})();
