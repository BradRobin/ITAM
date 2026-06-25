/**
 * DASHBOARD MODULE - ITAM SYSTEM
 * Handles dashboard interactivity: typewriter, greeting, stats animation
 */

(function() {
    'use strict';
    
    // ============================================
    // Configuration
    // ============================================
    var TYPING_SPEED = 80;
    var ERASING_SPEED = 40;
    var PAUSE_BEFORE_ERASE = 3000;
    var PAUSE_BEFORE_TYPING = 500;
    
    var typewriterMessages = [
        'Welcome to ITAM System',
        'Manage your assets efficiently',
        'Track assignments in real-time',
        'Stay on top of maintenance',
        'Your IT assets, organized'
    ];
    
    // ============================================
    // Greeting Function
    // ============================================
    function getGreeting() {
        var hour = new Date().getHours();
        var icon = '';
        var message = '';
        
        if (hour >= 5 && hour < 12) {
            message = 'Good Morning';
            icon = '🌅';
        } else if (hour >= 12 && hour < 17) {
            message = 'Good Afternoon';
            icon = '☀️';
        } else if (hour >= 17 && hour < 21) {
            message = 'Good Evening';
            icon = '🌆';
        } else {
            message = 'Good Night';
            icon = '🌙';
        }
        
        return { message: message, icon: icon };
    }
    
    // ============================================
    // Update Greeting
    // ============================================
    function updateGreeting() {
        var greeting = getGreeting();
        var greetingElement = document.getElementById('greetingMessage');
        var iconElement = document.getElementById('greetingIcon');
        
        if (greetingElement) {
            greetingElement.textContent = greeting.message;
        }
        if (iconElement) {
            iconElement.textContent = greeting.icon;
        }
    }
    
    // ============================================
    // Live Time and Date
    // ============================================
    function updateClock() {
        var now = new Date();
        var timeElement = document.getElementById('liveTime');
        var dateElement = document.getElementById('liveDate');
        
        if (timeElement) {
            var hours = String(now.getHours()).padStart(2, '0');
            var minutes = String(now.getMinutes()).padStart(2, '0');
            var seconds = String(now.getSeconds()).padStart(2, '0');
            timeElement.textContent = hours + ':' + minutes + ':' + seconds;
        }
        
        if (dateElement) {
            var options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = now.toLocaleDateString('en-US', options);
        }
        
        var lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            var nowStr = now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');
            lastUpdated.textContent = nowStr;
        }
    }
    
    // ============================================
    // Typewriter Effect
    // ============================================
    function typewriterEffect() {
        var element = document.getElementById('typewriterText');
        if (!element) return;
        
        var messageIndex = 0;
        var charIndex = 0;
        var isDeleting = false;
        var typingTimer = null;
        
        function type() {
            var currentMessage = typewriterMessages[messageIndex];
            
            if (isDeleting) {
                element.textContent = currentMessage.substring(0, charIndex - 1);
                charIndex--;
                
                if (charIndex === 0) {
                    isDeleting = false;
                    messageIndex = (messageIndex + 1) % typewriterMessages.length;
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(type, PAUSE_BEFORE_TYPING);
                    return;
                }
                
                typingTimer = setTimeout(type, ERASING_SPEED);
            } else {
                element.textContent = currentMessage.substring(0, charIndex + 1);
                charIndex++;
                
                if (charIndex === currentMessage.length) {
                    isDeleting = true;
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(type, PAUSE_BEFORE_ERASE);
                    return;
                }
                
                typingTimer = setTimeout(type, TYPING_SPEED);
            }
        }
        
        type();
    }
    
    // ============================================
    // Animate Stats - Counting Effect
    // ============================================
    function animateStats() {
        var statNumbers = document.querySelectorAll('.stat-number[data-count]');
        
        statNumbers.forEach(function(stat) {
            var target = parseInt(stat.getAttribute('data-count'));
            if (target === 0) {
                stat.textContent = '0';
                return;
            }
            
            var current = 0;
            var duration = 1200;
            var steps = 30;
            var increment = target / steps;
            var stepTime = duration / steps;
            
            var timer = setInterval(function() {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                stat.textContent = Math.round(current);
            }, stepTime);
        });
    }
    
    // ============================================
    // Animate Overdue Cards
    // ============================================
    function animateOverdueCards() {
        var cards = document.querySelectorAll('.overdue-card[data-delay]');
        cards.forEach(function(card) {
            var delay = parseInt(card.getAttribute('data-delay')) * 100;
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(function() {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, delay);
        });
    }
    
    // ============================================
    // Refresh Dashboard Data
    // ============================================
    function refreshDashboardData() {
        updateClock();
    }
    
    // ============================================
    // Initialize Dashboard
    // ============================================
    function init() {
        console.log('Dashboard module initializing...');
        
        updateGreeting();
        
        updateClock();
        setInterval(updateClock, 1000);
        
        typewriterEffect();
        
        setTimeout(function() {
            animateStats();
        }, 300);
        
        setTimeout(function() {
            animateOverdueCards();
        }, 500);
        
        setInterval(refreshDashboardData, 60000);
        
        console.log('Dashboard module initialized.');
    }
    
    // ============================================
    // Export
    // ============================================
    window.Dashboard = {
        init: init,
        refresh: refreshDashboardData,
        getGreeting: getGreeting
    };
    
    console.log('Dashboard module loaded.');
    
})();