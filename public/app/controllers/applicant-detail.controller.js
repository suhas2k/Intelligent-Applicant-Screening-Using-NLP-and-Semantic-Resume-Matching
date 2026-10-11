(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('ApplicantDetailController', ApplicantDetailController);

  ApplicantDetailController.$inject = ['$routeParams', 'ApplicantService', 'AlertService', '$location'];
  function ApplicantDetailController($routeParams, ApplicantService, AlertService, $location) {
    const vm = this;
    const applicantId = $routeParams.id;

    vm.applicant = null;
    vm.job = null;
    vm.isLoading = true;
    vm.isSavingNotes = false;
    vm.activeTab = 'analysis'; // 'analysis' or 'rawText'

    vm.loadApplicant = loadApplicant;
    vm.saveNotes = saveNotes;
    vm.changeStatus = changeStatus;
    vm.reEvaluate = reEvaluate;
    vm.deleteApplicant = deleteApplicant;
    vm.getScoreDialClass = getScoreDialClass;
    vm.getScoreBadgeClass = getScoreBadgeClass;
    vm.getStatusClass = getStatusClass;
    vm.copyResumeText = copyResumeText;

    init();

    function init() {
      if (!applicantId) {
        $location.path('/applicants');
        return;
      }
      loadApplicant();
    }

    function loadApplicant() {
      vm.isLoading = true;
      ApplicantService.getApplicantById(applicantId)
        .then(function (res) {
          vm.applicant = res.applicant;
          vm.job = res.applicant.jobId;
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to load applicant details.');
          $location.path('/applicants');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function saveNotes() {
      vm.isSavingNotes = true;
      ApplicantService.updateStatus(vm.applicant._id, vm.applicant.status, vm.applicant.recruiterNotes)
        .then(function () {
          AlertService.success('Recruiter notes saved.');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to save notes.');
        })
        .finally(function () {
          vm.isSavingNotes = false;
        });
    }

    function changeStatus(newStatus) {
      vm.applicant.status = newStatus;
      ApplicantService.updateStatus(vm.applicant._id, newStatus, vm.applicant.recruiterNotes)
        .then(function () {
          AlertService.success('Status updated to ' + newStatus);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to update status.');
        });
    }

    function reEvaluate() {
      vm.isLoading = true;
      ApplicantService.reEvaluate(vm.applicant._id)
        .then(function (res) {
          vm.applicant = res.applicant;
          AlertService.success('Candidate re-evaluated! Updated Match Score: ' + res.applicant.matchAnalysis.overallScore + '%');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Re-evaluation failed.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function deleteApplicant() {
      if (!confirm('Are you sure you want to delete this applicant?')) {
        return;
      }

      ApplicantService.deleteApplicant(vm.applicant._id)
        .then(function () {
          AlertService.success('Applicant deleted.');
          $location.path('/applicants');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to delete applicant.');
        });
    }

    function getScoreDialClass(score) {
      if (score >= 80) return 'score-dial-high';
      if (score >= 65) return 'score-dial-good';
      if (score >= 50) return 'score-dial-fair';
      return 'score-dial-low';
    }

    function getScoreBadgeClass(score) {
      if (score >= 80) return 'score-badge-high';
      if (score >= 65) return 'score-badge-good';
      if (score >= 50) return 'score-badge-fair';
      return 'score-badge-low';
    }

    function getStatusClass(status) {
      switch (status) {
        case 'Shortlisted': return 'status-shortlisted';
        case 'Reviewed': return 'status-reviewed';
        case 'Rejected': return 'status-rejected';
        default: return 'status-new';
      }
    }

    function copyResumeText() {
      if (navigator.clipboard && vm.applicant.extractedText) {
        navigator.clipboard.writeText(vm.applicant.extractedText);
        AlertService.info('Extracted resume text copied to clipboard!');
      }
    }
  }
})();
