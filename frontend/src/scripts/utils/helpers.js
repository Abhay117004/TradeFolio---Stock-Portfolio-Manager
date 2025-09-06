// scripts/utils/helpers.js

/**
 * Toggles a loading state on a button, showing a spinner and optionally changing text.
 * @param {HTMLButtonElement} button - The button element.
 * @param {boolean} isLoading - Whether to show the loading state.
 * @param {{idle: string, loading: string}} [text] - Optional text for idle/loading states.
 */
export const toggleButtonLoading = (button, isLoading, text = null) => {
    if (!button) return;
    
    button.disabled = isLoading;
    if (isLoading) {
        button.classList.add('btn-loading');
    } else {
        button.classList.remove('btn-loading');
    }

    const span = button.querySelector('span');
    if (span && text) {
        if (typeof text === 'object' && text.idle && text.loading) {
            span.textContent = isLoading ? text.loading : text.idle;
        } else if (typeof text === 'string') {
            // Fallback for simple string usage
            if (isLoading) {
                button.dataset.originalText = span.textContent;
                span.textContent = text;
            } else {
                span.textContent = button.dataset.originalText || text;
            }
        }
    }
};

/**
 * Displays error messages for specific form fields.
 * @param {HTMLFormElement} form - The form containing the fields.
 * @param {Object.<string, string>} errors - An object where keys are input IDs and values are error messages.
 */
export const displayFieldErrors = (form, errors) => {
    if (!form) return;
    
    clearErrors(form);

    Object.entries(errors).forEach(([fieldId, message]) => {
        const inputElement = form.querySelector(`#${fieldId}`);
        if (!inputElement) return;

        const formGroup = inputElement.closest('.form-group');
        if (!formGroup) return;

        const errorElement = formGroup.querySelector('.form-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            formGroup.classList.add('error');
        }
    });
};

/**
 * Displays a single, general message for the form (e.g., success or top-level error).
 * @param {HTMLElement} element - The HTML element to display the message in.
 * @param {string} message - The message text.
 * @param {string} type - The message type: 'error', 'success', or 'info'.
 */
export const showGeneralMessage = (element, message, type = 'error') => {
    if (!element) return;
    
    element.textContent = message;
    
    // Set color based on type
    if (type === 'success') {
        element.style.color = 'var(--success-color, #28a745)';
        element.style.backgroundColor = 'var(--success-bg, #d4edda)';
        element.style.borderColor = 'var(--success-border, #c3e6cb)';
    } else if (type === 'error') {
        element.style.color = 'var(--error-color, #dc3545)';
        element.style.backgroundColor = 'var(--error-bg, #f8d7da)';
        element.style.borderColor = 'var(--error-border, #f5c6cb)';
    } else if (type === 'info') {
        element.style.color = 'var(--info-color, #17a2b8)';
        element.style.backgroundColor = 'var(--info-bg, #d1ecf1)';
        element.style.borderColor = 'var(--info-border, #bee5eb)';
    }
    
    element.style.padding = '0.75rem 1rem';
    element.style.border = '1px solid';
    element.style.borderRadius = '0.375rem';
    element.style.marginBottom = '1rem';
    element.style.display = message ? 'block' : 'none';
};

/**
 * Clears all validation errors from a form.
 * @param {HTMLFormElement} form - The form element to clear.
 */
export const clearErrors = (form) => {
    if (!form) return;
    
    form.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    
    form.querySelectorAll('.form-group.error').forEach(el => {
        el.classList.remove('error');
    });
};

/**
 * Toggles the visibility of a password field.
 * @param {HTMLInputElement} passwordInput - The password input element.
 * @param {HTMLButtonElement} toggleButton - The button that triggers the toggle.
 */
export const togglePasswordVisibility = (passwordInput, toggleButton) => {
    if (!passwordInput || !toggleButton) return;
    
    const toggleIcon = toggleButton.querySelector('.toggle-icon');
    const isPassword = passwordInput.type === 'password';

    passwordInput.type = isPassword ? 'text' : 'password';
    if (toggleIcon) {
        toggleIcon.textContent = isPassword ? '🙈' : '👁️';
    }
    toggleButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
};

/**
 * A standard utility to serialize form data into a JavaScript object.
 * @param {HTMLFormElement} form - The form element to serialize.
 * @returns {object} An object containing the form's data.
 */
export const getFormData = (form) => {
    if (!form) return {};
    
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
};