(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('DashboardController', DashboardController);

  DashboardController.$inject = ['ApplicantService', 'AlertService', '$location'];
  function DashboardController(ApplicantService, AlertService, $location) {
    const vm = this;

    vm.stats = {};
    vm.topApplicants = [];
    vm.recentJobs = [];
    vm.database = {};
    vm.isLoading = true;

    vm.getScoreClass = getScoreClass;
    vm.getScoreBadgeClass = getScoreBadgeClass;
    vm.getStatusClass = getStatusClass;
    vm.viewApplicant = viewApplicant;
    vm.viewJob = viewJob;
    vm.refresh = loadDashboardData;

    init();

    function init() {
      loadDashboardData();
    }

    function loadDashboardData() {
      vm.isLoading = true;
      ApplicantService.getDashboardStats()
        .then(function (data) {
          vm.stats = data.stats || {};
          vm.topApplicants = data.topApplicants || [];
          vm.recentJobs = data.recentJobs || [];
          vm.database = data.database || {};
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to load dashboard data.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function getScoreClass(score) {
      if (score >= 80) return 'text-emerald-400';
      if (score >= 65) return 'text-sky-400';
      if (score >= 50) return 'text-amber-400';
      return 'text-rose-400';
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

    function viewApplicant(id) {
      $location.path('/applicants/' + id);
    }

    function viewJob(id) {
      $location.path('/jobs/' + id);
    }
  }
})();
