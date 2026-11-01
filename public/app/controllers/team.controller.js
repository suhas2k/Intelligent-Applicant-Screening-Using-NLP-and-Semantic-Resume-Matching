(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('TeamController', TeamController);

  TeamController.$inject = ['TeamService', 'AlertService'];
  function TeamController(TeamService, AlertService) {
    const vm = this;

    vm.team = [];
    vm.allMembers = [];
    vm.organization = {};
    vm.isLoading = true;
    vm.activeTab = 'members'; // 'members', 'roles', 'organization', 'preferences'
    vm.searchQuery = '';
    vm.filterRole = 'All';

    // Invite Modal
    vm.showInviteModal = false;
    vm.inviteForm = {
      name: '',
      email: '',
      role: 'Interviewer',
      accessScope: 'View Candidates, Interviews'
    };

    // Functions
    vm.loadTeam = loadTeam;
    vm.setActiveTab = setActiveTab;
    vm.applyFilters = applyFilters;
    vm.openInviteModal = openInviteModal;
    vm.closeInviteModal = closeInviteModal;
    vm.onRoleChange = onRoleChange;
    vm.submitInvite = submitInvite;
    vm.removeMember = removeMember;
    vm.getRoleBadgeClass = getRoleBadgeClass;

    init();

    function init() {
      loadTeam();
    }

    function loadTeam() {
      vm.isLoading = true;
      vm.errorMessage = '';
      TeamService.getTeamMembers()
        .then(function (data) {
          vm.allMembers = data.team || [];
          vm.organization = data.organization || {
            name: 'TechCorp Technologies',
            plan: 'Enterprise Recruiter Suite',
            seatsUsed: vm.allMembers.length,
            seatsTotal: 15
          };
          applyFilters();
        })
        .catch(function (err) {
          vm.errorMessage = err.message || 'Failed to load team members.';
          AlertService.error(vm.errorMessage);
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function setActiveTab(tab) {
      vm.activeTab = tab;
    }

    function applyFilters() {
      let list = [...vm.allMembers];

      if (vm.filterRole !== 'All') {
        list = list.filter(m => m.role === vm.filterRole);
      }

      if (vm.searchQuery && vm.searchQuery.trim()) {
        const q = vm.searchQuery.trim().toLowerCase();
        list = list.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      }

      vm.team = list;
    }

    function openInviteModal() {
      vm.inviteForm = {
        name: '',
        email: '',
        role: 'Interviewer',
        accessScope: 'View Candidates, Interviews'
      };
      vm.showInviteModal = true;
    }

    function closeInviteModal() {
      vm.showInviteModal = false;
    }

    function onRoleChange() {
      switch (vm.inviteForm.role) {
        case 'Super Admin':
          vm.inviteForm.accessScope = 'Full Access (All Modules)';
          break;
        case 'Hiring Manager':
          vm.inviteForm.accessScope = 'Manage Jobs, Candidates';
          break;
        case 'Interviewer':
          vm.inviteForm.accessScope = 'View Candidates, Interviews';
          break;
        case 'Technical Lead':
          vm.inviteForm.accessScope = 'Candidate Evaluation & Scoring';
          break;
        default:
          vm.inviteForm.accessScope = 'Standard Access';
      }
    }

    function submitInvite() {
      if (!vm.inviteForm.name || !vm.inviteForm.email) {
        AlertService.warning('Please enter team member name and email address.');
        return;
      }

      TeamService.inviteMember(vm.inviteForm)
        .then(function (res) {
          AlertService.success(res.message || 'Invitation sent successfully.');
          closeInviteModal();
          loadTeam();
        })
        .catch(function (err) {
          AlertService.error(err.data?.message || 'Failed to send invitation.');
        });
    }

    function removeMember(member) {
      if (member.role === 'Super Admin') {
        AlertService.warning('Super Admin cannot be removed.');
        return;
      }

      if (!confirm(`Are you sure you want to remove ${member.name} from the organization?`)) {
        return;
      }

      TeamService.removeMember(member._id)
        .then(function (res) {
          AlertService.success(res.message || 'Team member removed.');
          loadTeam();
        })
        .catch(function (err) {
          AlertService.error(err.data?.message || 'Failed to remove member.');
        });
    }

    function getRoleBadgeClass(role) {
      switch (role) {
        case 'Super Admin': return 'role-badge-admin';
        case 'Hiring Manager': return 'role-badge-manager';
        case 'Interviewer': return 'role-badge-interviewer';
        case 'Technical Lead': return 'role-badge-techlead';
        default: return 'role-badge-interviewer';
      }
    }
  }
})();
