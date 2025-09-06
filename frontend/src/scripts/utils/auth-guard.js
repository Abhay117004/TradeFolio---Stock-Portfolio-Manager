import { getCurrentUser } from '../auth/auth.js';

(async () => {
    try {
        const user = await getCurrentUser();

        const isAuthPage = window.location.pathname.includes('/auth/');

        if (!user && !isAuthPage) {
            
            const intendedPath = window.location.pathname + window.location.search;
            const loginUrl = `/src/pages/auth/login.html?redirect=${encodeURIComponent(intendedPath)}`;
            
            console.log("No user found. Redirecting to login.");
            
            window.location.href = loginUrl;
        }

    } catch (error) {
        console.error('Auth guard failed:', error);
        window.location.href = '/src/pages/auth/login.html';
    }
})();