(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('ScreeningController', ScreeningController);

  ScreeningController.$inject = ['JobService', 'ApplicantService', 'AlertService', '$location', '$timeout', '$http', '$scope'];
  function ScreeningController(JobService, ApplicantService, AlertService, $location, $timeout, $http, $scope) {
    const vm = this;

    // Jobs & Target Selection
    vm.jobs = [];
    vm.selectedJobId = '';
    vm.getSelectedJob = getSelectedJob;

    // File State
    vm.selectedFile = null;
    vm.selectedFileName = '';
    vm.selectedFileSize = '';
    vm.isDragging = false;

    // Pipeline State
    vm.isProcessing = false;
    vm.uploadProgress = 0;
    vm.pipelineProgress = 0;
    vm.currentStageIndex = 0;
    vm.pipelineStages = [];
    vm.errorStage = null;
    vm.errorMessage = null;

    // Results & Screening History
    vm.lastScreenedApplicant = null;
    vm.recentUploads = [];
    vm.allResults = [];
    vm.searchQuery = '';
    vm.statusFilter = 'All';
    vm.stats = {
      total: 0,
      highMatch: 0,
      mediumMatch: 0,
      lowMatch: 0
    };

    // Action Handlers
    vm.selectJob = selectJob;
    vm.onFileInputChange = onFileInputChange;
    vm.onFileDrop = onFileDrop;
    vm.triggerFileInput = triggerFileInput;
    vm.processResumeFile = processResumeFile;
    vm.retryScreening = retryScreening;
    vm.resetUpload = resetUpload;
    vm.screenSampleBenchmark = screenSampleBenchmark;
    vm.viewCandidate = viewCandidate;
    vm.formatFileSize = formatFileSize;
    vm.getFilteredResults = getFilteredResults;

    init();

    function init() {
      initStages();

      // Check query param for pre-selected job
      const queryParams = $location.search();
      const preJobId = queryParams.jobId;

      JobService.getJobs({ status: 'Active' })
        .then(function (data) {
          vm.jobs = data.jobs || [];
          if (preJobId) {
            vm.selectedJobId = preJobId;
          } else if (vm.jobs.length > 0) {
            vm.selectedJobId = vm.jobs[0]._id;
          }
        })
        .catch(function (err) {
          console.warn('[Screening] Could not load active jobs:', err.message);
        });

      loadScreeningHistory();
    }

    function initStages() {
      vm.pipelineStages = [
        { id: 1, name: 'Uploading Resume', status: 'pending', desc: 'Sending file payload to secure backend' },
        { id: 2, name: 'Validating Document', status: 'pending', desc: 'Verifying MIME type, file signature and integrity' },
        { id: 3, name: 'Extracting Resume Text', status: 'pending', desc: 'Parsing document streams via PDFParse & Mammoth' },
        { id: 4, name: 'Identifying Candidate Information', status: 'pending', desc: 'Extracting contact, education, and work history' },
        { id: 5, name: 'Extracting Skills', status: 'pending', desc: 'Mapping against 150+ technical and domain skill taxonomy' },
        { id: 6, name: 'Running NLP Matching', status: 'pending', desc: 'Executing semantic TF-IDF cosine similarity analysis' },
        { id: 7, name: 'Calculating Match Score', status: 'pending', desc: 'Computing weighted scores for skills, experience & education' },
        { id: 8, name: 'Saving Screening Results', status: 'pending', desc: 'Persisting candidate screening record to database' },
        { id: 9, name: 'Processing Complete', status: 'pending', desc: 'Candidate evaluation ready for recruiter review' }
      ];
    }

    function getSelectedJob() {
      if (!vm.selectedJobId || !vm.jobs.length) return null;
      return vm.jobs.find(function (j) { return j._id === vm.selectedJobId; }) || null;
    }

    function selectJob(id) {
      vm.selectedJobId = id;
    }

    function triggerFileInput() {
      if (vm.isProcessing) return;
      const elem = document.getElementById('fileInput');
      if (elem) elem.click();
    }

    function onFileInputChange(inputElem) {
      if (!inputElem || !inputElem.files || inputElem.files.length === 0) return;
      const file = inputElem.files[0];
      $scope.$apply(function () {
        handleFileSelection(file);
      });
      // Clear value so the same file can be selected again if desired
      inputElem.value = '';
    }

    function onFileDrop(files) {
      if (vm.isProcessing) return;
      if (!files || files.length === 0) return;
      handleFileSelection(files[0]);
    }

    function handleFileSelection(file) {
      if (!file) return;

      // Validate target job selected
      if (!vm.selectedJobId) {
        AlertService.error('Please select a target job requisition before uploading a resume.');
        return;
      }

      // Validate extension
      const validExtensions = ['.pdf', '.docx', '.doc'];
      const ext = (file.name.substring(file.name.lastIndexOf('.')) || '').toLowerCase();
      if (!validExtensions.includes(ext)) {
        AlertService.error(`Unsupported file "${file.name}". Please upload a valid PDF (.pdf) or Word document (.docx).`);
        return;
      }

      // Validate file size (15MB maximum)
      const maxBytes = 15 * 1024 * 1024;
      if (file.size > maxBytes) {
        AlertService.error(`File size (${formatFileSize(file.size)}) exceeds the maximum allowable limit of 15MB.`);
        return;
      }

      vm.selectedFile = file;
      vm.selectedFileName = file.name;
      vm.selectedFileSize = formatFileSize(file.size);

      // Start automatic end-to-end screening pipeline
      processResumeFile(file);
    }

    function processResumeFile(file) {
      if (!file) return;

      if (!vm.selectedJobId) {
        AlertService.error('Please select a target job position first.');
        return;
      }

      vm.isProcessing = true;
      vm.errorStage = null;
      vm.errorMessage = null;
      vm.lastScreenedApplicant = null;
      initStages();

      // Step 1: Uploading Resume
      setStageStatus(1, 'active');
      vm.pipelineProgress = 12;

      // Progress simulation timers for visible pipeline stages while server parses NLP
      let stageTimer1, stageTimer2, stageTimer3, stageTimer4;

      stageTimer1 = $timeout(function () {
        if (!vm.isProcessing || vm.errorStage) return;
        setStageStatus(1, 'complete');
        setStageStatus(2, 'complete');
        setStageStatus(3, 'active');
        vm.pipelineProgress = 35;
      }, 500);

      stageTimer2 = $timeout(function () {
        if (!vm.isProcessing || vm.errorStage) return;
        setStageStatus(3, 'complete');
        setStageStatus(4, 'complete');
        setStageStatus(5, 'active');
        vm.pipelineProgress = 60;
      }, 1000);

      stageTimer3 = $timeout(function () {
        if (!vm.isProcessing || vm.errorStage) return;
        setStageStatus(5, 'complete');
        setStageStatus(6, 'active');
        vm.pipelineProgress = 75;
      }, 1500);

      stageTimer4 = $timeout(function () {
        if (!vm.isProcessing || vm.errorStage) return;
        setStageStatus(6, 'complete');
        setStageStatus(7, 'complete');
        setStageStatus(8, 'active');
        vm.pipelineProgress = 90;
      }, 2000);

      // Execute actual backend upload and screening
      ApplicantService.uploadResume(file, vm.selectedJobId, null, function (uploadPct) {
        $scope.$applyAsync(function () {
          vm.uploadProgress = uploadPct;
          if (uploadPct < 100) {
            vm.pipelineProgress = Math.round(uploadPct * 0.25);
          }
        });
      })
      .then(function (res) {
        $timeout.cancel(stageTimer1);
        $timeout.cancel(stageTimer2);
        $timeout.cancel(stageTimer3);
        $timeout.cancel(stageTimer4);

        // Mark all preceding stages complete
        for (let i = 1; i <= 8; i++) {
          setStageStatus(i, 'complete');
        }
        setStageStatus(9, 'complete');
        vm.pipelineProgress = 100;

        const applicant = res.applicant;
        vm.lastScreenedApplicant = applicant;

        const overallScore = applicant?.matchAnalysis?.overallScore || 0;
        const candidateName = applicant?.fullName || 'Candidate';
        const jobTitle = applicant?.jobTitle || (getSelectedJob() && getSelectedJob().title) || 'Position';

        AlertService.success(`Resume successfully screened for ${candidateName} against "${jobTitle}" with a match score of ${overallScore}%.`);

        // Refresh database history and KPI metrics
        loadScreeningHistory();
      })
      .catch(function (err) {
        $timeout.cancel(stageTimer1);
        $timeout.cancel(stageTimer2);
        $timeout.cancel(stageTimer3);
        $timeout.cancel(stageTimer4);

        const currentActive = vm.pipelineStages.find(function (s) { return s.status === 'active'; }) || vm.pipelineStages[0];
        vm.errorStage = currentActive.name;
        currentActive.status = 'error';
        vm.errorMessage = err.message || 'An error occurred during resume processing. Please verify file integrity and try again.';

        AlertService.error(vm.errorMessage);
      })
      .finally(function () {
        $timeout(function () {
          vm.isProcessing = false;
        }, 500);
      });
    }

    function setStageStatus(stageId, status) {
      const stage = vm.pipelineStages.find(function (s) { return s.id === stageId; });
      if (stage) {
        stage.status = status;
        vm.currentStageIndex = stageId;
      }
    }

    function retryScreening() {
      if (vm.selectedFile) {
        processResumeFile(vm.selectedFile);
      } else {
        triggerFileInput();
      }
    }

    function resetUpload() {
      vm.selectedFile = null;
      vm.selectedFileName = '';
      vm.selectedFileSize = '';
      vm.isProcessing = false;
      vm.errorStage = null;
      vm.errorMessage = null;
      vm.lastScreenedApplicant = null;
      initStages();

      const elem = document.getElementById('fileInput');
      if (elem) elem.value = '';
    }

    function screenSampleBenchmark(sampleFilename) {
      if (!vm.selectedJobId) {
        AlertService.error('Please select a target job position first.');
        return;
      }

      // Map button filename to real available sample PDF
      const map = {
        'priya_sharma_nlp.pdf': 'Priya_Sharma_Lead_NLP.pdf',
        'david_kim_frontend.pdf': 'David_Kim_Frontend_Dev.pdf',
        'casey_kim_engineer.pdf': 'Alex_Morgan_Senior_FullStack.pdf'
      };
      const actualFile = map[sampleFilename] || sampleFilename;

      $http.get('/sample_resumes/' + actualFile, { responseType: 'blob' })
        .then(function (response) {
          const blob = response.data;
          const file = new File([blob], actualFile, { type: 'application/pdf' });
          handleFileSelection(file);
        })
        .catch(function (err) {
          AlertService.error('Could not load sample resume benchmark: ' + (err.message || 'File not found.'));
        });
    }

    function loadScreeningHistory() {
      ApplicantService.getApplicants({ limit: 50 })
        .then(function (data) {
          const list = data.applicants || [];
          vm.allResults = list;

          vm.recentUploads = list.slice(0, 5).map(function (app) {
            const fileName = (app.resumeFile && app.resumeFile.originalName) || `${app.fullName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
            return {
              id: app._id,
              name: fileName,
              candidateName: app.fullName,
              targetJob: app.jobId?.title || (app.jobTitle || 'Software Engineer'),
              timeAgo: formatTimeAgo(app.createdAt),
              score: app.matchAnalysis?.overallScore || 0,
              status: app.status || 'New'
            };
          });

          vm.stats.total = list.length;
          vm.stats.highMatch = list.filter(function (a) { return (a.matchAnalysis?.overallScore || 0) >= 80; }).length;
          vm.stats.mediumMatch = list.filter(function (a) {
            const score = a.matchAnalysis?.overallScore || 0;
            return score >= 60 && score < 80;
          }).length;
          vm.stats.lowMatch = list.filter(function (a) { return (a.matchAnalysis?.overallScore || 0) < 60; }).length;
        })
        .catch(function (err) {
          console.warn('[Screening] Could not load applicant history:', err.message);
        });
    }

    function getFilteredResults() {
      let results = vm.allResults || [];

      // Search Filter
      if (vm.searchQuery && vm.searchQuery.trim()) {
        const q = vm.searchQuery.toLowerCase().trim();
        results = results.filter(function (app) {
          const name = (app.fullName || '').toLowerCase();
          const job = (app.jobId?.title || '').toLowerCase();
          const skills = (app.extractedData?.skills || []).join(' ').toLowerCase();
          return name.includes(q) || job.includes(q) || skills.includes(q);
        });
      }

      // Status / Match Score Filter
      if (vm.statusFilter === 'High') {
        results = results.filter(function (a) { return (a.matchAnalysis?.overallScore || 0) >= 80; });
      } else if (vm.statusFilter === 'Medium') {
        results = results.filter(function (a) {
          const s = a.matchAnalysis?.overallScore || 0;
          return s >= 60 && s < 80;
        });
      } else if (vm.statusFilter === 'Low') {
        results = results.filter(function (a) { return (a.matchAnalysis?.overallScore || 0) < 60; });
      }

      return results;
    }

    function viewCandidate(id) {
      if (id) {
        $location.path('/applicants/' + id);
      }
    }

    function formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function formatTimeAgo(dateString) {
      if (!dateString) return 'Recently';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return diffMin + 'm ago';
      if (diffHours < 24) return diffHours + 'h ago';
      if (diffDays === 1) return 'Yesterday';
      return diffDays + 'd ago';
    }
  }
})();
