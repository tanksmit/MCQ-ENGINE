// Main JavaScript for MCQ Generator & Solver
// Shared functionality across all pages

document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add animation on scroll for cards
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all glass cards
    document.querySelectorAll('.glass-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

// Utility function to format MCQ data for display
function formatMCQForDisplay(mcq, index, showExplanation) {
    return `
        <div class="mcq-item">
            <div class="mcq-question">Q${index + 1}. ${mcq.question}</div>
            <div class="mcq-options">
                <div class="mcq-option">A. ${mcq.options.A}</div>
                <div class="mcq-option">B. ${mcq.options.B}</div>
                <div class="mcq-option">C. ${mcq.options.C}</div>
                <div class="mcq-option">D. ${mcq.options.D}</div>
            </div>
            <div class="mcq-answer">Correct Answer: ${mcq.correctAnswer}</div>
            ${showExplanation && mcq.explanation ? `
                <div class="mcq-explanation">
                    <strong>Explanation:</strong> ${mcq.explanation}
                </div>
            ` : ''}
        </div>
    `;
}

// Utility function to show professional toast notifications
function showToast(message, type = 'error') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-container');
    if (existingToast) existingToast.remove();

    const toastContainer = document.createElement('div');
    toastContainer.className = `toast-container toast-${type}`;

    const icon = type === 'success' ? '✅' : type === 'info' ? 'ℹ️' : '❌';

    toastContainer.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        </div>
        <div class="toast-progress"></div>
    `;

    document.body.appendChild(toastContainer);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toastContainer.classList.add('toast-fade-out');
        setTimeout(() => toastContainer.remove(), 500);
    }, 5000);
}

// Update showError to use toast
function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showInfo(message) {
    showToast(message, 'info');
}

// Utility function to validate form inputs
function validateMCQCount(count) {
    return count >= 1 && count <= 50;
}

function validateTextLength(text, minLength = 20) {
    return text.trim().length >= minLength;
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatMCQForDisplay,
        showError,
        validateMCQCount,
        validateTextLength
    };
}
