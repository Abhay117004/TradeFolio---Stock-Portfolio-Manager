import { handleEmailLogin, handleGoogleAuth } from '/src/scripts/auth/auth.js';
import {
    toggleButtonLoading,
    showGeneralMessage,
    clearErrors,
    displayFieldErrors,
    togglePasswordVisibility
} from '/src/scripts/utils/helpers.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const generalError = document.getElementById('generalError');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const passwordToggle = document.getElementById('passwordToggle');

    let isSubmitting = false;

    /**
     * Validates form data and returns an error object without modifying the UI.
     */
    const validateForm = () => {
        const errors = {};
        const emailValue = emailInput.value.trim();
        const passwordValue = passwordInput.value;

        if (!emailValue) {
            errors.email = "Email address is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            errors.email = "Please enter a valid email address.";
        }
        
        if (!passwordValue) {
            errors.password = "Password is required.";
        }

        return Object.keys(errors).length > 0 ? errors : null;
    };

    // Check for redirect parameter and handle post-login redirect
    const getRedirectUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        if (redirect) {
            try {
                // Decode and validate the redirect URL
                const decodedRedirect = decodeURIComponent(redirect);
                // Ensure it's a relative URL within our app
                if (decodedRedirect.startsWith('/')) {
                    return window.location.origin + decodedRedirect;
                }
            } catch (e) {
                console.warn('Invalid redirect parameter:', e);
            }
        }
        
        return '/src/pages/dashboard/homepage.html';
    };

    // Email/Password Login Form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(loginForm);

            if (isSubmitting) return;

            const validationErrors = validateForm();
            if (validationErrors) {
                displayFieldErrors(loginForm, validationErrors);
                return;
            }

            isSubmitting = true;
            toggleButtonLoading(loginBtn, true, { idle: 'Login', loading: 'Signing in...' });

            try {
                const { data, error } = await handleEmailLogin(
                    emailInput.value.trim(), 
                    passwordInput.value
                );

                if (error) {
                    showGeneralMessage(generalError, error.message, true);
                } else if (data?.user) {
                    showGeneralMessage(generalError, 'Login successful! Redirecting...', false);
                    
                    setTimeout(() => {
                        window.location.href = getRedirectUrl();
                    }, 1000);
                }
            } catch (err) {
                console.error('Login error:', err);
                showGeneralMessage(generalError, 'An unexpected error occurred. Please try again.', true);
            } finally {
                isSubmitting = false;
                toggleButtonLoading(loginBtn, false, { idle: 'Login', loading: 'Signing in...' });
            }
        });
    }

    // Google Login
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            if (isSubmitting) return;
            clearErrors(loginForm);

            isSubmitting = true;
            toggleButtonLoading(googleLoginBtn, true, { idle: 'Continue with Google', loading: 'Redirecting...' });

            try {
                const { error } = await handleGoogleAuth();

                if (error) {
                    showGeneralMessage(generalError, error.message, true);
                    isSubmitting = false;
                    toggleButtonLoading(googleLoginBtn, false, { idle: 'Continue with Google', loading: 'Redirecting...' });
                }
                // On success, Google will handle the redirect
            } catch (err) {
                console.error('Google login error:', err);
                showGeneralMessage(generalError, 'Google login failed. Please try again.', true);
                isSubmitting = false;
                toggleButtonLoading(googleLoginBtn, false, { idle: 'Continue with Google', loading: 'Redirecting...' });
            }
        });
    }

    // Password Toggle Functionality
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            togglePasswordVisibility(passwordInput, passwordToggle);
        });
    }

    // Clear errors when the user starts typing in the form
    if (loginForm) {
        loginForm.addEventListener('input', () => clearErrors(loginForm));
    }

    // Auto-focus email input
    if (emailInput) {
        emailInput.focus();
    }
});