(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('InterviewsController', InterviewsController);

  InterviewsController.$inject = ['InterviewService', 'ApplicantService', 'AlertService', '$timeout'];
  function InterviewsController(InterviewService, ApplicantService, AlertService, $timeout) {
    const vm = this;

    vm.interviews = [];
    vm.allInterviews = [];
    vm.applicants = [];
    vm.isLoading = true;
    vm.errorMessage = '';
    vm.searchQuery = '';
    vm.filterType = 'All';

    // Calendar state
    const today = new Date();
    vm.currentMonth = today.getMonth(); // 0-indexed
    vm.currentYear = today.getFullYear();
    vm.monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    vm.calendarDays = [];
    vm.selectedDateStr = formatDateKey(today);

    // Modals
    vm.showScheduleModal = false;
    vm.showRescheduleModal = false;
    vm.scheduleForm = {};
    vm.rescheduleForm = {};
    vm.selectedInterview = null;

    // Functions
    vm.loadInterviews = loadInterviews;
    vm.prevMonth = prevMonth;
    vm.nextMonth = nextMonth;
    vm.selectDate = selectDate;
    vm.hasInterviewOnDate = hasInterviewOnDate;
    vm.openScheduleModal = openScheduleModal;
    vm.closeScheduleModal = closeScheduleModal;
    vm.onCandidateSelect = onCandidateSelect;
    vm.submitSchedule = submitSchedule;
    vm.openRescheduleModal = openRescheduleModal;
    vm.closeRescheduleModal = closeRescheduleModal;
    vm.submitReschedule = submitReschedule;
    vm.cancelInterview = cancelInterview;
    vm.applyFilters = applyFilters;
    vm.getRoundBadgeClass = getRoundBadgeClass;

    init();

    function init() {
      generateCalendar();
      loadApplicants();
      loadInterviews();
    }

    function loadApplicants() {
      ApplicantService.getApplicants({ limit: 50 })
        .then(function (data) {
          vm.applicants = data.applicants || [];
        })
        .catch(function () {
          vm.applicants = [];
        });
    }

    function loadInterviews() {
      vm.isLoading = true;
      vm.errorMessage = '';
      InterviewService.getInterviews()
        .then(function (data) {
          vm.allInterviews = data.interviews || [];
          applyFilters();
        })
        .catch(function (err) {
          vm.errorMessage = err.message || 'Failed to load interviews.';
          AlertService.error(vm.errorMessage);
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function applyFilters() {
      let list = [...vm.allInterviews];

      if (vm.filterType !== 'All') {
        list = list.filter(i => i.type === vm.filterType);
      }

      if (vm.searchQuery && vm.searchQuery.trim()) {
        const q = vm.searchQuery.trim().toLowerCase();
        list = list.filter(i =>
          (i.candidateName && i.candidateName.toLowerCase().includes(q)) ||
          (i.role && i.role.toLowerCase().includes(q)) ||
          (i.interviewer && i.interviewer.toLowerCase().includes(q))
        );
      }

      vm.interviews = list;
    }

    function generateCalendar() {
      const year = vm.currentYear;
      const month = vm.currentMonth;

      const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      const days = [];

      // Prev month filler
      for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        days.push({
          day: d,
          dateStr: formatDateKey(new Date(year, month - 1, d)),
          isCurrentMonth: false,
          isToday: false
        });
      }

      // Current month
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month, d);
        const dtStr = formatDateKey(dt);
        const isToday = dt.toDateString() === today.toDateString();
        days.push({
          day: d,
          dateStr: dtStr,
          isCurrentMonth: true,
          isToday: isToday
        });
      }

      // Next month filler to make 35 or 42 cells
      const totalCells = Math.ceil(days.length / 7) * 7;
      let nextDay = 1;
      while (days.length < totalCells) {
        days.push({
          day: nextDay,
          dateStr: formatDateKey(new Date(year, month + 1, nextDay)),
          isCurrentMonth: false,
          isToday: false
        });
        nextDay++;
      }

      vm.calendarDays = days;
    }

    function formatDateKey(d) {
      if (!d) return '';
      if (typeof d === 'string') return d;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    function prevMonth() {
      if (vm.currentMonth === 0) {
        vm.currentMonth = 11;
        vm.currentYear--;
      } else {
        vm.currentMonth--;
      }
      generateCalendar();
    }

    function nextMonth() {
      if (vm.currentMonth === 11) {
        vm.currentMonth = 0;
        vm.currentYear++;
      } else {
        vm.currentMonth++;
      }
      generateCalendar();
    }

    function selectDate(dateObj) {
      vm.selectedDateStr = dateObj.dateStr;
    }

    function hasInterviewOnDate(dateStr) {
      return vm.allInterviews.some(i => i.date === dateStr);
    }

    function openScheduleModal() {
      let initDate = new Date();
      if (vm.selectedDateStr) {
        const parts = vm.selectedDateStr.split('-');
        if (parts.length === 3) {
          initDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
      }

      vm.scheduleForm = {
        candidateName: '',
        candidateEmail: '',
        role: '',
        date: initDate,
        time: '11:00 AM - 12:00 PM',
        type: 'Technical Round',
        interviewer: 'Suhas',
        notes: ''
      };
      vm.showScheduleModal = true;
    }

    function closeScheduleModal() {
      vm.showScheduleModal = false;
    }

    function onCandidateSelect(cand) {
      if (cand) {
        vm.scheduleForm.candidateName = cand.fullName;
        vm.scheduleForm.candidateEmail = cand.email;
        vm.scheduleForm.role = cand.jobId?.title || 'Software Engineer';
        vm.scheduleForm.applicantId = cand._id;
        vm.scheduleForm.jobId = cand.jobId?._id || cand.jobId;
      }
    }

    function submitSchedule() {
      if (!vm.scheduleForm.candidateName || !vm.scheduleForm.role || !vm.scheduleForm.date) {
        AlertService.warning('Please enter candidate name, position, and interview date.');
        return;
      }

      const payload = {
        ...vm.scheduleForm,
        date: formatDateKey(vm.scheduleForm.date)
      };

      InterviewService.scheduleInterview(payload)
        .then(function (res) {
          AlertService.success(res.message || 'Interview scheduled successfully.');
          closeScheduleModal();
          loadInterviews();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to schedule interview.');
        });
    }

    function openRescheduleModal(item) {
      vm.selectedInterview = item;
      let initDate = new Date();
      if (item.date) {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          initDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
      }

      vm.rescheduleForm = {
        date: initDate,
        time: item.time,
        reason: 'Recruiter / Candidate availability adjustment'
      };
      vm.showRescheduleModal = true;
    }

    function closeRescheduleModal() {
      vm.showRescheduleModal = false;
      vm.selectedInterview = null;
    }

    function submitReschedule() {
      if (!vm.selectedInterview || !vm.rescheduleForm.date) return;

      const payload = {
        ...vm.rescheduleForm,
        date: formatDateKey(vm.rescheduleForm.date)
      };

      InterviewService.rescheduleInterview(vm.selectedInterview._id, payload)
        .then(function (res) {
          AlertService.success(res.message || 'Interview rescheduled.');
          closeRescheduleModal();
          loadInterviews();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to reschedule.');
        });
    }

    function cancelInterview(item) {
      if (!confirm(`Are you sure you want to cancel the interview for ${item.candidateName}?`)) {
        return;
      }

      InterviewService.cancelInterview(item._id)
        .then(function (res) {
          AlertService.success(res.message || 'Interview cancelled.');
          loadInterviews();
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to cancel interview.');
        });
    }

    function getRoundBadgeClass(type) {
      switch (type) {
        case 'Technical Round': return 'badge-technical';
        case 'HR Round': return 'badge-hr';
        case 'Behavioral': return 'badge-behavioral';
        case 'Management': return 'badge-management';
        default: return 'badge-technical';
      }
    }
  }
})();
