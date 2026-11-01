(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('InterviewService', InterviewService);

  InterviewService.$inject = ['$http', '$q'];
  function InterviewService($http, $q) {
    const service = {
      getInterviews: getInterviews,
      scheduleInterview: scheduleInterview,
      rescheduleInterview: rescheduleInterview,
      cancelInterview: cancelInterview
    };

    return service;

    function getInterviews(params) {
      return $http.get('/api/interviews', { params: params || {} })
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function scheduleInterview(data) {
      return $http.post('/api/interviews', data)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function rescheduleInterview(id, data) {
      return $http.patch('/api/interviews/' + id + '/reschedule', data)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function cancelInterview(id) {
      return $http.delete('/api/interviews/' + id)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function handleError(err) {
      const msg = (err && err.data && err.data.message) || (err && err.message) || 'An interview service error occurred.';
      return $q.reject({ message: msg, status: err ? err.status : 500 });
    }
  }
})();
