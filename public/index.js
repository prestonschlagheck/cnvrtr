class CNVRTRLanding {
    constructor() {
        this.beginBtn = document.getElementById('beginBtn');
        this.conversionForm = document.getElementById('conversionForm');
        this.playlistInput = document.getElementById('playlistInput');
        this.cnvrtBtn = document.getElementById('cnvrtBtn');
        
        this.initializeEventListeners();
        this.addAnimations();
    }

    initializeEventListeners() {
        // Begin button click - redirect to main app
        this.beginBtn.addEventListener('click', () => {
            window.location.href = 'app.html';
        });

        // CNVRT button click (keeping for backward compatibility if popup is still used elsewhere)
        this.cnvrtBtn.addEventListener('click', () => {
            this.handleConversion();
        });

        // Enter key on input (keeping for backward compatibility)
        this.playlistInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleConversion();
            }
        });

        // Close form on escape key (keeping for backward compatibility)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.conversionForm.classList.contains('visible')) {
                this.hideConversionForm();
            }
        });

        // Close form on background click (keeping for backward compatibility)
        this.conversionForm.addEventListener('click', (e) => {
            if (e.target === this.conversionForm) {
                this.hideConversionForm();
            }
        });
    }

    showConversionForm() {
        // Add smooth transition
        this.conversionForm.classList.remove('hidden');
        
        // Trigger animation
        setTimeout(() => {
            this.conversionForm.classList.add('visible');
        }, 10);

        // Focus on input after animation
        setTimeout(() => {
            this.playlistInput.focus();
        }, 300);
    }

    hideConversionForm() {
        this.conversionForm.classList.remove('visible');
        
        setTimeout(() => {
            this.conversionForm.classList.add('hidden');
            this.playlistInput.value = '';
        }, 500);
    }

    handleConversion() {
        const url = this.playlistInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a SoundCloud URL');
            return;
        }

        if (!url.includes('soundcloud.com')) {
            this.showError('Please enter a valid SoundCloud URL');
            return;
        }

        // Show loading state
        this.showLoading();

        // Redirect to main app with the URL
        const appUrl = `/app.html?url=${encodeURIComponent(url)}`;
        window.location.href = appUrl;
    }

    showError(message) {
        // Remove any existing error
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Style the error
        errorDiv.style.cssText = `
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            font-size: 0.9rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Add to form
        this.conversionForm.querySelector('.form-content').appendChild(errorDiv);

        // Animate in
        setTimeout(() => {
            errorDiv.style.opacity = '1';
        }, 10);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.style.opacity = '0';
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 300);
            }
        }, 5000);

        // Shake animation for input
        this.playlistInput.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            this.playlistInput.style.animation = '';
        }, 500);
    }

    showLoading() {
        // Disable button and show loading state
        this.cnvrtBtn.disabled = true;
        this.cnvrtBtn.textContent = 'LOADING...';
        this.cnvrtBtn.style.opacity = '0.7';
        
        // Add loading spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: soundwaveLoader 1.5s linear infinite;
            display: inline-block;
            margin-left: 0.5rem;
        `;
        
        this.cnvrtBtn.appendChild(spinner);
    }

    addAnimations() {
        // Add CSS animations dynamically
        const style = document.createElement('style');
        style.textContent = `
            @keyframes soundwaveLoader {
                0%, 40%, 100% {
                    transform: scaleY(0.3);
                    opacity: 0.6;
                }
                20% {
                    transform: scaleY(1);
                    opacity: 1;
                }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .cta-button {
                animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { 
                    box-shadow: 0 8px 25px rgba(255, 107, 53, 0.3);
                }
                50% { 
                    box-shadow: 0 8px 35px rgba(255, 107, 53, 0.5);
                }
            }
            
            .main-heading {
                animation: fadeInUp 1s ease-out 0.2s both;
            }
            
            .sub-heading {
                animation: fadeInUp 1s ease-out 0.4s both;
            }
            
            .description {
                animation: fadeInUp 1s ease-out 0.6s both;
            }
            
            .cta-button {
                animation: fadeInUp 1s ease-out 0.8s both, pulse 4s ease-in-out 1.8s infinite;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize the landing page
document.addEventListener('DOMContentLoaded', () => {
    new CNVRTRLanding();
});

// Add smooth scrolling and performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    // Optimize background animations based on user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        // Disable complex animations for users who prefer reduced motion
        const flowingLines = document.querySelector('.flowing-lines');
        if (flowingLines) {
            flowingLines.style.animation = 'none';
        }
        
        // Disable pulse animation
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.style.animation = 'fadeInUp 1s ease-out 0.8s both';
        }
        
        // Disable all diagonal and wave animations (already disabled for performance)
        const angledLines = document.querySelector('.angled-lines');
        const waveLines = document.querySelector('.wave-lines');
        if (angledLines) angledLines.style.animation = 'none';
        if (waveLines) waveLines.style.animation = 'none';
    }
    
    // Lazy load background patterns for better performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
            }
        });
    });
    
    const backgroundPattern = document.querySelector('.background-pattern');
    if (backgroundPattern) {
        observer.observe(backgroundPattern);
    }
}); 