import { supabaseClient as supabase } from '../config/supabase.js';

const handleAuthRequest = async (promise) => {
    try {
        const { data, error } = await promise;
        if (error) {
            console.error("Supabase Auth Error:", error.message);
            return { data: null, error: formatAuthError(error) };
        }
        return { data, error: null };
    } catch (err) {
        console.error("Unexpected error:", err);
        return { data: null, error: { message: "An unexpected error occurred. Please try again." } };
    }
};

/**
 * A private helper to translate raw Supabase errors into user-friendly messages.
 */
const formatAuthError = (error) => {
    let message = "An unexpected error occurred. Please try again.";
    if (!error?.message) return { message };

    const msg = error.message.toLowerCase();
    if (msg.includes("user already registered")) {
        message = "An account with this email already exists. Please log in.";
    } else if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        message = "Invalid email or password. Please check your credentials.";
    } else if (msg.includes("password should be at least")) {
        message = "Password must be at least 6 characters long.";
    } else if (msg.includes("unable to validate email address") || msg.includes("invalid email")) {
        message = "Please enter a valid email address.";
    } else if (msg.includes("email rate limit exceeded")) {
        message = "Too many attempts. Please try again later.";
    } else if (msg.includes("email not confirmed")) {
        message = "Please confirm your email address before logging in.";
    } else if (msg.includes("signup is disabled")) {
        message = "Account creation is currently disabled. Please try again later.";
    }
    
    return { message };
};

// --- Public API ---

/**
 * Handles email/password registration.
 */
export async function handleEmailSignup(email, password, firstName, lastName) {
    return handleAuthRequest(
        supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: { 
                    first_name: firstName?.trim() || '', 
                    last_name: lastName?.trim() || '',
                    full_name: `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim()
                }
            }
        })
    );
}

/**
 * Handles email/password login.
 */
export async function handleEmailLogin(email, password) {
    return handleAuthRequest(
        supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password 
        })
    );
}

/**
 * Handles Google authentication (login and signup).
 */
export async function handleGoogleAuth() {
    const baseUrl = window.location.origin;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${baseUrl}/src/pages/dashboard/homepage.html`
        }
    });
    
    return { data, error: error ? formatAuthError(error) : null };
}

/**
 * Handles a password reset request.
 */
export async function handlePasswordReset(email) {
    try {
        const baseUrl = window.location.origin;
        const redirectTo = `${baseUrl}/src/pages/auth/update-password.html`;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { 
            redirectTo 
        });
        
        if (error) {
            console.error('Password reset error:', error);
        }
        
        // Always return success to prevent email enumeration
        return { data: { success: true }, error: null };
    } catch (err) {
        console.error('Password reset error:', err);
        // Always return success for security
        return { data: { success: true }, error: null };
    }
}

/**
 * Checks if the current session is a password recovery session.
 */
export async function handlePasswordResetCallback() {
    try {
        // Parse the URL hash for Supabase tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('URL hash params:', { accessToken, refreshToken, type });

        // If tokens are present, explicitly set the session
        if (accessToken && refreshToken && type === 'recovery') {
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) {
                console.error('Session setting error:', error);
                return { isPasswordReset: false, session: null };
            }
            
            console.log('Session successfully set:', data);
            return { isPasswordReset: true, session: data.session };
        }

        // Fallback: Check for an existing session (useful for direct navigation)
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error fetching session:", error);
            return { isPasswordReset: false, session: null };
        }

        // If a session exists, check if it's a recovery session
        const hasRecoverySession = session && session.user && session.token_type === 'recovery';
        if (hasRecoverySession) {
            return { isPasswordReset: true, session };
        }

        return { isPasswordReset: false, session: null };
    } catch (error) {
        console.error('Password reset callback error:', error);
        return { isPasswordReset: false, session: null };
    }
}

/**
 * Updates the user's password during the password reset flow.
 */
export async function updateUserPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        console.error('Update password error:', error);
        throw new Error(error.message || 'Failed to update password. Please try again.');
    }
    
    return data;
}

/**
 * Handles user sign out.
 */
export async function handleSignOut() {
    return handleAuthRequest(supabase.auth.signOut());
}

/**
 * Gets the current authenticated user from the session.
 */
export async function getCurrentUser() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error fetching user session:", error.message);
            return null;
        }
        return session?.user ?? null;
    } catch (err) {
        console.error("Error getting current user:", err);
        return null;
    }
}

/**
 * Sets up an auth state change listener.
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
}