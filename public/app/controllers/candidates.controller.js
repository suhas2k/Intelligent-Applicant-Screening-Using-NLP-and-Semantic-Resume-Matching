(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('CandidatesController', CandidatesController);

  CandidatesController.$inject = ['ApplicantService', 'JobService', 'AlertService', '$location'];
  function CandidatesController(ApplicantService, JobService, AlertService, $location) {
    const vm = this;

    vm.applicants = [];
    vm.allApplicants = [];
    vm.jobs = [];
    vm.isLoading = true;
    vm.activeTab = 'All'; // 'All', 'Shortlisted', 'Interview', 'Hired', 'Reviewed'
    vm.searchQuery = '';
    vm.filterJobId = 'All';
    vm.filterStatus = 'All';
    vm.minScore = 0;

    // Pagination
    vm.currentPage = 1;
    vm.pageSize = 7;

    vm.loadApplicants = loadApplicants;
    vm.setStatusTab = setStatusTab;
    vm.applyFilters = applyFilters;
    vm.updateStatus = updateStatus;
    vm.viewDetail = viewDetail;
    vm.getStatusClass = getStatusClass;

    // Pagination helpers
    vm.totalPages = totalPages;
    vm.paginatedApplicants = paginatedApplicants;
    vm.setPage = setPage;
    vm.prevPage = prevPage;
    vm.nextPage = nextPage;
    vm.getPageNumbers = getPageNumbers;

    init();

    function init() {
      loadJobs();
      loadApplicants();
    }

    function loadJobs() {
      JobService.getJobs({ status: 'All' })
        .then(function (data) {
          vm.jobs = data.jobs || [];
        });
    }

    function loadApplicants() {
      vm.isLoading = true;
      vm.errorMessage = '';
      ApplicantService.getApplicants({ limit: 100 })
        .then(function (data) {
          vm.allApplicants = data.applicants || [];
          applyFilters();
        })
        .catch(function (err) {
          vm.errorMessage = err.message || 'Failed to load candidates.';
          AlertService.error(vm.errorMessage);
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function setStatusTab(tab) {
      vm.activeTab = tab;
      vm.currentPage = 1;
      applyFilters();
    }

    function applyFilters() {
      let list = [...vm.allApplicants];

      // Tab filter
      if (vm.activeTab !== 'All') {
        list = list.filter(a => a.status === vm.activeTab);
      }

      // Job filter
      if (vm.filterJobId !== 'All') {
        list = list.filter(a => (a.jobId?._id || a.jobId) === vm.filterJobId);
      }

      // Min Score filter
      if (vm.minScore > 0) {
        list = list.filter(a => (a.matchAnalysis?.overallScore || 0) >= vm.minScore);
      }

      // Search query
      if (vm.searchQuery && vm.searchQuery.trim()) {
        const q = vm.searchQuery.trim().toLowerCase();
        list = list.filter(a =>
          a.fullName.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.jobId?.title && a.jobId.title.toLowerCase().includes(q)) ||
          (a.extractedData?.skills && a.extractedData.skills.some(s => s.toLowerCase().includes(q)))
        );
      }

      vm.applicants = list;
    }

    function totalPages() {
      return Math.max(1, Math.ceil(vm.applicants.length / vm.pageSize));
    }

    function paginatedApplicants() {
      const start = (vm.currentPage - 1) * vm.pageSize;
      return vm.applicants.slice(start, start + vm.pageSize);
    }

    function setPage(p) {
      if (p >= 1 && p <= totalPages()) {
        vm.currentPage = p;
      }
    }

    function prevPage() {
      if (vm.currentPage > 1) vm.currentPage--;
    }

    function nextPage() {
      if (vm.currentPage < totalPages()) vm.currentPage++;
    }

    function getPageNumbers() {
      const total = totalPages();
      const pages = [];
      for (let i = 1; i <= Math.min(total, 6); i++) {
        pages.push(i);
      }
      return pages;
    }

    function updateStatus(applicant, newStatus) {
      ApplicantService.updateStatus(applicant._id, newStatus)
        .then(function (res) {
          applicant.status = newStatus;
          AlertService.success(`Status for ${applicant.fullName} updated to ${newStatus}.`);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to update status.');
        });
    }

    function getStatusClass(status) {
      switch (status) {
        case 'Shortlisted': return 'status-pill-shortlisted';
        case 'Interview': return 'status-pill-interview';
        case 'Hired': return 'status-pill-hired';
        case 'Reviewed': return 'status-pill-reviewed';
        case 'Rejected': return 'status-pill-rejected';
        default: return 'status-pill-reviewed';
      }
    }

    function viewDetail(id) {
      $location.path('/applicants/' + id);
    }
  }
})();
