import { handlePasswordResetCallback, updateUserPassword } from '../auth/auth.js';
import {
    toggleButtonLoading,
    showGeneralMessage,
    displayFieldErrors,
    clearErrors,
    togglePasswordVisibility
} from '../utils/helpers.js';

document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageContainer = document.getElementById('message-container');
    const updateBtn = document.getElementById('updateBtn');
    const passwordToggle = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');

    let isSubmitting = false;

    // Show loading while checking session
    if (messageContainer) {
        showGeneralMessage(messageContainer, 'Verifying reset link...', 'info');
    }

    // Check if this is a valid password reset session
    try {
        const { isPasswordReset, session } = await handlePasswordResetCallback();
        if (!isPasswordReset || !session) {
            showGeneralMessage(messageContainer, 'Invalid or expired reset link. Please request a new password reset.', 'error');
            if (resetPasswordForm) {
                resetPasswordForm.style.display = 'none';
            }
            // Add helpful links
            const authCard = document.querySelector('.auth-card');
            if (authCard) {
                authCard.insertAdjacentHTML('beforeend', `
                    <div class="auth-footer" style="margin-top: 1.5rem;">
                        <p><a href="forgot-password.html" class="text-link">Request New Password Reset</a></p>
                        <p><a href="login.html" class="text-link">Back to Login</a></p>
                    </div>
                `);
            }
            return;
        }
        // Valid session - hide loading message and show form
        if (messageContainer) {
            messageContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Password reset validation error:', error);
        showGeneralMessage(messageContainer, 'An error occurred while verifying your reset link. Please try requesting a new password reset.', 'error');
        if (resetPasswordForm) {
            resetPasswordForm.style.display = 'none';
        }
        return;
    }

    // Form validation function
    const validateForm = () => {
        const errors = {};
        const newPassword = newPasswordInput?.value || '';
        const confirmPassword = confirmPasswordInput?.value || '';

        if (!newPassword) {
            errors.newPassword = "New password is required.";
        } else if (newPassword.length < 8) {
            errors.newPassword = "Password must be at least 8 characters long.";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            errors.newPassword = "Password needs an uppercase letter, a lowercase letter, and a number.";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Please confirm your password.";
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match.";
        }

        return errors;
    };

    // Password toggle functionality
    if (passwordToggle && newPasswordInput) {
        passwordToggle.addEventListener('click', () => {
            togglePasswordVisibility(newPasswordInput, passwordToggle);
        });
    }
    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
        });
    }

    // Form submission handler
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (isSubmitting) return;

            clearErrors(resetPasswordForm);
            if (messageContainer) {
                messageContainer.style.display = 'none';
                messageContainer.innerHTML = '';
            }

            // Validate form
            const validationErrors = validateForm();
            if (Object.keys(validationErrors).length > 0) {
                displayFieldErrors(resetPasswordForm, validationErrors);
                return;
            }

            isSubmitting = true;
            toggleButtonLoading(updateBtn, true, {
                idle: 'Update Password',
                loading: 'Updating...'
            });

            try {
                const newPassword = newPasswordInput.value;
                await updateUserPassword(newPassword);

                showGeneralMessage(messageContainer, 'Password updated successfully! Redirecting to dashboard...', 'success');
                resetPasswordForm.reset();

                setTimeout(() => {
                    window.location.href = '/src/pages/dashboard/homepage.html';
                }, 2000);
            } catch (error) {
                console.error('Password update error:', error);
                let errorMessage = 'An error occurred while updating your password. Please try again.';
                if (error?.message) {
                    errorMessage = error.message;
                }
                showGeneralMessage(messageContainer, errorMessage, 'error');
            } finally {
                isSubmitting = false;
                toggleButtonLoading(updateBtn, false, {
                    idle: 'Update Password',
                    loading: 'Updating...'
                });
            }
        });
    }

    // Auto-focus first input
    if (newPasswordInput) {
        newPasswordInput.focus();
    }

    // Clear errors when user starts typing
    [newPasswordInput, confirmPasswordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                clearErrors(resetPasswordForm);
                if (messageContainer && messageContainer.style.color.includes('red')) {
                    messageContainer.style.display = 'none';
                }
            });
        }
    });
});
