(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('JobDetailController', JobDetailController);

  JobDetailController.$inject = ['$routeParams', 'JobService', 'ApplicantService', 'AlertService', '$location', '$scope'];
  function JobDetailController($routeParams, JobService, ApplicantService, AlertService, $location, $scope) {
    const vm = this;
    const jobId = $routeParams.id;

    vm.job = null;
    vm.applicants = [];
    vm.isLoading = true;
    vm.isUploading = false;
    vm.uploadProgressMessage = '';

    vm.uploadFile = null;
    vm.bulkFiles = null;
    vm.candidateNameInput = '';

    // Quick test demo resume options
    vm.sampleResumes = [
      { name: 'Alex Morgan (Senior Full Stack)', file: 'Alex_Morgan_Senior_FullStack.txt' },
      { name: 'Priya Sharma (Lead NLP/ML)', file: 'Priya_Sharma_Lead_NLP.txt' },
      { name: 'David Kim (Frontend Developer)', file: 'David_Kim_Frontend_Dev.txt' },
      { name: 'Sophia Taylor (Product Manager)', file: 'Sophia_Taylor_Product_Manager.txt' }
    ];

    vm.loadJobDetails = loadJobDetails;
    vm.handleFileUpload = handleFileUpload;
    vm.handleBulkUpload = handleBulkUpload;
    vm.uploadSampleResume = uploadSampleResume;
    vm.updateApplicantStatus = updateApplicantStatus;
    vm.reEvaluateApplicant = reEvaluateApplicant;
    vm.deleteApplicant = deleteApplicant;
    vm.viewApplicantDetail = viewApplicantDetail;
    vm.getScoreBadgeClass = getScoreBadgeClass;
    vm.getStatusClass = getStatusClass;

    init();

    function init() {
      if (!jobId) {
        $location.path('/jobs');
        return;
      }
      loadJobDetails();
    }

    function loadJobDetails() {
      vm.isLoading = true;
      JobService.getJobById(jobId)
        .then(function (res) {
          vm.job = res.job;
          vm.applicants = res.applicants || [];
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to load job details.');
          $location.path('/jobs');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function handleFileUpload(file) {
      const selected = file || vm.uploadFile;
      if (!selected) {
        AlertService.error('Please choose a PDF or DOCX resume to upload.');
        return;
      }

      vm.isUploading = true;
      vm.uploadProgressMessage = 'Extracting resume text and running NLP semantic matching...';

      ApplicantService.uploadResume(selected, jobId, { fullName: vm.candidateNameInput })
        .then(function (res) {
          AlertService.success('Candidate ' + res.applicant.fullName + ' evaluated with Match Score: ' + res.applicant.matchAnalysis.overallScore + '%');
          vm.uploadFile = null;
          vm.candidateNameInput = '';
          // Reset file input element
          const fileInput = document.getElementById('resumeFileInput');
          if (fileInput) fileInput.value = '';
          loadJobDetails();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Resume upload and parsing failed.');
        })
        .finally(function () {
          vm.isUploading = false;
          vm.uploadProgressMessage = '';
        });
    }

    function handleBulkUpload(files) {
      const selectedFiles = files || vm.bulkFiles;
      if (!selectedFiles || selectedFiles.length === 0) {
        AlertService.error('Please select multiple resume files to upload.');
        return;
      }

      vm.isUploading = true;
      vm.uploadProgressMessage = 'Batch parsing ' + selectedFiles.length + ' resumes with local NLP engine...';

      ApplicantService.uploadBulkResumes(selectedFiles, jobId)
        .then(function (res) {
          AlertService.success(res.message);
          vm.bulkFiles = null;
          const bulkInput = document.getElementById('bulkResumeInput');
          if (bulkInput) bulkInput.value = '';
          loadJobDetails();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Bulk upload failed.');
        })
        .finally(function () {
          vm.isUploading = false;
          vm.uploadProgressMessage = '';
        });
    }

    // Helper: load sample resumes directly without needing user's local disk
    function uploadSampleResume(sample) {
      vm.isUploading = true;
      vm.uploadProgressMessage = 'Loading and screening ' + sample.name + '...';

      fetch('/sample_resumes/' + sample.file)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          const blob = new Blob([text], { type: 'text/plain' });
          const file = new File([blob], sample.file, { type: 'text/plain' });
          return ApplicantService.uploadResume(file, jobId, {});
        })
        .then(function (res) {
          AlertService.success('Evaluated ' + res.applicant.fullName + ' — Match Score: ' + res.applicant.matchAnalysis.overallScore + '%');
          loadJobDetails();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to load sample resume.');
        })
        .finally(function () {
          vm.isUploading = false;
          vm.uploadProgressMessage = '';
        });
    }

    function updateApplicantStatus(applicant, newStatus) {
      applicant.status = newStatus;
      ApplicantService.updateStatus(applicant._id, newStatus, applicant.recruiterNotes)
        .then(function () {
          AlertService.success('Status updated to ' + newStatus + ' for ' + applicant.fullName);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to update applicant status.');
          loadJobDetails();
        });
    }

    function reEvaluateApplicant(applicant) {
      vm.isLoading = true;
      ApplicantService.reEvaluate(applicant._id)
        .then(function (res) {
          AlertService.success('Applicant re-evaluated! New Score: ' + res.applicant.matchAnalysis.overallScore + '%');
          loadJobDetails();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Re-evaluation failed.');
          vm.isLoading = false;
        });
    }

    function deleteApplicant(applicant) {
      if (!confirm('Are you sure you want to remove ' + applicant.fullName + '?')) {
        return;
      }

      ApplicantService.deleteApplicant(applicant._id)
        .then(function () {
          AlertService.success('Applicant removed.');
          loadJobDetails();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to delete applicant.');
        });
    }

    function viewApplicantDetail(id) {
      $location.path('/applicants/' + id);
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
  }
})();
