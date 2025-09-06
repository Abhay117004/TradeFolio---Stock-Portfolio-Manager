// src/scripts/pages/signup.js

import { handleEmailSignup, handleGoogleAuth } from '/src/scripts/auth/auth.js';
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
    const signupForm = document.getElementById('signupForm');
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const generalError = document.getElementById('generalError');
    const signupBtn = document.getElementById('signupBtn');
    const passwordToggle = document.getElementById('passwordToggle');

    let isSubmitting = false;

    /**
     * Validates the entire form and returns an object of all errors.
     */
    const validateForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Name validation
        if (firstName.length < 2) {
            errors.firstName = "First name must be at least 2 characters.";
        }
        if (lastName.length < 2) {
            errors.lastName = "Last name must be at least 2 characters.";
        }

        // Email validation
        if (!email) {
            errors.email = "Email address is required.";
        } else if (!emailRegex.test(email)) {
            errors.email = "Please enter a valid email address.";
        }
        
        // Password validation
        if (!password) {
            errors.password = "Password is required.";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters long.";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            errors.password = "Password needs an uppercase letter, a lowercase letter, and a number.";
        }

        // Confirm password validation
        if (!confirmPassword) {
            errors.confirmPassword = "Please confirm your password.";
        } else if (password !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match.";
        }

        return Object.keys(errors).length > 0 ? errors : null;
    };

    // Email/Password Signup Form
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(signupForm);

            if (isSubmitting) return;

            const validationErrors = validateForm();
            if (validationErrors) {
                displayFieldErrors(signupForm, validationErrors);
                return;
            }

            isSubmitting = true;
            toggleButtonLoading(signupBtn, true, { idle: 'Create Account', loading: 'Creating...' });

            try {
                const { data, error } = await handleEmailSignup(
                    emailInput.value.trim(),
                    passwordInput.value,
                    firstNameInput.value.trim(),
                    lastNameInput.value.trim()
                );

                if (error) {
                    showGeneralMessage(generalError, error.message, true);
                } else if (data?.user) {
                    showGeneralMessage(generalError, "Account created! Redirecting to your dashboard...", false);
                    
                    setTimeout(() => {
                        window.location.href = '/src/pages/dashboard/homepage.html';
                    }, 1200);
                }
            } catch (err) {
                console.error('Signup error:', err);
                showGeneralMessage(generalError, 'An unexpected error occurred. Please try again.', true);
            } finally {
                isSubmitting = false;
                toggleButtonLoading(signupBtn, false, { idle: 'Create Account', loading: 'Creating...' });
            }
        });
    }

    // Google Signup
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', async () => {
            if (isSubmitting) return;
            clearErrors(signupForm);

            isSubmitting = true;
            toggleButtonLoading(googleSignupBtn, true, { idle: 'Continue with Google', loading: 'Redirecting...' });

            try {
                const { error } = await handleGoogleAuth();

                if (error) {
                    showGeneralMessage(generalError, error.message, true);
                    isSubmitting = false;
                    toggleButtonLoading(googleSignupBtn, false, { idle: 'Continue with Google', loading: 'Redirecting...' });
                }
                // On success, Google will handle the redirect
            } catch (err) {
                console.error('Google signup error:', err);
                showGeneralMessage(generalError, 'Google signup failed. Please try again.', true);
                isSubmitting = false;
                toggleButtonLoading(googleSignupBtn, false, { idle: 'Continue with Google', loading: 'Redirecting...' });
            }
        });
    }

    // Password Toggle Functionality
    if (passwordToggle && passwordInput && confirmPasswordInput) {
        passwordToggle.addEventListener('click', () => {
            togglePasswordVisibility(passwordInput, passwordToggle);
            // Also toggle confirm password field to maintain consistency
            if (confirmPasswordInput.type === 'password') {
                confirmPasswordInput.type = 'text';
            } else {
                confirmPasswordInput.type = 'password';
            }
        });
    }

    // Clear errors when user starts typing
    if (signupForm) {
        signupForm.addEventListener('input', () => clearErrors(signupForm));
    }

    // Auto-focus first name input
    if (firstNameInput) {
        firstNameInput.focus();
    }
});
    