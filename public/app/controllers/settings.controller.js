(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('SettingsController', SettingsController);

  SettingsController.$inject = ['SettingsService', 'AuthService', 'AlertService', 'ThemeService', '$rootScope'];
  function SettingsController(SettingsService, AuthService, AlertService, ThemeService, $rootScope) {
    const vm = this;

    vm.isLoading = true;
    vm.isSaving = false;
    vm.activeTab = 'profile'; // 'profile', 'appearance', 'nlp', 'organization', 'notifications', 'security'

    vm.settings = {
      profile: {},
      organization: {},
      nlpMatching: {},
      notifications: {},
      security: {}
    };

    // Theme integration
    vm.currentTheme = ThemeService.getTheme();
    vm.getResolvedTheme = ThemeService.getResolvedTheme;
    vm.setTheme = function (theme) {
      ThemeService.setTheme(theme);
      vm.currentTheme = theme;
    };

    $rootScope.$on('theme:changed', function (event, data) {
      vm.currentTheme = data.setting;
    });

    // Functions
    vm.loadSettings = loadSettings;
    vm.saveSettings = saveSettings;
    vm.setActiveTab = setActiveTab;
    vm.getWeightsSum = getWeightsSum;
    vm.resetNlpWeights = resetNlpWeights;

    init();

    function init() {
      loadSettings();
    }

    function loadSettings() {
      vm.isLoading = true;
      vm.errorMessage = '';
      SettingsService.getSettings()
        .then(function (data) {
          if (data && data.settings) {
            vm.settings = data.settings;
          }
        })
        .catch(function (err) {
          vm.errorMessage = err.message || 'Failed to load settings.';
          AlertService.error(vm.errorMessage);
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function setActiveTab(tab) {
      vm.activeTab = tab;
    }

    function getWeightsSum() {
      const nlp = vm.settings.nlpMatching || {};
      const sum = (Number(nlp.defaultSkillsWeight) || 0) +
                  (Number(nlp.defaultSimilarityWeight) || 0) +
                  (Number(nlp.defaultExperienceWeight) || 0) +
                  (Number(nlp.defaultEducationWeight) || 0);
      return sum;
    }

    function resetNlpWeights() {
      vm.settings.nlpMatching = {
        defaultSkillsWeight: 40,
        defaultSimilarityWeight: 30,
        defaultExperienceWeight: 20,
        defaultEducationWeight: 10,
        autoShortlistThreshold: 75,
        enableSemanticSynonyms: true,
        enableBenchmarkMatching: true
      };
      AlertService.info('NLP weights reset to recommended default calibration (40/30/20/10).');
    }

    function saveSettings() {
      const sum = getWeightsSum();
      if (sum !== 100) {
        AlertService.warning(`NLP matching weights must total exactly 100% (currently ${sum}%). Please adjust sliders.`);
        return;
      }

      vm.isSaving = true;
      SettingsService.updateSettings(vm.settings)
        .then(function (res) {
          AlertService.success(res.message || 'Settings and screening configurations saved successfully.');
          // Update user name in local storage if profile was edited
          if (vm.settings.profile?.fullName) {
            const user = AuthService.getUser() || {};
            user.name = vm.settings.profile.fullName;
            localStorage.setItem('user', JSON.stringify(user));
          }
        })
        .catch(function (err) {
          AlertService.error(err.data?.message || 'Failed to save settings.');
        })
        .finally(function () {
          vm.isSaving = false;
        });
    }
  }
})();
