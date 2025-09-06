// src/scripts/pages/index.js
import { getCurrentUser } from '/src/scripts/auth/auth.js';

const paths = {
    login: '/src/pages/auth/login.html',
    signup: '/src/pages/auth/signup.html',
    dashboard: '/src/pages/dashboard/homepage.html'
};

function setupGuestNavigation() {
    const navButtons = document.querySelector('.nav-buttons');
    const heroButtons = document.querySelector('.hero-buttons');
    const ctaButton = document.querySelector('.cta .btn-hero');

    if (navButtons) {
        navButtons.innerHTML = `
            <a href="${paths.login}" class="btn btn-secondary">Login</a>
            <a href="${paths.signup}" class="btn btn-primary">Get Started</a>
        `;
    }
    
    if (heroButtons) {
        const allLinks = heroButtons.querySelectorAll('a');
        allLinks.forEach(link => {
            if (link.classList.contains('btn-hero')) {
                link.href = paths.signup;
            }
        });
    }
    
    if (ctaButton) {
        ctaButton.href = paths.signup;
    }
}

function setupAuthenticatedNavigation() {
    const navButtons = document.querySelector('.nav-buttons');
    const heroButtons = document.querySelector('.hero-buttons');
    const ctaButton = document.querySelector('.cta .btn-hero');

    if (navButtons) {
        navButtons.innerHTML = `
            <a href="${paths.dashboard}" class="btn btn-primary">Go to Dashboard</a>
        `;
    }
    
    if (heroButtons) {
        const allLinks = heroButtons.querySelectorAll('a');
        allLinks.forEach(link => {
            link.href = paths.dashboard;
            if (link.classList.contains('btn-hero')) {
                link.textContent = 'Go to Dashboard';
            }
        });
    }
    
    if (ctaButton) {
        ctaButton.href = paths.dashboard;
        ctaButton.textContent = 'Go to Dashboard';
    }
}

async function checkAuthAndSetupNavigation() {
    try {
        const user = await getCurrentUser();
        
        if (user) {
            setupAuthenticatedNavigation();
        } else {
            setupGuestNavigation();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        // Default to guest navigation on error
        setupGuestNavigation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndSetupNavigation();
});