import { handlePasswordReset } from '/src/scripts/auth/auth.js';
import {
    toggleButtonLoading,
    showGeneralMessage,
    displayFieldErrors,
    clearErrors
} from '/src/scripts/utils/helpers.js';

// Wait for the DOM to be fully loaded and parsed
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const resetForm = document.getElementById('resetForm');
    const emailInput = document.getElementById('email');
    const messageContainer = document.getElementById('message-container');
    const resetBtn = document.getElementById('resetBtn');

    // State to prevent multiple form submissions
    let isSubmitting = false;

    /**
     * Validates the form data and returns an error object without modifying the UI.
     * @returns {Object} An object containing any validation errors.
     */
    const validateForm = () => {
        const errors = {};
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            errors.email = "Email address is required.";
        } else if (email.length > 254) {
            errors.email = "Email address is too long.";
        } else if (!emailRegex.test(email)) {
            errors.email = "Please enter a valid email address.";
        }
        return errors;
    };

    // Handle form submission
    if (resetForm) {
        resetForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent default form submission

            if (isSubmitting) return; // Block multiple submissions

            // Clear previous messages and errors
            clearErrors(resetForm); // ✅ Fixed: Pass the form, not messageContainer
            
            // Also clear the general message container
            messageContainer.style.display = 'none';
            messageContainer.innerHTML = '';

            // Validate form fields
            const validationErrors = validateForm();
            if (Object.keys(validationErrors).length > 0) {
                displayFieldErrors(resetForm, validationErrors); // ✅ Also pass form here
                return; // Stop execution if there are errors
            }

            isSubmitting = true;
            toggleButtonLoading(resetBtn, true, 'Sending...'); // Show loading state

            try {
                const email = emailInput.value.trim();
                await handlePasswordReset(email); // Call the auth function

                // Show success message to the user
                showGeneralMessage(messageContainer, 'If an account with that email exists, a password reset link has been sent.', 'success');
                resetForm.reset(); // Clear the form fields

            } catch (error) {
                console.error('Password reset error:', error);
                // Display any errors from the server
                const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
                showGeneralMessage(messageContainer, errorMessage, 'error');
            } finally {
                // Re-enable the button and reset submitting state
                isSubmitting = false;
                console.log('Restoring button state...');
                toggleButtonLoading(resetBtn, false, {
                    idle: 'Send Reset Link',
                    loading: 'Sending...'
                });
                
                // Fallback: manually restore button if helper fails
                if (resetBtn) {
                    resetBtn.disabled = false;
                    const span = resetBtn.querySelector('span');
                    if (span && !span.textContent.trim()) {
                        span.textContent = 'Send Reset Link';
                    }
                }
            }
        });
    }
});