(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('JobsController', JobsController);

  JobsController.$inject = ['JobService', 'AlertService', '$location'];
  function JobsController(JobService, AlertService, $location) {
    const vm = this;

    vm.jobs = [];
    vm.isLoading = true;
    vm.filterStatus = 'All';
    vm.searchQuery = '';

    vm.isEditing = false;
    vm.selectedJob = null;

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
    vm.openCreateModal = openCreateModal;
    vm.openEditModal = openEditModal;
    vm.saveJob = saveJob;
    vm.deleteJob = deleteJob;
    vm.viewJobDetail = viewJobDetail;
    vm.getTotalWeight = getTotalWeight;
    vm.normalizeWeights = normalizeWeights;

    init();

    function init() {
      loadJobs();
    }

    function loadJobs() {
      vm.isLoading = true;
      JobService.getJobs({ status: vm.filterStatus, search: vm.searchQuery })
        .then(function (data) {
          vm.jobs = data.jobs || [];
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to load job postings.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
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

    function saveJob() {
      if (!vm.jobForm.title || !vm.jobForm.description) {
        AlertService.error('Job title and description are required.');
        return;
      }

      const reqSkills = vm.jobForm.requiredSkillsInput
        ? vm.jobForm.requiredSkillsInput.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (reqSkills.length === 0) {
        AlertService.error('Please enter at least one required skill (comma-separated).');
        return;
      }

      const prefSkills = vm.jobForm.preferredSkillsInput
        ? vm.jobForm.preferredSkillsInput.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        title: vm.jobForm.title,
        department: vm.jobForm.department,
        location: vm.jobForm.location,
        employmentType: vm.jobForm.employmentType,
        description: vm.jobForm.description,
        requiredSkills: reqSkills,
        preferredSkills: prefSkills,
        minExperience: Number(vm.jobForm.minExperience),
        education: vm.jobForm.education,
        weights: {
          skills: Number(vm.jobForm.weights.skills),
          similarity: Number(vm.jobForm.weights.similarity),
          experience: Number(vm.jobForm.weights.experience),
          education: Number(vm.jobForm.weights.education)
        },
        status: vm.jobForm.status
      };

      if (vm.isEditing && vm.selectedJob) {
        JobService.updateJob(vm.selectedJob._id, payload)
          .then(function (res) {
            AlertService.success(res.message || 'Job posting updated successfully!');
            closeModal();
            loadJobs();
          })
          .catch(function (err) {
            AlertService.error(err.message || 'Failed to update job posting.');
          });
      } else {
        JobService.createJob(payload)
          .then(function (res) {
            AlertService.success('Job posting created successfully!');
            closeModal();
            loadJobs();
          })
          .catch(function (err) {
            AlertService.error(err.message || 'Failed to create job posting.');
          });
      }
    }

    function deleteJob(job, event) {
      if (event) event.stopPropagation();
      if (!confirm('Are you sure you want to delete "' + job.title + '"? This will remove all associated applicants.')) {
        return;
      }

      JobService.deleteJob(job._id)
        .then(function () {
          AlertService.success('Job posting deleted successfully.');
          loadJobs();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to delete job posting.');
        });
    }

    function closeModal() {
      const modalEl = document.getElementById('jobModal');
      if (modalEl && window.bootstrap) {
        const modal = window.bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
    }

    function viewJobDetail(id) {
      $location.path('/jobs/' + id);
    }

    function getTotalWeight() {
      const w = vm.jobForm.weights;
      return (Number(w.skills) || 0) + (Number(w.similarity) || 0) + (Number(w.experience) || 0) + (Number(w.education) || 0);
    }

    function normalizeWeights() {
      vm.jobForm.weights = {
        skills: 40,
        similarity: 30,
        experience: 20,
        education: 10
      };
    }
  }
})();
