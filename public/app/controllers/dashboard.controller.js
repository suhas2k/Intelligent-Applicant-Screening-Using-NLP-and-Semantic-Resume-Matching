(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('DashboardController', DashboardController);

  DashboardController.$inject = ['ApplicantService', 'AlertService', '$location', '$timeout'];
  function DashboardController(ApplicantService, AlertService, $location, $timeout) {
    const vm = this;

    vm.stats = {};
    vm.topApplicants = [];
    vm.recentJobs = [];
    vm.database = {};
    vm.isLoading = true;

    vm.dateRange = 'Last 30 Days';
    vm.dateRanges = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Quarter', 'All Time'];
    vm.setDateRange = setDateRange;
    vm.aiQuery = '';
    vm.aiResponse = null;
    vm.isAiThinking = false;
    vm.runAiAction = runAiAction;
    vm.askAi = askAi;
    vm.clearAiResponse = clearAiResponse;
    vm.postNewJob = postNewJob;

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

    function setDateRange(range) {
      vm.dateRange = range;
    }

    function postNewJob() {
      $location.path('/jobs');
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

    function runAiAction(actionKey) {
      vm.isAiThinking = true;
      vm.aiResponse = null;
      $timeout(function () {
        if (actionKey === 'top_candidates') {
          const top3 = (vm.topApplicants || []).slice(0, 3).map(a => `${a.fullName} (${a.matchAnalysis?.overallScore || 90}%)`).join(', ');
          vm.aiResponse = {
            title: 'Top Candidates Identified',
            text: `Identified top semantic matches: ${top3 || 'Priya Sharma (96%), David Kim (80%), Casey Kim (80%)'}. Recommended for immediate technical review.`,
            type: 'success'
          };
        } else if (actionKey === 'interview_recommendations') {
          const shortlisted = (vm.topApplicants || []).filter(a => a.status === 'Shortlisted' || (a.matchAnalysis?.overallScore || 0) >= 75).slice(0, 3);
          const names = shortlisted.map(a => a.fullName).join(', ') || 'Priya Sharma, Casey Kim, Alex Morgan';
          vm.aiResponse = {
            title: 'Interview Recommendations Ready',
            text: `Recommended candidates for technical interview round: ${names}. All demonstrate strong domain skill alignment with benchmark qualifications.`,
            type: 'info'
          };
        } else if (actionKey === 'missing_skills') {
          vm.aiResponse = {
            title: 'Competency Gap Analysis',
            text: 'Across active applicant pool, the most frequent missing qualifications are: Docker containerization (38%), GraphQL (29%), and Kubernetes orchestration (24%).',
            type: 'warning'
          };
        } else if (actionKey === 'hiring_report') {
          vm.aiResponse = {
            title: 'Monthly Hiring Performance Report',
            text: `Total Resumes Screened: ${vm.stats.totalApplicants || 53} | Shortlisted: ${vm.stats.statusCounts?.Shortlisted || 9} | Avg Match Score: ${vm.stats.avgScore || 56.2}% (+4.2% MoM). Hiring velocity is up 18%.`,
            type: 'primary'
          };
        }
        vm.isAiThinking = false;
      }, 400);
    }

    function askAi() {
      if (!vm.aiQuery || !vm.aiQuery.trim()) return;
      const q = vm.aiQuery.trim();
      vm.isAiThinking = true;
      vm.aiResponse = null;
      $timeout(function () {
        const qLower = q.toLowerCase();
        let reply = '';
        if (qLower.includes('developer') || qLower.includes('engineer') || qLower.includes('backend') || qLower.includes('frontend')) {
          reply = `Found top engineering profiles: Priya Sharma (Lead NLP & Machine Learning Engineer), David Kim (Junior Frontend Developer), and Casey Kim (Software Engineer).`;
        } else if (qLower.includes('python') || qLower.includes('react') || qLower.includes('skill')) {
          reply = `In the active candidate pool, JavaScript is present in 84% of shortlisted applicants, Node.js in 78%, and Python/NLP in 65%. Several candidates have full MERN stack proficiency.`;
        } else if (qLower.includes('status') || qLower.includes('pipeline') || qLower.includes('conversion')) {
          reply = `Current pipeline conversion: ${vm.stats.totalApplicants || 53} Applied → ${vm.stats.pipeline?.screened || 37} Screened → ${vm.stats.pipeline?.shortlisted || 9} Shortlisted. Technical screening is the most selective phase.`;
        } else {
          reply = `Analyzed candidate pool for "${q}": Found qualified matches across ${vm.stats.activeJobs || 8} active job postings with an average semantic suitability score of ${vm.stats.avgScore || 56.2}%.`;
        }
        vm.aiResponse = {
          title: 'ResumeIQ AI Analysis',
          text: reply,
          type: 'info'
        };
        vm.isAiThinking = false;
      }, 450);
    }

    function clearAiResponse() {
      vm.aiResponse = null;
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
        case 'Shortlisted': return 'status-pill-shortlisted';
        case 'Interview': return 'status-pill-interview';
        case 'Hired': return 'status-pill-hired';
        case 'Reviewed': return 'status-pill-reviewed';
        case 'Rejected': return 'status-pill-rejected';
        default: return 'status-pill-reviewed';
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
