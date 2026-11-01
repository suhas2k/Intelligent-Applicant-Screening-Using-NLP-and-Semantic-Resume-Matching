(function () {
  'use strict';

  angular
    .module('screeningApp')
    .controller('AuthController', AuthController);

  AuthController.$inject = ['$location', '$interval', '$scope', '$timeout', '$window', 'AuthService', 'AlertService'];
  function AuthController($location, $interval, $scope, $timeout, $window, AuthService, AlertService) {
    const vm = this;

    // View mode: 'password' (default as in reference) or 'otp'
    vm.authMode = 'password';
    vm.isLoading = false;
    vm.showPassword = false;
    vm.showRegisterPassword = false;
    vm.keepMeLoggedIn = true;

    // Forgot password state
    vm.showForgotPasswordModal = false;
    vm.forgotEmail = 'manisuhas23@gmail.com';
    vm.isForgotLoading = false;
    vm.forgotSubmitted = false;

    // Password Login state
    vm.loginData = {
      email: 'manisuhas23@gmail.com',
      password: ''
    };

    // Registration state
    vm.registerData = {
      name: 'Manikanta Suhas',
      company: 'Talent Acquisition Team',
      email: 'manisuhas23@gmail.com',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'recruiter'
    };

    // Real Email OTP state
    vm.otpStep = 1; // 1: Enter email, 2: 6-digit OTP entry & verification
    vm.otpData = {
      email: 'manisuhas23@gmail.com',
      otp: '',
      name: 'Manikanta Suhas',
      company: 'Talent Acquisition Team'
    };
    vm.otpDigits = ['', '', '', '', '', ''];
    vm.maskedEmail = '';
    vm.otpCountdown = 0;
    vm.otpTimer = null;
    vm.isExistingUser = true;

    // Real Google Sign-In state
    vm.showGoogleModal = false;
    vm.isGoogleLoading = false;
    vm.useAnotherAccount = false;
    vm.googleClientId = null;
    vm.hasGoogleClientId = false;
    vm.hasSmtpConfig = true;
    vm.customGoogleEmail = 'manisuhas23@gmail.com';
    vm.customGoogleName = 'Manikanta Suhas';
    vm.newGoogleClientId = '';
    vm.tokenClient = null;

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
    vm.toggleShowPassword = toggleShowPassword;
    vm.toggleShowRegisterPassword = toggleShowRegisterPassword;
    vm.login = login;
    vm.register = register;

    // Real OTP methods
    vm.sendOtp = sendOtp;
    vm.resendOtp = resendOtp;
    vm.verifyOtp = verifyOtp;
    vm.changeOtpEmail = changeOtpEmail;
    vm.onOtpKeyUp = onOtpKeyUp;
    vm.onOtpPaste = onOtpPaste;

    // Real Google methods
    vm.handleGoogleClick = handleGoogleClick;
    vm.openGooglePopup = openGooglePopup;
    vm.openGoogleModal = openGoogleModal;
    vm.openGoogleAccountSelector = openGoogleAccountSelector;
    vm.toggleUseAnotherAccount = toggleUseAnotherAccount;
    vm.closeGoogleModal = closeGoogleModal;
    vm.loginWithGoogleAccount = loginWithGoogleAccount;
    vm.loginWithCustomGoogleAccount = loginWithCustomGoogleAccount;
    vm.removeGoogleAccount = removeGoogleAccount;
    vm.saveGoogleClientId = saveGoogleClientId;

    // Forgot Password
    vm.openForgotPassword = openForgotPassword;
    vm.closeForgotPassword = closeForgotPassword;
    vm.submitForgotPassword = submitForgotPassword;

    function openForgotPassword() {
      vm.showForgotPasswordModal = true;
      vm.forgotSubmitted = false;
      if (vm.loginData.email) {
        vm.forgotEmail = vm.loginData.email;
      }
    }

    function closeForgotPassword() {
      vm.showForgotPasswordModal = false;
    }

    function submitForgotPassword() {
      if (!vm.forgotEmail || !vm.forgotEmail.includes('@')) {
        AlertService.error('Please enter a valid work email address.');
        return;
      }
      vm.isForgotLoading = true;
      AuthService.sendOtp(vm.forgotEmail)
        .then(function () {
          vm.forgotSubmitted = true;
          AlertService.success('Security verification code sent to ' + vm.forgotEmail);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Unable to dispatch password reset code.');
        })
        .finally(function () {
          vm.isForgotLoading = false;
        });
    }

    // Helper: Mask email address for security display
    function maskEmail(email) {
      if (!email || !email.includes('@')) return email || '';
      const parts = email.split('@');
      const user = parts[0];
      const domain = parts[1];
      if (user.length <= 2) {
        return user[0] + '***@' + domain;
      }
      return user.slice(0, 2) + '***' + user.slice(-2) + '@' + domain;
    }

    // Initialization
    init();

    function init() {
      // Query Google Identity Services config
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

      // Cleanup timers when leaving view
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

    function toggleShowPassword() {
      vm.showPassword = !vm.showPassword;
    }

    function toggleShowRegisterPassword() {
      vm.showRegisterPassword = !vm.showRegisterPassword;
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

      AuthService.sendOtp(target)
        .then(function (res) {
          vm.otpStep = 2;
          vm.isExistingUser = res.isExistingUser;
          vm.maskedEmail = maskEmail(target);
          vm.otpDigits = ['', '', '', '', '', ''];
          vm.otpData.otp = '';

          startOtpCountdown(res.cooldownSeconds || 60);

          AlertService.success('Security verification code dispatched to your inbox (' + target + ')!');

          // Auto-focus first digit box
          $timeout(function () {
            const firstBox = document.getElementById('otp-digit-0');
            if (firstBox) firstBox.focus();
          }, 200);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to dispatch security code. Please verify email and try again.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function resendOtp() {
      if (vm.otpCountdown > 0 || vm.isLoading) return;

      const target = (vm.otpData.email || '').trim();
      if (!target) return;

      vm.isLoading = true;
      AuthService.resendOtp(target)
        .then(function (res) {
          vm.otpDigits = ['', '', '', '', '', ''];
          vm.otpData.otp = '';
          startOtpCountdown(res.cooldownSeconds || 60);
          AlertService.success('Fresh 6-digit security code dispatched to ' + target + '!');
          $timeout(function () {
            const firstBox = document.getElementById('otp-digit-0');
            if (firstBox) firstBox.focus();
          }, 100);
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Failed to resend verification code.');
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function verifyOtp() {
      // Re-sync OTP from digits
      vm.otpData.otp = vm.otpDigits.join('').trim();

      if (!vm.otpData.otp || vm.otpData.otp.length < 6) {
        AlertService.error('Please enter all 6 digits of the verification code received in your email.');
        return;
      }

      vm.isLoading = true;
      AuthService.verifyOtp({
        email: vm.otpData.email.trim(),
        otp: vm.otpData.otp,
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
          // Select and clear boxes on error
          $timeout(function () {
            const firstBox = document.getElementById('otp-digit-0');
            if (firstBox) firstBox.focus();
          });
        })
        .finally(function () {
          vm.isLoading = false;
        });
    }

    function changeOtpEmail() {
      vm.otpStep = 1;
      vm.otpData.otp = '';
      vm.otpDigits = ['', '', '', '', '', ''];
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

    // 6-Digit Auto Focus & Keyboard Management
    function onOtpKeyUp(event, index) {
      const key = event.key;

      // Handle Backspace
      if (key === 'Backspace') {
        if (!vm.otpDigits[index] && index > 0) {
          const prevBox = document.getElementById('otp-digit-' + (index - 1));
          if (prevBox) prevBox.focus();
        }
        vm.otpData.otp = vm.otpDigits.join('');
        return;
      }

      // Handle Left Arrow
      if (key === 'ArrowLeft' && index > 0) {
        const prevBox = document.getElementById('otp-digit-' + (index - 1));
        if (prevBox) prevBox.focus();
        return;
      }

      // Handle Right Arrow
      if (key === 'ArrowRight' && index < 5) {
        const nextBox = document.getElementById('otp-digit-' + (index + 1));
        if (nextBox) nextBox.focus();
        return;
      }

      // If numeric digit entered, advance to next box
      if (/^\d$/.test(key) || /^\d$/.test(vm.otpDigits[index])) {
        // Ensure only single digit stored in cell
        if (vm.otpDigits[index].length > 1) {
          vm.otpDigits[index] = vm.otpDigits[index].slice(-1);
        }
        if (index < 5) {
          const nextBox = document.getElementById('otp-digit-' + (index + 1));
          if (nextBox) nextBox.focus();
        }
      }

      vm.otpData.otp = vm.otpDigits.join('');

      // Auto-submit if all 6 digits completed and Enter pressed
      if (key === 'Enter' && vm.otpData.otp.length === 6) {
        verifyOtp();
      }
    }

    // 6-Digit Full Paste Support
    function onOtpPaste(event) {
      const clipboard = (event.clipboardData || window.clipboardData);
      if (!clipboard) return;

      const pastedText = clipboard.getData('text') || '';
      const cleanDigits = pastedText.replace(/\D/g, '').slice(0, 6);

      if (cleanDigits.length > 0) {
        event.preventDefault();
        const chars = cleanDigits.split('');
        for (let i = 0; i < 6; i++) {
          vm.otpDigits[i] = chars[i] || '';
        }
        vm.otpData.otp = cleanDigits;

        // Focus the appropriate box
        const targetIndex = Math.min(chars.length, 5);
        $timeout(function () {
          const targetBox = document.getElementById('otp-digit-' + targetIndex);
          if (targetBox) targetBox.focus();
        });

        // If full 6 digits pasted, trigger verification automatically
        if (cleanDigits.length === 6) {
          $timeout(function () {
            verifyOtp();
          }, 300);
        }
      }
    }

    // ---------------- REAL GOOGLE ACCOUNTS AUTHENTICATION ----------------

    function handleGoogleClick() {
      if (vm.tokenClient) {
        try {
          vm.tokenClient.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (e) {
          console.warn('[Google TokenClient prompt error]', e);
        }
      }

      openGooglePopup();
    }

    function openGooglePopup() {
      const width = 500;
      const height = 620;
      const left = Math.max(0, Math.floor(window.screenLeft + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.floor(window.screenTop + (window.outerHeight - height) / 2));

      vm.isGoogleLoading = true;

      const popup = window.open(
        '/google-auth-popup.html',
        'GoogleSignIn',
        'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',status=no,menubar=no,toolbar=no,location=yes,resizable=yes'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        vm.isGoogleLoading = false;
        openGoogleAccountSelector();
        return;
      }

      const onGoogleMessage = function (event) {
        if (event.origin !== window.location.origin && !event.origin.includes('localhost')) {
          return;
        }
        if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', onGoogleMessage);
          $timeout(function () {
            loginWithGoogleAccount(event.data.account);
          });
        }
      };

      window.addEventListener('message', onGoogleMessage);

      const popupCheckTimer = $interval(function () {
        if (popup.closed) {
          $interval.cancel(popupCheckTimer);
          window.removeEventListener('message', onGoogleMessage);
          $timeout(function () {
            vm.isGoogleLoading = false;
          }, 300);
        }
      }, 500);
    }

    function openGoogleModal() {
      vm.showGoogleModal = true;
      vm.useAnotherAccount = false;
    }

    function openGoogleAccountSelector() {
      vm.showGoogleModal = true;
      vm.useAnotherAccount = false;
    }

    function toggleUseAnotherAccount() {
      vm.useAnotherAccount = !vm.useAnotherAccount;
    }

    function closeGoogleModal() {
      vm.showGoogleModal = false;
      vm.useAnotherAccount = false;
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

    function loginWithGoogleAccount(account) {
      if (!account || !account.email) return;

      vm.isGoogleLoading = true;
      vm.isLoading = true;
      vm.closeGoogleModal();

      const targetEmail = account.email.trim().toLowerCase();
      const targetName = account.name || targetEmail.split('@')[0];

      AuthService.googleAuth({
        googleProfile: {
          email: targetEmail,
          name: targetName,
          role: 'recruiter',
          googleId: 'g_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          avatar: account.avatar || null
        }
      })
        .then(function (res) {
          AlertService.success('Welcome! Signed in with Google as ' + (res.user.name || targetName) + ' (' + targetEmail + ')!');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Google authentication failed.');
        })
        .finally(function () {
          vm.isGoogleLoading = false;
          vm.isLoading = false;
        });
    }

    function loginWithCustomGoogleAccount() {
      if (!vm.customGoogleEmail || !vm.customGoogleEmail.includes('@')) {
        AlertService.error('Please enter your Google email address (e.g. name@gmail.com).');
        return;
      }

      vm.isLoading = true;
      vm.isGoogleLoading = true;
      const email = vm.customGoogleEmail.trim().toLowerCase();
      const rawName = vm.customGoogleName || email.split('@')[0];
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);

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
          AlertService.success('Welcome! Signed in with Google as ' + (res.user.name || name) + ' (' + email + ')!');
          $location.path('/dashboard');
        })
        .catch(function (err) {
          AlertService.error(err.message || 'Google authentication failed.');
        })
        .finally(function () {
          vm.isLoading = false;
          vm.isGoogleLoading = false;
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
        AlertService.error('Recruiter name, work email, and password are required.');
        return;
      }

      if (vm.registerData.password.length < 6) {
        AlertService.error('Password must be at least 6 characters long.');
        return;
      }

      if (vm.registerData.confirmPassword && vm.registerData.password !== vm.registerData.confirmPassword) {
        AlertService.error('Passwords do not match. Please ensure both passwords match.');
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
