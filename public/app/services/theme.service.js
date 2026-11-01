(function () {
  'use strict';

  angular
    .module('screeningApp')
    .factory('ThemeService', ThemeService);

  ThemeService.$inject = ['$rootScope'];
  function ThemeService($rootScope) {
    const STORAGE_KEY = 'resumeiq_theme';
    let mediaQuery = null;

    // Service public interface
    const service = {
      getTheme: getTheme,
      getResolvedTheme: getResolvedTheme,
      isDark: isDark,
      setTheme: setTheme,
      cycleTheme: cycleTheme,
      init: init
    };

    // Auto-initialize on registration
    init();

    return service;

    /**
     * Returns the user's explicit preference: 'light', 'dark', or 'system'
     */
    function getTheme() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored;
        }
      } catch (e) {
        // Fallback if localStorage is restricted
      }
      return 'system';
    }

    /**
     * Resolves the active theme ('light' or 'dark'), evaluating system preference if needed
     */
    function getResolvedTheme() {
      const current = getTheme();
      if (current === 'light') return 'light';
      if (current === 'dark') return 'dark';

      // 'system' mode: check OS preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }

    /**
     * Returns true if the currently rendered theme is dark
     */
    function isDark() {
      return getResolvedTheme() === 'dark';
    }

    /**
     * Sets and persists the theme ('light', 'dark', or 'system')
     * @param {string} theme
     */
    function setTheme(theme) {
      if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
        theme = 'system';
      }

      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {
        console.warn('[ThemeService] LocalStorage unavailable:', e);
      }

      applyTheme(theme);
    }

    /**
     * Cycles to the next theme: light -> dark -> system -> light
     */
    function cycleTheme() {
      const current = getTheme();
      const nextTheme = current === 'light' ? 'dark' : (current === 'dark' ? 'system' : 'light');
      setTheme(nextTheme);
      return nextTheme;
    }

    /**
     * Applies DOM attributes and broadcasts event to AngularJS scopes
     */
    function applyTheme(themeSetting) {
      const resolved = (themeSetting === 'system')
        ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : themeSetting;

      const html = document.documentElement;
      html.setAttribute('data-theme', resolved);
      html.setAttribute('data-theme-setting', themeSetting);

      // Notify AngularJS scopes
      $rootScope.$evalAsync(function () {
        $rootScope.currentTheme = themeSetting;
        $rootScope.isDarkTheme = resolved === 'dark';
        $rootScope.$broadcast('theme:changed', {
          setting: themeSetting,
          resolved: resolved
        });
      });
    }

    /**
     * Initializes theme listeners and binds OS prefers-color-scheme media query
     */
    function init() {
      const currentSetting = getTheme();
      applyTheme(currentSetting);

      // Listen for live OS theme modifications while application is active
      if (window.matchMedia) {
        try {
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const listener = function (e) {
            // Only update dynamically if user has 'system' theme selected
            if (getTheme() === 'system') {
              applyTheme('system');
            }
          };

          if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', listener);
          } else if (mediaQuery.addListener) {
            mediaQuery.addListener(listener);
          }
        } catch (e) {
          console.warn('[ThemeService] Media query listener setup failed:', e);
        }
      }
    }
  }
})();
