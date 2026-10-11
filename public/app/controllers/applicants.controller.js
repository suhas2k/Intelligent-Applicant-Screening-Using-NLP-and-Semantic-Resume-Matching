(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('ApplicantsController', ApplicantsController);

  ApplicantsController.$inject = ['ApplicantService', 'JobService', 'AlertService', '$location'];
  function ApplicantsController(ApplicantService, JobService, AlertService, $location) {
    const vm = this;

    vm.applicants = [];
    vm.jobs = [];
    vm.isLoading = true;

    // Filter controls
    vm.filters = {
      jobId: 'All',
      status: 'All',
      minScore: 0,
      search: '',
      sortBy: 'score',
      sortOrder: 'desc'
    };

    vm.loadData = loadData;
    vm.applyFilters = applyFilters;
    vm.resetFilters = resetFilters;
    vm.updateStatus = updateStatus;
    vm.viewDetail = viewDetail;
    vm.deleteApplicant = deleteApplicant;
    vm.getScoreBadgeClass = getScoreBadgeClass;
    vm.getStatusClass = getStatusClass;
    vm.printShortlist = printShortlist;

    init();

    function init() {
      loadJobs();
      loadApplicants();
    }

    function loadJobs() {
      JobService.getJobs()
        .then(function (res) {
          vm.jobs = res.jobs || [];
        });
    }

    function loadApplicants() {
      vm.isLoading = true;
      const params = {
        jobId: vm.filters.jobId,
        status: vm.filters.status,
        minScore: vm.filters.minScore > 0 ? vm.filters.minScore : undefined,
        search: vm.filters.search || undefined,
        sortBy: vm.filters.sortBy,
        sortOrder: vm.filters.sortOrder
      };

      ApplicantService.getApplicants(params)
        .then(function (res) {
          vm.applicants = res.applicants || [];
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to load applicants.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function applyFilters() {
      loadApplicants();
    }

    function resetFilters() {
      vm.filters = {
        jobId: 'All',
        status: 'All',
        minScore: 0,
        search: '',
        sortBy: 'score',
        sortOrder: 'desc'
      };
      loadApplicants();
    }

    function updateStatus(applicant, newStatus) {
      applicant.status = newStatus;
      ApplicantService.updateStatus(applicant._id, newStatus, applicant.recruiterNotes)
        .then(function () {
          AlertService.success('Status updated for ' + applicant.fullName + ' to ' + newStatus);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to update status.');
          loadApplicants();
        });
    }

    function viewDetail(id) {
      $location.path('/applicants/' + id);
    }

    function deleteApplicant(applicant, event) {
      if (event) event.stopPropagation();
      if (!confirm('Are you sure you want to delete ' + applicant.fullName + '?')) {
        return;
      }

      ApplicantService.deleteApplicant(applicant._id)
        .then(function () {
          AlertService.success('Applicant removed.');
          loadApplicants();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to delete applicant.');
        });
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

    function printShortlist() {
      window.print();
    }
  }
})();
