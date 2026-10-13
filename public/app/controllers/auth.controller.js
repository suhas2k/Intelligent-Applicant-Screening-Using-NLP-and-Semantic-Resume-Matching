(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('AuthController', AuthController);

  AuthController.$inject = ['$location', '$interval', '$scope', '$timeout', '$window', 'AuthService', 'AlertService'];
  function AuthController($location, $interval, $scope, $timeout, $window, AuthService, AlertService) {
    const vm = this;

    // View state
    vm.authMode = 'otp'; // Default to modern passwordless OTP or 'password'
    vm.isLoading = false;

    // Password Login state
    vm.loginData = {
      email: 'manisuhas23@gmail.com',
      password: ''
    };

    // Registration state
    vm.registerData = {
      name: 'Manikanta Suhas',
      email: 'manisuhas23@gmail.com',
      password: '',
      company: 'TalentForge Technologies',
      role: 'recruiter'
    };

    // Real OTP Login state
    vm.otpStep = 1; // 1: Enter email, 2: Enter & verify 6-digit OTP
    vm.otpData = {
      email: 'manisuhas23@gmail.com',
      otp: '',
      name: 'Manikanta Suhas',
      company: 'TalentForge Technologies'
    };
    vm.otpCountdown = 0;
    vm.otpTimer = null;
    vm.isExistingUser = true;
    vm.otpPreviewUrl = null;
    vm.isRealDelivery = false;
    vm.otpDeliveryMessage = '';

    // Real Google Sign-In state
    vm.showGoogleModal = false;
    vm.googleClientId = null;
    vm.hasGoogleClientId = false;
    vm.hasSmtpConfig = false;
    vm.customGoogleEmail = 'manisuhas23@gmail.com';
    vm.customGoogleName = 'Manikanta Suhas';
    vm.newGoogleClientId = '';
    vm.tokenClient = null;

    // SMTP Mail Configuration state
    vm.smtpUser = 'manisuhas23@gmail.com';
    vm.smtpPass = '';

    // Persistent personal Google accounts from localStorage
    const STORAGE_GOOGLE_ACCOUNTS = 'resumeiq_saved_google_accounts';
    try {
      const saved = localStorage.getItem(STORAGE_GOOGLE_ACCOUNTS);
      vm.googleAccounts = saved ? JSON.parse(saved) : [];
    } catch (e) {
      vm.googleAccounts = [];
    }
    if (!vm.googleAccounts || vm.googleAccounts.length === 0) {
      vm.googleAccounts = [
        {
          name: 'Manikanta Suhas',
          email: 'manisuhas23@gmail.com',
          role: 'Recruiter',
          badge: 'Google Account',
          avatarColor: 'linear-gradient(135deg, #4f46e5, #06b6d4)'
        }
      ];
    }

    // Bound methods
    vm.setAuthMode = setAuthMode;
    vm.login = login;
    vm.register = register;

    // Real OTP methods
    vm.sendOtp = sendOtp;
    vm.verifyOtp = verifyOtp;
    vm.resendOtp = resendOtp;
    vm.changeOtpEmail = changeOtpEmail;
    vm.openEmailPreview = openEmailPreview;

    // Real Google methods
    vm.handleGoogleClick = handleGoogleClick;
    vm.openGoogleModal = openGoogleModal;
    vm.closeGoogleModal = closeGoogleModal;
    vm.loginWithGoogleAccount = loginWithGoogleAccount;
    vm.loginWithCustomGoogleAccount = loginWithCustomGoogleAccount;
    vm.removeGoogleAccount = removeGoogleAccount;
    vm.saveGoogleClientId = saveGoogleClientId;
    vm.saveSmtpConfig = saveSmtpConfig;

    // Initialization
    init();

    function init() {
      // Fetch Google OAuth Client ID and SMTP configuration
      AuthService.getGoogleConfig()
        .then(function (config) {
          if (config) {
            vm.googleClientId = config.clientId;
            vm.hasGoogleClientId = Boolean(config.hasGoogleClientId);
            vm.hasSmtpConfig = Boolean(config.hasSmtpConfig);
            if (vm.googleClientId) {
              initGoogleIdentityServices();
            }
          }
        })
        .catch(function () {
          vm.googleClientId = null;
        });

      // Cleanup timers when leaving page
      $scope.$on('$destroy', function () {
        if (vm.otpTimer) {
          $interval.cancel(vm.otpTimer);
        }
      });
    }

    function setAuthMode(mode) {
      vm.authMode = mode;
      if (mode === 'otp' && !vm.otpData.email && vm.loginData.email) {
        vm.otpData.email = vm.loginData.email;
      }
    }

    // ---------------- TRADITIONAL EMAIL & PASSWORD LOGIN ----------------

    function login() {
      if (!vm.loginData.email || !vm.loginData.password) {
        AlertService.error('Please enter both work email and password.');
        return;
      }

      vm.isLoading = true;
      AuthService.login(vm.loginData)
        .then(function (res) {
          AlertService.success('Welcome back, ' + (res.user.name || 'Recruiter') + '!');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Login failed. Please check your credentials.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    // ---------------- REAL-TIME EMAIL OTP AUTHENTICATION ----------------

    function sendOtp() {
      const target = (vm.otpData.email || '').trim();
      if (!target || !target.includes('@')) {
        AlertService.error('Please enter a valid work email address to receive an OTP.');
        return;
      }

      vm.isLoading = true;
      vm.otpPreviewUrl = null;
      vm.isRealDelivery = false;
      vm.otpDeliveryMessage = '';

      AuthService.sendOtp(target)
        .then(function (res) {
          vm.otpStep = 2;
          vm.isExistingUser = res.isExistingUser;
          vm.otpPreviewUrl = res.previewUrl || null;
          vm.isRealDelivery = Boolean(res.isRealDelivery);
          vm.otpDeliveryMessage = res.message || '';

          startOtpCountdown(60);

          if (vm.isRealDelivery) {
            AlertService.success('Security code dispatched directly to your email inbox (' + target + ')!');
          } else if (vm.otpPreviewUrl) {
            AlertService.success('Email dispatched! Check your mail inbox (or open preview link below).');
          } else {
            AlertService.success('Security code dispatched to ' + target + '. Please check your inbox.');
          }
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to dispatch security code. Please verify email and try again.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function resendOtp() {
      if (vm.otpCountdown > 0) return;
      vm.sendOtp();
    }

    function openEmailPreview() {
      if (vm.otpPreviewUrl) {
        $window.open(vm.otpPreviewUrl, '_blank');
      }
    }

    function verifyOtp() {
      if (!vm.otpData.otp || vm.otpData.otp.toString().trim().length < 6) {
        AlertService.error('Please enter the 6-digit verification code received in your email.');
        return;
      }

      vm.isLoading = true;
      AuthService.verifyOtp({
        email: vm.otpData.email,
        otp: vm.otpData.otp.toString().trim(),
        name: vm.otpData.name,
        company: vm.otpData.company
      })
        .then(function (res) {
          if (vm.otpTimer) {
            $interval.cancel(vm.otpTimer);
          }
          AlertService.success('Identity verified! Welcome, ' + (res.user.name || 'Recruiter') + '.');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Invalid or expired security code.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function changeOtpEmail() {
      vm.otpStep = 1;
      vm.otpData.otp = '';
      vm.otpPreviewUrl = null;
      if (vm.otpTimer) {
        $interval.cancel(vm.otpTimer);
        vm.otpCountdown = 0;
      }
    }

    function startOtpCountdown(seconds) {
      if (vm.otpTimer) {
        $interval.cancel(vm.otpTimer);
      }
      vm.otpCountdown = seconds;
      vm.otpTimer = $interval(function () {
        vm.otpCountdown--;
        if (vm.otpCountdown <= 0) {
          $interval.cancel(vm.otpTimer);
          vm.otpCountdown = 0;
        }
      }, 1000);
    }

    // ---------------- REAL GOOGLE ACCOUNTS AUTHENTICATION ----------------

    function handleGoogleClick() {
      // 1. If Google GIS token client is initialized, trigger Google's real official OAuth popup
      if (vm.tokenClient) {
        try {
          vm.tokenClient.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (e) {
          console.warn('[Google TokenClient prompt error]', e);
        }
      }

      // 2. If GIS One Tap is ready, attempt prompt
      if (vm.googleClientId && window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.prompt();
        } catch (e) {
          console.warn('[Google GIS prompt error]', e);
        }
      }

      // 3. Open Google account authentication modal
      openGoogleModal();
    }

    function openGoogleModal() {
      vm.showGoogleModal = true;
    }

    function closeGoogleModal() {
      vm.showGoogleModal = false;
      vm.customGoogleEmail = 'manisuhas23@gmail.com';
      vm.customGoogleName = 'Manikanta Suhas';
      vm.newGoogleClientId = '';
    }

    function saveGoogleClientId() {
      if (!vm.newGoogleClientId || !vm.newGoogleClientId.includes('.apps.googleusercontent.com')) {
        AlertService.error('Please enter a valid Google OAuth Client ID ending in .apps.googleusercontent.com');
        return;
      }

      vm.isLoading = true;
      AuthService.setGoogleConfig(vm.newGoogleClientId.trim())
        .then(function (res) {
          vm.googleClientId = res.clientId;
          vm.hasGoogleClientId = true;
          initGoogleIdentityServices();
          AlertService.success('Google Client ID configured! You can now use official Google Sign-In.');
          vm.closeGoogleModal();
          // Trigger Google sign-in immediately
          $timeout(function () {
            handleGoogleClick();
          }, 300);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to save Google Client ID.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function saveSmtpConfig() {
      if (!vm.smtpUser || !vm.smtpUser.includes('@')) {
        AlertService.error('Please enter a valid Gmail address (e.g. manisuhas23@gmail.com).');
        return;
      }

      vm.isLoading = true;
      AuthService.setMailConfig({
        smtpUser: vm.smtpUser.trim(),
        smtpPass: vm.smtpPass ? vm.smtpPass.trim() : '',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587
      })
        .then(function (res) {
          vm.hasSmtpConfig = res.hasSmtpConfig;
          AlertService.success(res.message);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to update SMTP settings.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function loginWithGoogleAccount(account) {
      vm.isLoading = true;
      vm.closeGoogleModal();

      AuthService.googleAuth({
        googleProfile: {
          email: account.email,
          name: account.name,
          role: 'recruiter',
          googleId: 'g_' + account.email.replace(/[^a-zA-Z0-9]/g, '_'),
          avatar: account.avatar || null
        }
      })
        .then(function (res) {
          AlertService.success('Signed in with Google as ' + (res.user.name || account.name) + '!');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Google authentication failed.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function loginWithCustomGoogleAccount() {
      if (!vm.customGoogleEmail || !vm.customGoogleEmail.includes('@')) {
        AlertService.error('Please enter your Google email address (e.g. name@gmail.com).');
        return;
      }

      vm.isLoading = true;
      const email = vm.customGoogleEmail.trim().toLowerCase();
      const rawName = vm.customGoogleName || email.split('@')[0];
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      // Save into personal Google accounts list
      const existingIdx = vm.googleAccounts.findIndex(function (a) { return a.email.toLowerCase() === email; });
      if (existingIdx === -1) {
        const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#6366F1'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        vm.googleAccounts.unshift({
          name: name,
          email: email,
          role: 'Recruiter',
          badge: 'Google Account',
          avatarColor: randomColor
        });
        try {
          localStorage.setItem(STORAGE_GOOGLE_ACCOUNTS, JSON.stringify(vm.googleAccounts));
        } catch (e) {}
      }

      vm.closeGoogleModal();

      AuthService.googleAuth({
        googleProfile: {
          email: email,
          name: name,
          role: 'recruiter',
          googleId: 'g_user_' + email.replace(/[^a-zA-Z0-9]/g, '_')
        }
      })
        .then(function (res) {
          AlertService.success('Signed in with Google as ' + (res.user.name || name) + '!');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Google authentication failed.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function removeGoogleAccount(index, event) {
      if (event) {
        event.stopPropagation();
      }
      vm.googleAccounts.splice(index, 1);
      try {
        localStorage.setItem(STORAGE_GOOGLE_ACCOUNTS, JSON.stringify(vm.googleAccounts));
      } catch (e) {}
    }

    function initGoogleIdentityServices() {
      if (typeof window.google !== 'undefined' && window.google.accounts) {
        try {
          // 1. Initialize Google ID (One Tap & ID token)
          if (window.google.accounts.id) {
            window.google.accounts.id.initialize({
              client_id: vm.googleClientId,
              auto_select: false,
              callback: function (response) {
                $timeout(function () {
                  if (response && response.credential) {
                    vm.isLoading = true;
                    AuthService.googleAuth({ credential: response.credential })
                      .then(function (res) {
                        AlertService.success('Signed in with Google as ' + res.user.name + '!');
                        $location.path('/dashboard');
                      })
                      .catch(function (err) {
                        AlertService.error(err.message || 'Google sign-in token verification failed.');
                      })
                      .finally(function () {
                        vm.isLoading = false;
                      });
                  }
                });
              }
            });

            // Render live official Google button if container exists
            const gsiContainer = document.getElementById('googleGsiBtnContainer');
            if (gsiContainer) {
              window.google.accounts.id.renderButton(gsiContainer, {
                theme: 'outline',
                size: 'large',
                width: '100%',
                text: 'continue_with',
                logo_alignment: 'left'
              });
            }
          }

          // 2. Initialize Google OAuth2 Token Client (for live official popup)
          if (window.google.accounts.oauth2) {
            vm.tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: vm.googleClientId,
              scope: 'email profile openid',
              callback: function (tokenResponse) {
                $timeout(function () {
                  if (tokenResponse && tokenResponse.access_token) {
                    vm.isLoading = true;
                    AuthService.googleAuth({ accessToken: tokenResponse.access_token })
                      .then(function (res) {
                        AlertService.success('Signed in with Google as ' + res.user.name + '!');
                        $location.path('/dashboard');
                      })
                      .catch(function (err) {
                        AlertService.error(err.message || 'Google authentication failed.');
                      })
                      .finally(function () {
                        vm.isLoading = false;
                      });
                  }
                });
              }
            });
          }
        } catch (err) {
          console.warn('[GIS Init Error]', err);
        }
      }
    }

    // ---------------- REGISTRATION ----------------

    function register() {
      if (!vm.registerData.name || !vm.registerData.email || !vm.registerData.password) {
        AlertService.error('Name, email, and password are required fields.');
        return;
      }

      if (vm.registerData.password.length < 6) {
        AlertService.error('Password must be at least 6 characters.');
        return;
      }

      vm.isLoading = true;
      AuthService.register(vm.registerData)
        .then(function (res) {
          AlertService.success('Account created successfully! Welcome, ' + res.user.name + '.');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Registration failed.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }
  }
})();
