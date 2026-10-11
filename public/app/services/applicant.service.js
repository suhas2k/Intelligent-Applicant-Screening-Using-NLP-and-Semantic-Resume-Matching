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

    function uploadResume(file, jobId, candidateInfo) {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobId', jobId);

      if (candidateInfo) {
        if (candidateInfo.fullName) formData.append('fullName', candidateInfo.fullName);
        if (candidateInfo.email) formData.append('email', candidateInfo.email);
        if (candidateInfo.phone) formData.append('phone', candidateInfo.phone);
      }

      return $http.post('/api/applicants/upload', formData, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      })
      .then(function (res) {
        return res.data;
      })
      .catch(handleError);
    }

    function uploadBulkResumes(files, jobId) {
      const formData = new FormData();
      formData.append('jobId', jobId);

      for (let i = 0; i < files.length; i++) {
        formData.append('resumes', files[i]);
      }

      return $http.post('/api/applicants/upload-bulk', formData, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      })
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
