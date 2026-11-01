(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('ApplicantService', ApplicantService);

  ApplicantService.$inject = ['$http', '$q'];
  function ApplicantService($http, $q) {
    const service = {
      getApplicants: getApplicants,
      getApplicantById: getApplicantById,
      uploadResume: uploadResume,
      uploadBulkResumes: uploadBulkResumes,
      updateStatus: updateStatus,
      reEvaluate: reEvaluate,
      deleteApplicant: deleteApplicant,
      getDashboardStats: getDashboardStats
    };

    return service;

    function getApplicants(params) {
      return $http.get('/api/applicants', { params: params || {} })
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function getApplicantById(id) {
      return $http.get('/api/applicants/' + id)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function uploadResume(file, jobId, candidateInfo, onProgress) {
      let formData;
      if (file instanceof FormData) {
        formData = file;
      } else {
        formData = new FormData();
        formData.append('resume', file);
        if (jobId) formData.append('jobId', jobId);

        if (candidateInfo) {
          if (candidateInfo.fullName) formData.append('fullName', candidateInfo.fullName);
          if (candidateInfo.email) formData.append('email', candidateInfo.email);
          if (candidateInfo.phone) formData.append('phone', candidateInfo.phone);
        }
      }

      const reqConfig = {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      };

      if (typeof onProgress === 'function') {
        reqConfig.uploadEventHandlers = {
          progress: function (e) {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct);
            }
          }
        };
      }

      return $http.post('/api/applicants/upload', formData, reqConfig)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function uploadBulkResumes(files, jobId, onProgress) {
      let formData;
      if (files instanceof FormData) {
        formData = files;
      } else {
        formData = new FormData();
        if (jobId) formData.append('jobId', jobId);

        for (let i = 0; i < files.length; i++) {
          formData.append('resumes', files[i]);
        }
      }

      const reqConfig = {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      };

      if (typeof onProgress === 'function') {
        reqConfig.uploadEventHandlers = {
          progress: function (e) {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onProgress(pct);
            }
          }
        };
      }

      return $http.post('/api/applicants/upload-bulk', formData, reqConfig)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function updateStatus(id, status, recruiterNotes) {
      return $http.patch('/api/applicants/' + id + '/status', {
        status: status,
        recruiterNotes: recruiterNotes
      })
      .then(function (res) {
        return res.data;
      })
      .catch(handleError);
    }

    function reEvaluate(id) {
      return $http.post('/api/applicants/' + id + '/re-evaluate')
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function deleteApplicant(id) {
      return $http.delete('/api/applicants/' + id)
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function getDashboardStats() {
      return $http.get('/api/analytics/dashboard')
        .then(function (res) {
          return res.data;
        })
        .catch(handleError);
    }

    function handleError(err) {
      return $q.reject(err.data || { message: 'An applicant screening error occurred.' });
    }
  }
})();
