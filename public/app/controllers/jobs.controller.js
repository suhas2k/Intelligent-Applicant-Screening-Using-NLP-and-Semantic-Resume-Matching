(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('JobsController', JobsController);

  JobsController.$inject = ['JobService', 'AlertService', '$location', '$scope'];
  function JobsController(JobService, AlertService, $location, $scope) {
    const vm = this;

    vm.jobs = [];
    vm.allJobs = [];
    vm.isLoading = true;
    vm.viewMode = 'table'; // 'table' (IMAGE 2 Screen 2) or 'cards' (rich cards)
    vm.activeTab = 'All';  // 'All', 'Active', 'Draft', 'Closed'
    vm.searchQuery = '';
    vm.filterDepartment = 'All';
    vm.filterLocation = 'All';

    // Pagination
    vm.currentPage = 1;
    vm.pageSize = 5;

    vm.isEditing = false;
    vm.selectedJob = null;
    vm.jobToDelete = null;

    vm.departments = ['Engineering', 'Design & UX', 'Platform', 'AI/ML', 'Marketing', 'Product'];
    vm.locations = ['Remote', 'San Francisco', 'Hyderabad', 'Bangalore', 'New York'];

    vm.jobForm = {
      title: '',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'Full-time',
      description: '',
      requiredSkillsInput: '',
      preferredSkillsInput: '',
      minExperience: 3,
      education: 'Bachelor',
      weights: {
        skills: 40,
        similarity: 30,
        experience: 20,
        education: 10
      },
      status: 'Active'
    };

    vm.loadJobs = loadJobs;
    vm.setStatusTab = setStatusTab;
    vm.applyFilters = applyFilters;
    vm.setViewMode = setViewMode;
    vm.openCreateModal = openCreateModal;
    vm.openEditModal = openEditModal;
    vm.saveJob = saveJob;
    vm.confirmDeleteJob = confirmDeleteJob;
    vm.executeDeleteJob = executeDeleteJob;
    vm.viewJobDetail = viewJobDetail;
    vm.screenJob = screenJob;
    vm.getTotalWeight = getTotalWeight;
    vm.normalizeWeights = normalizeWeights;

    // Pagination helpers
    vm.totalPages = totalPages;
    vm.paginatedJobs = paginatedJobs;
    vm.setPage = setPage;
    vm.prevPage = prevPage;
    vm.nextPage = nextPage;
    vm.getPageNumbers = getPageNumbers;

    init();

    function init() {
      loadJobs();
    }

    function loadJobs() {
      vm.isLoading = true;
      vm.errorMessage = '';
      JobService.getJobs({ status: 'All' })
        .then(function (data) {
          vm.allJobs = data.jobs || [];
          applyFilters();
        })
        .catch(function (err) {
          vm.errorMessage = err.message || 'Failed to load job postings.';
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

    function setViewMode(mode) {
      vm.viewMode = mode;
    }

    function applyFilters() {
      let list = [...vm.allJobs];

      // Status tab
      if (vm.activeTab !== 'All') {
        list = list.filter(j => j.status === vm.activeTab);
      }

      // Department filter
      if (vm.filterDepartment !== 'All') {
        list = list.filter(j => j.department === vm.filterDepartment);
      }

      // Location filter
      if (vm.filterLocation !== 'All') {
        list = list.filter(j => (j.location || '').toLowerCase().includes(vm.filterLocation.toLowerCase()));
      }

      // Search query
      if (vm.searchQuery && vm.searchQuery.trim()) {
        const q = vm.searchQuery.trim().toLowerCase();
        list = list.filter(j =>
          j.title.toLowerCase().includes(q) ||
          (j.department && j.department.toLowerCase().includes(q)) ||
          (j.location && j.location.toLowerCase().includes(q)) ||
          (j.requiredSkills && j.requiredSkills.some(s => s.toLowerCase().includes(q)))
        );
      }

      vm.jobs = list;
    }

    function totalPages() {
      return Math.max(1, Math.ceil(vm.jobs.length / vm.pageSize));
    }

    function paginatedJobs() {
      const start = (vm.currentPage - 1) * vm.pageSize;
      return vm.jobs.slice(start, start + vm.pageSize);
    }

    function setPage(p) {
      if (p >= 1 && p <= totalPages()) {
        vm.currentPage = p;
      }
    }

    function prevPage() {
      if (vm.currentPage > 1) {
        vm.currentPage--;
      }
    }

    function nextPage() {
      if (vm.currentPage < totalPages()) {
        vm.currentPage++;
      }
    }

    function getPageNumbers() {
      const total = totalPages();
      const pages = [];
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    }

    function openCreateModal() {
      vm.isEditing = false;
      vm.selectedJob = null;
      vm.jobForm = {
        title: '',
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'Full-time',
        description: '',
        requiredSkillsInput: 'JavaScript, Node.js, Express, MongoDB',
        preferredSkillsInput: 'TypeScript, Docker, AWS',
        minExperience: 3,
        education: 'Bachelor',
        weights: {
          skills: 40,
          similarity: 30,
          experience: 20,
          education: 10
        },
        status: 'Active'
      };

      const modalEl = document.getElementById('jobModal');
      if (modalEl && window.bootstrap) {
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
      }
    }

    function openEditModal(job) {
      vm.isEditing = true;
      vm.selectedJob = job;
      vm.jobForm = {
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        description: job.description,
        requiredSkillsInput: (job.requiredSkills || []).join(', '),
        preferredSkillsInput: (job.preferredSkills || []).join(', '),
        minExperience: job.minExperience || 0,
        education: job.education || 'Bachelor',
        weights: {
          skills: job.weights?.skills ?? 40,
          similarity: job.weights?.similarity ?? 30,
          experience: job.weights?.experience ?? 20,
          education: job.weights?.education ?? 10
        },
        status: job.status || 'Active'
      };

      const modalEl = document.getElementById('jobModal');
      if (modalEl && window.bootstrap) {
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
      }
    }

    function getTotalWeight() {
      const w = vm.jobForm.weights;
      return (Number(w.skills) || 0) + (Number(w.similarity) || 0) + (Number(w.experience) || 0) + (Number(w.education) || 0);
    }

    function normalizeWeights() {
      const total = getTotalWeight();
      if (total === 0) return;
      const w = vm.jobForm.weights;
      w.skills = Math.round((w.skills / total) * 100);
      w.similarity = Math.round((w.similarity / total) * 100);
      w.experience = Math.round((w.experience / total) * 100);
      w.education = 100 - (w.skills + w.similarity + w.experience);
    }

    function saveJob() {
      if (!vm.jobForm.title || !vm.jobForm.description) {
        AlertService.error('Please enter a job title and description.');
        return;
      }

      const totalWeight = getTotalWeight();
      if (totalWeight !== 100) {
        AlertService.warning('Total matching weights should equal 100%. Click Auto-Balance to adjust.');
        return;
      }

      const payload = {
        title: vm.jobForm.title,
        department: vm.jobForm.department,
        location: vm.jobForm.location,
        employmentType: vm.jobForm.employmentType,
        description: vm.jobForm.description,
        requiredSkills: vm.jobForm.requiredSkillsInput,
        preferredSkills: vm.jobForm.preferredSkillsInput,
        minExperience: Number(vm.jobForm.minExperience),
        education: vm.jobForm.education,
        weights: vm.jobForm.weights,
        status: vm.jobForm.status
      };

      const request = vm.isEditing
        ? JobService.updateJob(vm.selectedJob._id, payload)
        : JobService.createJob(payload);

      request
        .then(function () {
          AlertService.success(vm.isEditing ? 'Job posting updated successfully.' : 'Job posting created successfully.');
          const modalEl = document.getElementById('jobModal');
          if (modalEl && window.bootstrap) {
            const modal = window.bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
          loadJobs();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to save job posting.');
        });
    }

    function confirmDeleteJob(job) {
      vm.jobToDelete = job;
      const modalEl = document.getElementById('deleteJobModal');
      if (modalEl && window.bootstrap) {
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
      }
    }

    function executeDeleteJob() {
      if (!vm.jobToDelete) return;
      JobService.deleteJob(vm.jobToDelete._id)
        .then(function () {
          AlertService.success(`Job "${vm.jobToDelete.title}" deleted.`);
          const modalEl = document.getElementById('deleteJobModal');
          if (modalEl && window.bootstrap) {
            const modal = window.bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
          vm.jobToDelete = null;
          loadJobs();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to delete job posting.');
        });
    }

    function viewJobDetail(id) {
      $location.path('/jobs/' + id);
    }

    function screenJob(id) {
      $location.path('/screening').search({ jobId: id });
    }
  }
})();
