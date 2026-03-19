// ==================== GLOBAL CONFIGURATION ====================
const APP_CONFIG = {
    name: 'NAV Education',
    version: '2.1.0',
    build: '2024.1',
    storagePrefix: 'nav_',
    maxRecentSearches: 5,
    maxSavedMaterials: 20,
    toastDuration: 2200,
    debounceDelay: 300,
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    apiEndpoint: 'https://api.naveducation.com/v1',
    defaultSettings: {
        userName: 'Amit Kumar',
        userEmail: 'amit.kumar@example.com',
        userPhone: '+91 98765 43210',
        userDob: '1995-06-15',
        userGoal: 'NEET',
        studyHours: 4,
        studyReminders: true,
        reminderTime: '19:00',
        darkMode: true,
        accentColor: '#6366f1',
        fontSize: 'medium',
        language: 'english',
        timezone: 'IST',
        pushNotifications: true,
        emailNotifications: true,
        achievementAlerts: true,
        courseUpdates: true,
        publicProfile: false,
        shareActivity: false,
        dataCollection: true,
        profileAvatar: null,
        avatarZoom: 100,
        progress: 20,
        streak: 7,
        stats: {
            courses: 3,
            hours: 28,
            badges: 5,
            totalCourses: 3,
            totalHours: 28,
            totalBadges: 5
        }
    }
};

// ==================== GLOBAL STATE ====================
let activeToast = null;
let activeModal = null;
let currentUser = null;
let appCache = new Map();

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safe DOM element selector
 */
const $ = (id) => document.getElementById(id);

/**
 * Safe query selector
 */
const $q = (selector, parent = document) => parent.querySelector(selector);

/**
 * Safe query selector all
 */
const $qa = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

/**
 * Debounce function for performance optimization
 */
function debounce(func, wait = APP_CONFIG.debounceDelay) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance optimization
 */
function throttle(func, limit = 1000) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format numbers with K/M suffix
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Format date to relative time
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if value is empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

// ==================== STORAGE MANAGEMENT ====================

/**
 * Set item in localStorage with prefix
 */
function setStorage(key, value) {
    try {
        const prefixedKey = APP_CONFIG.storagePrefix + key;
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        localStorage.setItem(prefixedKey, serializedValue);
        
        // Update cache
        appCache.set(prefixedKey, value);
        
        // Dispatch storage event for cross-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
            key: prefixedKey,
            newValue: serializedValue
        }));
        
        return true;
    } catch (e) {
        console.error('Storage error:', e);
        return false;
    }
}

/**
 * Get item from localStorage with prefix
 */
function getStorage(key, defaultValue = null) {
    try {
        const prefixedKey = APP_CONFIG.storagePrefix + key;
        
        // Check cache first
        if (appCache.has(prefixedKey)) {
            return appCache.get(prefixedKey);
        }
        
        const value = localStorage.getItem(prefixedKey);
        
        if (value === null) return defaultValue;
        
        // Try to parse JSON
        try {
            const parsed = JSON.parse(value);
            appCache.set(prefixedKey, parsed);
            return parsed;
        } catch {
            appCache.set(prefixedKey, value);
            return value;
        }
    } catch (e) {
        console.error('Storage error:', e);
        return defaultValue;
    }
}

/**
 * Remove item from localStorage
 */
function removeStorage(key) {
    try {
        const prefixedKey = APP_CONFIG.storagePrefix + key;
        localStorage.removeItem(prefixedKey);
        appCache.delete(prefixedKey);
        return true;
    } catch (e) {
        console.error('Storage error:', e);
        return false;
    }
}

/**
 * Clear all app storage
 */
function clearStorage() {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(APP_CONFIG.storagePrefix)) {
                localStorage.removeItem(key);
            }
        });
        appCache.clear();
        return true;
    } catch (e) {
        console.error('Storage error:', e);
        return false;
    }
}

/**
 * Get all app storage items
 */
function getAllStorage() {
    const items = {};
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(APP_CONFIG.storagePrefix)) {
                const shortKey = key.replace(APP_CONFIG.storagePrefix, '');
                const value = localStorage.getItem(key);
                try {
                    items[shortKey] = JSON.parse(value);
                } catch {
                    items[shortKey] = value;
                }
            }
        });
        return items;
    } catch (e) {
        console.error('Storage error:', e);
        return {};
    }
}

// ==================== SETTINGS MANAGEMENT ====================

/**
 * Load all settings from localStorage
 */
function loadSettings() {
    const settings = {};
    
    // Load each setting with default fallback
    Object.keys(APP_CONFIG.defaultSettings).forEach(key => {
        settings[key] = getStorage(key, APP_CONFIG.defaultSettings[key]);
    });
    
    // Load user stats
    settings.stats = getStorage('userStats', APP_CONFIG.defaultSettings.stats);
    
    // Load progress
    settings.progress = getStorage('progress', APP_CONFIG.defaultSettings.progress);
    
    // Load streak
    settings.streak = getStorage('streak', APP_CONFIG.defaultSettings.streak);
    
    // Load saved materials
    settings.savedMaterials = getStorage('savedMaterials', []);
    
    // Load recent searches
    settings.recentSearches = getStorage('recentSearches', []);
    
    // Load last opened
    settings.lastOpened = getStorage('lastOpened', null);
    
    // Load achievements
    settings.achievements = getStorage('achievements', []);
    
    // Load notifications
    settings.notifications = getStorage('notifications', []);
    
    // Load downloads
    settings.downloads = getStorage('downloads', []);
    
    // Load cache
    settings.cache = getStorage('cache', {});
    
    currentUser = settings;
    return settings;
}

/**
 * Save all settings to localStorage
 */
function saveSettings(settings) {
    Object.keys(settings).forEach(key => {
        setStorage(key, settings[key]);
    });
    
    // Update current user
    currentUser = { ...currentUser, ...settings };
    
    // Dispatch settings updated event
    window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: currentUser
    }));
    
    return true;
}

/**
 * Reset settings to default
 */
function resetSettings() {
    clearStorage();
    loadSettings();
    applySettings();
    
    showToast('Settings reset to default', 'success');
}

/**
 * Apply settings to UI
 */
function applySettings() {
    if (!currentUser) loadSettings();
    
    // Apply theme
    applyTheme(currentUser.darkMode);
    
    // Apply accent color
    applyAccentColor(currentUser.accentColor);
    
    // Apply font size
    applyFontSize(currentUser.fontSize);
    
    // Apply language
    applyLanguage(currentUser.language);
    
    // Update header
    updateHeader();
    
    // Update progress bars
    updateAllProgressBars();
    
    // Update welcome messages
    updateWelcomeMessages();
}

/**
 * Apply theme
 */
function applyTheme(isDark) {
    document.body.classList.toggle('light-theme', !isDark);
    
    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#020617' : '#6366f1');
    }
}

/**
 * Apply accent color
 */
function applyAccentColor(color) {
    document.documentElement.style.setProperty('--primary', color);
    
    // Update active color options
    $qa('.color-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.color === color);
    });
}

/**
 * Apply font size
 */
function applyFontSize(size) {
    const sizes = {
        small: '14px',
        medium: '16px',
        large: '18px'
    };
    document.documentElement.style.fontSize = sizes[size] || sizes.medium;
}

/**
 * Apply language
 */
function applyLanguage(lang) {
    document.documentElement.lang = lang;
    
    // Update active language options
    $qa('.language-option').forEach(opt => {
        opt.classList.toggle('active', opt.textContent.toLowerCase().includes(lang));
    });
}

// ==================== PROFILE MANAGEMENT ====================

/**
 * Update header with user info
 */
function updateHeader() {
    if (!currentUser) loadSettings();
    
    // Update header avatar
    const headerAvatar = $('headerAvatar');
    const headerEmoji = $('headerEmoji');
    
    if (headerAvatar && headerEmoji) {
        if (currentUser.profileAvatar) {
            headerAvatar.src = currentUser.profileAvatar;
            headerAvatar.style.display = 'block';
            headerEmoji.style.display = 'none';
        } else {
            headerAvatar.style.display = 'none';
            headerEmoji.style.display = 'block';
        }
    }
    
    // Update profile menu
    const menuName = $('menuUserName');
    const menuEmail = $('menuUserEmail');
    
    if (menuName) menuName.textContent = currentUser.userName;
    if (menuEmail) menuEmail.textContent = currentUser.userEmail;
    
    // Update welcome text
    const welcomeText = $('welcomeText');
    if (welcomeText) {
        welcomeText.innerHTML = `Welcome Back, ${currentUser.userName} 👋`;
    }
    
    // Update display name
    const displayName = $('displayName');
    if (displayName) displayName.textContent = currentUser.userName;
    
    // Update display email
    const displayEmail = $('displayEmail');
    if (displayEmail) displayEmail.textContent = currentUser.userEmail;
    
    // Update daily goal
    const dailyGoal = $('dailyGoal');
    if (dailyGoal) dailyGoal.textContent = currentUser.studyHours;
    
    // Update streak
    const streakCount = $('streakCount');
    if (streakCount) streakCount.textContent = currentUser.streak;
    
    // Update stats
    updateStatsDisplay();
}

/**
 * Update profile avatar
 */
function updateAvatar(imageData) {
    currentUser.profileAvatar = imageData;
    setStorage('profileAvatar', imageData);
    
    // Update header
    updateHeader();
    
    // Update avatar on settings page if present
    const avatarImage = $('avatarImage');
    const avatarEmoji = $('avatarEmoji');
    const removeBtn = $('removeAvatarBtn');
    
    if (avatarImage && avatarEmoji) {
        if (imageData) {
            avatarImage.src = imageData;
            avatarImage.classList.add('show');
            avatarEmoji.classList.add('hide');
            if (removeBtn) removeBtn.style.display = 'flex';
        } else {
            avatarImage.classList.remove('show');
            avatarEmoji.classList.remove('hide');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
}

/**
 * Remove profile avatar
 */
function removeAvatar() {
    updateAvatar(null);
    showToast('Profile photo removed', 'info');
}

/**
 * Update stats display
 */
function updateStatsDisplay() {
    const stats = currentUser.stats;
    
    // Update home page stats
    const coursesEnrolled = $('coursesEnrolled');
    const hoursLearned = $('hoursLearned');
    const achievements = $('achievements');
    
    if (coursesEnrolled) coursesEnrolled.textContent = stats.courses;
    if (hoursLearned) hoursLearned.textContent = stats.hours;
    if (achievements) achievements.textContent = stats.badges;
    
    // Update welcome stats
    const totalCourses = $('totalCourses');
    const totalHours = $('totalHours');
    const totalBadges = $('totalBadges');
    
    if (totalCourses) totalCourses.textContent = stats.totalCourses || stats.courses;
    if (totalHours) totalHours.textContent = stats.totalHours || stats.hours;
    if (totalBadges) totalBadges.textContent = stats.totalBadges || stats.badges;
    
    // Update today's hours
    const todayHours = $('todayHours');
    if (todayHours) todayHours.textContent = getStorage('todayHours', '2.5');
}

// ==================== PROGRESS MANAGEMENT ====================

/**
 * Update progress bar
 */
function updateProgress(percent, elementId = 'mainProgress', labelId = 'progressLabel') {
    const bar = $(elementId);
    const label = $(labelId);
    
    if (!bar) return;
    
    const safe = Math.max(0, Math.min(100, Number(percent) || 0));
    
    // Animate progress bar
    bar.style.transition = 'width 0.5s ease';
    bar.style.width = safe + "%";
    
    if (label) {
        label.textContent = `${safe}% Completed`;
    }
    
    // Save to storage
    setStorage('progress', safe);
    
    // Update current user
    if (currentUser) currentUser.progress = safe;
}

/**
 * Update all progress bars on the page
 */
function updateAllProgressBars() {
    const progress = getStorage('progress', 20);
    
    // Update main progress
    updateProgress(progress, 'mainProgress', 'progressLabel');
    
    // Update course cards
    $qa('[data-progress]').forEach(card => {
        const courseProgress = card.dataset.progress;
        const progressBar = card.querySelector('.progress-bar-fill');
        const progressText = card.querySelector('.progress-header span:last-child');
        
        if (progressBar) {
            progressBar.style.width = courseProgress + '%';
        }
        if (progressText) {
            progressText.textContent = courseProgress + '%';
        }
    });
}

/**
 * Increment progress
 */
function incrementProgress(amount = 5) {
    const current = getStorage('progress', 20);
    const newProgress = Math.min(100, current + amount);
    updateProgress(newProgress);
    
    // Update streak
    updateStreak();
    
    showToast(`Progress updated to ${newProgress}%`, 'success');
}

/**
 * Update streak
 */
function updateStreak() {
    let streak = getStorage('streak', 7);
    
    // Check if last active was yesterday
    const lastActive = getStorage('lastActive');
    const today = new Date().toDateString();
    
    if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActive === yesterday.toDateString()) {
            streak++;
        } else if (lastActive) {
            streak = 1;
        }
        
        setStorage('streak', streak);
        setStorage('lastActive', today);
        
        // Update streak display
        const streakCount = $('streakCount');
        if (streakCount) streakCount.textContent = streak;
    }
}

// ==================== NOTIFICATION MANAGEMENT ====================

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = APP_CONFIG.toastDuration) {
    // Remove existing toast
    if (activeToast) {
        activeToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = getToastIcon(type);
    icon.style.marginRight = '8px';
    toast.prepend(icon);
    
    document.body.appendChild(toast);
    activeToast = toast;
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
                activeToast = null;
            }
        }, 300);
    }, duration);
}

/**
 * Get toast icon based on type
 */
function getToastIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

/**
 * Show notification badge
 */
function showNotificationBadge(count) {
    const badge = $('notificationBadge');
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Add notification
 */
function addNotification(notification) {
    const notifications = getStorage('notifications', []);
    
    const newNotification = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
    };
    
    notifications.unshift(newNotification);
    setStorage('notifications', notifications.slice(0, 50)); // Keep last 50
    
    showNotificationBadge(notifications.filter(n => !n.read).length);
    
    return newNotification;
}

// ==================== PROFILE MENU ====================

/**
 * Initialize profile menu
 */
function initProfileMenu() {
    const profileBtn = $('profileBtn');
    const profileMenu = $('profileMenu');
    
    if (!profileBtn || !profileMenu) return;
    
    // Toggle menu
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('active');
    });
    
    // Close on click outside
    document.addEventListener('click', () => {
        profileMenu.classList.remove('active');
    });
    
    // Prevent closing when clicking inside menu
    profileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

/**
 * Profile menu actions
 */
function showStats() {
    showToast('Learning statistics coming soon!', 'info');
}

function showAchievements() {
    showToast('Achievements gallery coming soon!', 'info');
}

function logout() {
    showModal('Logout', 'Are you sure you want to logout?', () => {
        showToast('Logged out successfully', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
    });
}

// ==================== MODAL MANAGEMENT ====================

/**
 * Show modal dialog
 */
function showModal(title, message, confirmCallback, cancelCallback = null) {
    const modal = $('confirmModal');
    const modalTitle = $('modalTitle');
    const modalMessage = $('modalMessage');
    const confirmBtn = $('modalConfirmBtn');
    const cancelBtn = modal?.querySelector('.btn-secondary');
    
    if (!modal) return;
    
    // Set content
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    
    // Set confirm button
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            hideModal();
            if (confirmCallback) confirmCallback();
        };
    }
    
    // Set cancel button
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            hideModal();
            if (cancelCallback) cancelCallback();
        };
    }
    
    // Show modal
    modal.classList.add('active');
    activeModal = modal;
}

/**
 * Hide modal
 */
function hideModal() {
    const modal = $('confirmModal');
    if (modal) {
        modal.classList.remove('active');
        activeModal = null;
    }
}

// ==================== SEARCH MANAGEMENT ====================

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInput = $('mainSearchInput');
    if (!searchInput) return;
    
    const searchWrapper = $('searchWrapper');
    const clearBtn = $('clearSearch');
    
    // Search on input
    searchInput.addEventListener('input', debounce(() => {
        performSearch();
        updateClearButton();
    }));
    
    // Focus effects
    searchInput.addEventListener('focus', () => {
        searchWrapper?.classList.add('focused');
    });
    
    searchInput.addEventListener('blur', () => {
        searchWrapper?.classList.remove('focused');
    });
    
    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            updateClearButton();
            performSearch();
            searchInput.focus();
        });
    }
    
    // Load recent searches
    displayRecentSearches();
    
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
        searchInput.value = query;
        performSearch();
        addToRecentSearches(query);
    }
}

/**
 * Perform search
 */
function performSearch() {
    const searchInput = $('mainSearchInput');
    if (!searchInput) return;
    
    const term = searchInput.value.toLowerCase().trim();
    
    // Show loading
    const skeleton = $('loadingSkeleton');
    const resultsGrid = $('resultsGrid');
    const noResults = $('noResults');
    
    if (skeleton) skeleton.style.display = 'block';
    if (resultsGrid) resultsGrid.innerHTML = '';
    if (noResults) noResults.style.display = 'none';
    
    // Simulate search delay
    setTimeout(() => {
        if (skeleton) skeleton.style.display = 'none';
        
        // Get search data from window or use mock
        const searchData = window.searchData || getMockSearchData();
        
        // Filter results
        const results = filterSearchResults(term, searchData);
        
        // Display results
        if (results.length === 0) {
            if (noResults) noResults.style.display = 'block';
        } else {
            displaySearchResults(results);
        }
        
        // Update result count
        const resultCount = $('resultCount');
        if (resultCount) {
            resultCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
        }
        
        // Add to recent searches
        if (term) {
            addToRecentSearches(term);
        }
    }, 500);
}

/**
 * Filter search results
 */
function filterSearchResults(term, data) {
    return data.filter(item => {
        // Filter by search term
        if (term) {
            const matchesTitle = item.title.toLowerCase().includes(term);
            const matchesDesc = item.description?.toLowerCase().includes(term);
            const matchesTags = item.tags?.some(tag => tag.toLowerCase().includes(term));
            
            if (!matchesTitle && !matchesDesc && !matchesTags) {
                return false;
            }
        }
        
        // Filter by category
        const activeCategory = $q('.category-pill.active')?.dataset.category;
        if (activeCategory && activeCategory !== 'all' && item.category !== activeCategory) {
            return false;
        }
        
        // Filter by content type
        const activeFilter = $q('.filter-chip.active')?.dataset.filter;
        if (activeFilter && activeFilter !== 'all' && item.type !== activeFilter) {
            return false;
        }
        
        return true;
    });
}

/**
 * Display search results
 */
function displaySearchResults(results) {
    const grid = $('resultsGrid');
    if (!grid) return;
    
    const viewMode = $q('.view-btn.active')?.dataset.view || 'grid';
    grid.className = `results-grid ${viewMode}-view`;
    
    results.forEach(item => {
        const card = createResultCard(item);
        grid.appendChild(card);
    });
}

/**
 * Create result card
 */
function createResultCard(item) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.dataset.id = item.id;
    
    const priceDisplay = item.free ? 'Free' : `₹${item.price}`;
    const priceClass = item.free ? 'free' : '';
    
    card.innerHTML = `
        <div class="result-icon">${item.icon || '📚'}</div>
        <div class="result-content">
            <div class="result-category">${item.category?.toUpperCase() || 'COURSE'}</div>
            <div class="result-title">
                ${item.title}
                ${item.popular ? '<span class="result-badge popular">Popular</span>' : ''}
                ${item.free ? '<span class="result-badge free">Free</span>' : ''}
            </div>
            <div class="result-meta">
                <span><i class="far fa-clock"></i> ${item.duration || 'N/A'}</span>
                <span><i class="far fa-file-alt"></i> ${item.lessons || 0} lessons</span>
                <span><i class="far fa-user"></i> ${formatNumber(item.students || 0)}</span>
            </div>
            <div class="result-description">${item.description || ''}</div>
            <div class="result-footer">
                <div class="result-rating">
                    <i class="fas fa-star"></i>
                    ${item.rating || 0}
                    <span>(${formatNumber(item.reviews || 0)})</span>
                </div>
                <div class="result-price ${priceClass}">${priceDisplay}</div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openResult(item.id));
    
    return card;
}

/**
 * Get mock search data
 */
function getMockSearchData() {
    return [
        {
            id: 1,
            title: 'Complete UI/UX Design Masterclass',
            category: 'design',
            type: 'course',
            icon: '🎨',
            description: 'Learn design thinking, Figma, Adobe XD, and create stunning interfaces.',
            lessons: 48,
            duration: '24 hours',
            rating: 4.8,
            reviews: 12500,
            students: 15200,
            price: 4999,
            level: 'Beginner',
            tags: ['Figma', 'Adobe XD', 'Prototyping'],
            popular: true,
            free: false
        },
        {
            id: 2,
            title: 'Full Stack Web Development Bootcamp',
            category: 'development',
            type: 'course',
            icon: '💻',
            description: 'Master HTML, CSS, JavaScript, React, Node.js, and MongoDB.',
            lessons: 120,
            duration: '60 hours',
            rating: 4.9,
            reviews: 25800,
            students: 32500,
            price: 7999,
            level: 'Intermediate',
            tags: ['React', 'Node.js', 'MongoDB'],
            popular: true,
            free: false
        },
        {
            id: 3,
            title: 'Data Science Fundamentals with Python',
            category: 'data',
            type: 'course',
            icon: '📊',
            description: 'Learn Python, Pandas, NumPy, and machine learning basics.',
            lessons: 65,
            duration: '32 hours',
            rating: 4.7,
            reviews: 8900,
            students: 11200,
            price: 5999,
            level: 'Beginner',
            tags: ['Python', 'Pandas', 'Machine Learning'],
            popular: true,
            free: false
        }
    ];
}

/**
 * Open result
 */
function openResult(id) {
    showToast(`Opening course...`, 'info');
    // In real app: window.location.href = `course.html?id=${id}`;
}

/**
 * Update clear button visibility
 */
function updateClearButton() {
    const searchInput = $('mainSearchInput');
    const clearBtn = $('clearSearch');
    
    if (searchInput && clearBtn) {
        clearBtn.classList.toggle('visible', searchInput.value.length > 0);
    }
}

/**
 * Add to recent searches
 */
function addToRecentSearches(term) {
    if (!term) return;
    
    let recent = getStorage('recentSearches', []);
    
    // Remove if exists
    recent = recent.filter(t => t !== term);
    
    // Add to beginning
    recent.unshift(term);
    
    // Keep only max
    if (recent.length > APP_CONFIG.maxRecentSearches) {
        recent.pop();
    }
    
    setStorage('recentSearches', recent);
    displayRecentSearches();
}

/**
 * Display recent searches
 */
function displayRecentSearches() {
    const container = $('recentSearches');
    const list = $('recentList');
    
    if (!container || !list) return;
    
    const recent = getStorage('recentSearches', []);
    
    if (recent.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    recent.forEach(term => {
        const item = document.createElement('span');
        item.className = 'recent-item';
        item.innerHTML = `
            <i class="fas fa-search"></i>
            ${term}
            <span class="remove" onclick="window.removeRecentSearch('${term}', event)">
                <i class="fas fa-times"></i>
            </span>
        `;
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.remove')) {
                searchRecent(term);
            }
        });
        list.appendChild(item);
    });
}

/**
 * Search recent term
 */
function searchRecent(term) {
    const searchInput = $('mainSearchInput');
    if (searchInput) {
        searchInput.value = term;
        performSearch();
    }
}

/**
 * Remove recent search
 */
function removeRecentSearch(term, event) {
    event?.stopPropagation();
    
    let recent = getStorage('recentSearches', []);
    recent = recent.filter(t => t !== term);
    setStorage('recentSearches', recent);
    
    displayRecentSearches();
}

/**
 * Clear search history
 */
function clearSearchHistory() {
    showModal('Clear History', 'Clear all recent searches?', () => {
        setStorage('recentSearches', []);
        displayRecentSearches();
        showToast('Search history cleared', 'success');
    });
}

// ==================== LIBRARY MANAGEMENT ====================

/**
 * Open material in library
 */
function openMaterial(subject) {
    showToast(`Opening ${subject}...`, 'info');
    
    let saved = getStorage('savedMaterials', []);
    
    if (!saved.includes(subject)) {
        saved.push(subject);
        setStorage('savedMaterials', saved);
    }
    
    setStorage('lastOpened', subject);
    
    // Update saved count
    const savedCount = $('savedCount');
    if (savedCount) {
        savedCount.textContent = saved.length + ' items';
    }
    
    // Refresh saved list
    loadSavedMaterials();
}

/**
 * Load saved materials
 */
function loadSavedMaterials() {
    const container = $('savedList');
    if (!container) return;
    
    const saved = getStorage('savedMaterials', []);
    
    container.innerHTML = '';
    
    if (saved.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h4>No saved materials</h4>
                <p>Save courses and materials to access them quickly</p>
            </div>
        `;
        return;
    }
    
    saved.forEach(item => {
        const div = document.createElement('div');
        div.className = 'material-card';
        div.innerHTML = `
            <div class="material-icon">📌</div>
            <div class="material-title">${item}</div>
            <div class="material-subtitle">Saved material</div>
        `;
        div.addEventListener('click', () => openMaterial(item));
        container.appendChild(div);
    });
    
    const last = getStorage('lastOpened');
    if (last) {
        showToast(`Last opened: ${last}`, 'info');
    }
}

// ==================== THEME MANAGEMENT ====================

/**
 * Initialize theme
 */
function initTheme() {
    const savedTheme = getStorage('darkMode', true);
    applyTheme(savedTheme);
    
    // Theme toggle
    const themeToggle = $('themeToggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme;
        themeToggle.addEventListener('change', toggleTheme);
    }
}

/**
 * Toggle theme
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('light-theme');
    setStorage('darkMode', !isDark);
    applyTheme(!isDark);
    showToast(isDark ? 'Light mode enabled ☀️' : 'Dark mode enabled 🌙', 'success');
}

// ==================== ACCENT COLOR MANAGEMENT ====================

/**
 * Set accent color
 */
function setAccentColor(color, element) {
    applyAccentColor(color);
    setStorage('accentColor', color);
    showToast('Accent color updated!', 'success');
}

// ==================== LANGUAGE MANAGEMENT ====================

/**
 * Select language
 */
function selectLanguage(lang, element) {
    $qa('.language-option').forEach(opt => {
        opt.classList.remove('active');
    });
    element.classList.add('active');
    
    setStorage('language', lang);
    applyLanguage(lang);
    showToast(`Language set to ${lang}`, 'success');
}

// ==================== SETTINGS PAGE FUNCTIONS ====================

/**
 * Save profile
 */
function saveProfile() {
    const name = $('userName')?.value || '';
    const email = $('userEmail')?.value || '';
    const phone = $('userPhone')?.value || '';
    const dob = $('userDob')?.value || '';
    
    setStorage('userName', name);
    setStorage('userEmail', email);
    setStorage('userPhone', phone);
    setStorage('userDob', dob);
    
    updateHeader();
    showToast('Profile updated successfully!', 'success');
}

/**
 * Save all settings
 */
function saveAllSettings() {
    // Account
    setStorage('userName', $('userName')?.value || '');
    setStorage('userEmail', $('userEmail')?.value || '');
    setStorage('userPhone', $('userPhone')?.value || '');
    setStorage('userDob', $('userDob')?.value || '');
    
    // Learning
    setStorage('userGoal', $('userGoal')?.value || 'NEET');
    setStorage('studyHours', $('studyHours')?.value || '4');
    setStorage('studyReminders', $('studyReminders')?.checked || false);
    setStorage('reminderTime', $('reminderTime')?.value || '19:00');
    
    // Notifications
    setStorage('pushNotifications', $('pushNotifications')?.checked || false);
    setStorage('emailNotifications', $('emailNotifications')?.checked || false);
    setStorage('achievementAlerts', $('achievementAlerts')?.checked || false);
    setStorage('courseUpdates', $('courseUpdates')?.checked || false);
    
    // Privacy
    setStorage('publicProfile', $('publicProfile')?.checked || false);
    setStorage('shareActivity', $('shareActivity')?.checked || false);
    setStorage('dataCollection', $('dataCollection')?.checked || false);
    
    // Appearance
    setStorage('fontSize', $('fontSize')?.value || 'medium');
    setStorage('timezone', $('timezone')?.value || 'IST');
    
    // Reload settings
    loadSettings();
    applySettings();
    
    showToast('All settings saved successfully! ✅', 'success');
}

/**
 * Change password
 */
function changePassword() {
    showModal('Change Password', 'Password reset link will be sent to your email.', () => {
        showToast('Password reset email sent!', 'success');
    });
}

/**
 * Backup data
 */
function backupData() {
    showLoading();
    showToast('Backing up your data...', 'info');
    
    setTimeout(() => {
        const lastBackup = $('lastBackup');
        if (lastBackup) lastBackup.textContent = 'Now';
        
        hideLoading();
        showToast('Backup completed!', 'success');
    }, 1500);
}

/**
 * Restore data
 */
function restoreData() {
    showModal('Restore Data', 'This will overwrite current data with backup. Continue?', () => {
        showToast('Data restored successfully!', 'success');
        loadSettings();
        applySettings();
    });
}

/**
 * Clear cache
 */
function clearCache() {
    showModal('Clear Cache', 'Clear downloaded courses and temporary data?', () => {
        const storageUsed = $('storageUsed');
        const cachedCourses = $('cachedCourses');
        
        if (storageUsed) storageUsed.textContent = '0';
        if (cachedCourses) cachedCourses.textContent = '0';
        
        showToast('Cache cleared!', 'success');
    });
}

/**
 * Confirm reset
 */
function confirmReset() {
    showModal('Reset All Data', 'This will erase all your progress and settings. This action cannot be undone!', () => {
        resetSettings();
        setTimeout(() => location.reload(), 1000);
    });
}

/**
 * Delete account
 */
function deleteAccount() {
    showModal('Delete Account', 'Are you absolutely sure? All your data will be permanently removed.', () => {
        showToast('Account deletion requested', 'warning');
        setTimeout(() => window.location.href = 'index.html', 1500);
    });
}

// ==================== AVATAR UPLOAD ====================

/**
 * Handle avatar upload
 */
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Check file type
    if (!file.type.match('image.*')) {
        showToast('Please select an image file (JPEG, PNG, etc.)', 'error');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Store temporarily for editing
        window.tempAvatarData = e.target.result;
        openImageEditor();
    };
    
    reader.onerror = function() {
        showToast('Error reading file', 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Open image editor
 */
function openImageEditor() {
    const modal = $('imageEditorModal');
    const preview = $('editorPreview');
    const zoomSlider = $('zoomSlider');
    const zoomValue = $('zoomValue');
    
    if (!window.tempAvatarData && !getStorage('profileAvatar')) {
        showToast('Please upload an image first', 'warning');
        return;
    }
    
    // Use temp data or existing avatar
    const imageData = window.tempAvatarData || getStorage('profileAvatar');
    preview.src = imageData;
    
    // Load saved zoom level
    const savedZoom = getStorage('avatarZoom', 100);
    zoomSlider.value = savedZoom;
    zoomValue.textContent = savedZoom + '%';
    preview.style.transform = `scale(${savedZoom / 100})`;
    
    modal.classList.add('active');
}

/**
 * Close image editor
 */
function closeImageEditor() {
    const modal = $('imageEditorModal');
    if (modal) modal.classList.remove('active');
    window.tempAvatarData = null;
}

/**
 * Save edited image
 */
function saveEditedImage() {
    const preview = $('editorPreview');
    const zoom = $('zoomSlider')?.value || 100;
    
    // Create a canvas to apply zoom
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 400;
    
    // Draw image with zoom
    ctx.save();
    ctx.translate(200, 200);
    ctx.scale(zoom / 100, zoom / 100);
    ctx.drawImage(preview, -200, -200, 400, 400);
    ctx.restore();
    
    // Save to storage
    const finalImage = canvas.toDataURL('image/jpeg', 0.9);
    updateAvatar(finalImage);
    setStorage('avatarZoom', zoom);
    
    // Close editor
    closeImageEditor();
    showToast('Profile photo saved!', 'success');
}

// ==================== LOADING FUNCTIONS ====================

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = $('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Show loading overlay
 */
function showLoading() {
    const overlay = $('loadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

// ==================== WELCOME MESSAGES ====================

/**
 * Update welcome messages
 */
function updateWelcomeMessages() {
    const hour = new Date().getHours();
    const welcomeMessage = $('welcomeMessage');
    const motivationText = $('motivationText');
    
    if (welcomeMessage) {
        if (hour < 12) {
            welcomeMessage.textContent = 'Good morning! Ready to learn today?';
        } else if (hour < 17) {
            welcomeMessage.textContent = 'Good afternoon! Keep up the great work!';
        } else if (hour < 20) {
            welcomeMessage.textContent = 'Good evening! Almost done for the day!';
        } else {
            welcomeMessage.textContent = 'Learning at night? That\'s dedication!';
        }
    }
    
    if (motivationText) {
        const quotes = [
            'The expert in anything was once a beginner.',
            'Every day is a learning opportunity.',
            'Progress, not perfection.',
            'Small steps lead to big results.',
            'Your future is created by what you do today.'
        ];
        motivationText.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }
}

// ==================== PAGE SPECIFIC INIT ====================

/**
 * Initialize home page
 */
function initHomePage() {
    // Set up progress elements
    const progressBar = $q('.progress-bar');
    if (progressBar) progressBar.id = 'mainProgress';
    
    const progressText = $q('.progress-text');
    if (progressText) progressText.id = 'progressLabel';
    
    // Load progress
    updateAllProgressBars();
    
    // Initialize recommendation chips
    $qa('.recommendation-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const topic = chip.textContent.trim();
            window.location.href = `search.html?q=${encodeURIComponent(topic)}`;
        });
    });
    
    // Initialize continue learning
    const continueCard = $q('.continue-learning-card');
    if (continueCard) {
        continueCard.addEventListener('click', continueLearning);
    }
    
    // Initialize daily challenge
    const challenge = $q('.daily-challenge');
    if (challenge) {
        challenge.addEventListener('click', () => {
            showToast('Daily challenge activated!', 'success');
        });
    }
}

/**
 * Continue learning
 */
function continueLearning() {
    showToast('Continuing your last lesson...', 'info');
    // In real app: window.location.href = 'course.html?continue=true';
}

/**
 * Initialize library page
 */
function initLibraryPage() {
    loadSavedMaterials();
    
    // Initialize search
    const librarySearch = $('librarySearch');
    if (librarySearch) {
        librarySearch.addEventListener('input', debounce(() => {
            const term = librarySearch.value.toLowerCase();
            filterLibraryItems(term);
        }));
    }
    
    // Initialize category tabs
    $qa('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            $qa('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterLibraryByCategory(this.dataset.category);
        });
    });
}

/**
 * Filter library items
 */
function filterLibraryItems(term) {
    const courses = $qa('.course-card');
    const materials = $qa('.material-card');
    let visibleCount = 0;
    
    courses.forEach(course => {
        const title = course.querySelector('.course-title')?.textContent.toLowerCase() || '';
        const matches = title.includes(term) || term === '';
        course.style.display = matches ? 'block' : 'none';
        if (matches) visibleCount++;
    });
    
    materials.forEach(material => {
        const title = material.querySelector('.material-title')?.textContent.toLowerCase() || '';
        material.style.display = title.includes(term) || term === '' ? 'block' : 'none';
    });
    
    const countEl = $('courseCount');
    if (countEl) countEl.textContent = `${visibleCount} courses`;
}

/**
 * Filter library by category
 */
function filterLibraryByCategory(category) {
    const courses = $qa('.course-card');
    let visibleCount = 0;
    
    courses.forEach(course => {
        const matches = category === 'all' || course.dataset.category === category;
        course.style.display = matches ? 'block' : 'none';
        if (matches) visibleCount++;
    });
    
    const countEl = $('courseCount');
    if (countEl) countEl.textContent = `${visibleCount} courses`;
}

/**
 * Initialize settings page
 */
function initSettingsPage() {
    // Load all settings
    loadSettings();
    
    // Initialize hours slider
    const hoursSlider = $('studyHours');
    const hoursDisplay = $('hoursDisplay');
    
    if (hoursSlider && hoursDisplay) {
        hoursSlider.addEventListener('input', function() {
            hoursDisplay.textContent = this.value + 'h';
        });
    }
    
    // Initialize avatar upload
    const avatarContainer = $('avatarContainer');
    const avatarUpload = $('avatarUpload');
    
    if (avatarContainer && avatarUpload) {
        avatarContainer.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                avatarUpload.click();
            }
        });
        
        avatarUpload.addEventListener('change', handleAvatarUpload);
    }
    
    // Initialize zoom slider
    const zoomSlider = $('zoomSlider');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', function(e) {
            const preview = $('editorPreview');
            const zoomValue = $('zoomValue');
            const value = e.target.value;
            
            if (zoomValue) zoomValue.textContent = value + '%';
            if (preview) preview.style.transform = `scale(${value / 100})`;
        });
    }
    
    // Initialize save buttons
    const saveProfileBtn = $('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    
    const saveAllBtn = $('saveSettings');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllSettings);
    }
}

// ==================== CROSS-TAB SYNC ====================

/**
 * Initialize cross-tab sync
 */
function initCrossTabSync() {
    window.addEventListener('storage', (e) => {
        if (e.key?.startsWith(APP_CONFIG.storagePrefix)) {
            // Update cache
            if (e.newValue) {
                try {
                    appCache.set(e.key, JSON.parse(e.newValue));
                } catch {
                    appCache.set(e.key, e.newValue);
                }
            } else {
                appCache.delete(e.key);
            }
            
            // Reload settings
            loadSettings();
            
            // Apply settings
            applySettings();
            
            // Show sync status
            showSyncStatus();
        }
    });
    
    window.addEventListener('settingsUpdated', () => {
        applySettings();
    });
}

/**
 * Show sync status
 */
function showSyncStatus() {
    const syncStatus = $('syncStatus');
    if (!syncStatus) return;
    
    syncStatus.style.display = 'flex';
    setTimeout(() => {
        syncStatus.style.display = 'none';
    }, 3000);
}

// ==================== PAGE TRANSITIONS ====================

/**
 * Initialize page transitions
 */
function initPageTransitions() {
    $qa('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            const currentPage = window.location.pathname.split('/').pop();
            
            if (href && href !== currentPage) {
                e.preventDefault();
                document.body.classList.add('page-fade');
                
                setTimeout(() => {
                    window.location.href = href;
                }, 250);
            }
        });
    });
}

// ==================== OFFLINE DETECTION ====================

/**
 * Initialize offline detection
 */
function initOfflineDetection() {
    window.addEventListener('online', () => {
        showToast('You are back online 📶', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('You are offline ✈️', 'warning');
    });
}

// ==================== DOUBLE TAP PROTECTION ====================

/**
 * Initialize double tap protection
 */
function initDoubleTapProtection() {
    let lastTap = 0;
    
    document.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
        }
        
        lastTap = currentTime;
    });
}

// ==================== SERVICE WORKER ====================

/**
 * Register service worker
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('ServiceWorker registration failed:', err);
            });
        });
    }
}

// ==================== MAIN INITIALIZATION ====================

/**
 * Initialize everything
 */
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading overlay
    hideLoading();
    
    // Load settings
    loadSettings();
    
    // Apply settings to UI
    applySettings();
    
    // Initialize common components
    initProfileMenu();
    initTheme();
    initCrossTabSync();
    initPageTransitions();
    initOfflineDetection();
    initDoubleTapProtection();
    initBannerTracking();
    // Page-specific initialization
    const currentPage = window.location.pathname.split('/').pop();
    
    switch (currentPage) {
        case 'index.html':
        case '':
        case '/':
            initHomePage();
            break;
        case 'search.html':
            initSearch();
            break;
        case 'library.html':
            initLibraryPage();
            break;
        case 'settings.html':
            initSettingsPage();
            break;
    }
    
    // Register service worker
    registerServiceWorker();
    
    // Final loading hide
    setTimeout(hideLoading, 500);
});

// Window load event
window.addEventListener('load', hideLoading);

// ==================== BANNER FUNCTIONALITY ====================

/**
 * Initialize banner click tracking
 */
function initBannerTracking() {
    const banners = document.querySelectorAll('.banner-container');
    
    banners.forEach(banner => {
        banner.addEventListener('click', function(e) {
            // Don't track if clicking on child elements
            if (e.target !== this && !this.contains(e.target)) return;
            
            // Track banner click
            trackBannerClick();
            
            // Optional: Show welcome toast on first click
            const clicks = getStorage('bannerClicks', 0);
            if (clicks === 1) { // First click
                showToast('Welcome to NAV Education! 🎓', 'success');
            }
        });
    });
}

/**
 * Track banner clicks in localStorage
 */
function trackBannerClick() {
    const clicks = getStorage('bannerClicks', 0);
    setStorage('bannerClicks', clicks + 1);
    
    // Track last click time
    setStorage('lastBannerClick', new Date().toISOString());
    
    // Optional: Track for analytics
    console.log(`Banner clicked ${clicks + 1} times`);
}

/**
 * Get banner statistics
 */
function getBannerStats() {
    return {
        clicks: getStorage('bannerClicks', 0),
        lastClick: getStorage('lastBannerClick', null)
    };
}

/**
 * Reset banner tracking
 */
function resetBannerTracking() {
    removeStorage('bannerClicks');
    removeStorage('lastBannerClick');
    showToast('Banner tracking reset', 'info');
}

// Export functions to global scope for HTML onclick handlers
window.showToast = showToast;
window.showModal = showModal;
window.hideModal = hideModal;
window.showStats = showStats;
window.showAchievements = showAchievements;
window.logout = logout;
window.setAccentColor = setAccentColor;
window.selectLanguage = selectLanguage;
window.changePassword = changePassword;
window.backupData = backupData;
window.restoreData = restoreData;
window.clearCache = clearCache;
window.confirmReset = confirmReset;
window.deleteAccount = deleteAccount;
window.saveProfile = saveProfile;
window.saveAllSettings = saveAllSettings;
window.removeAvatar = removeAvatar;
window.openImageEditor = openImageEditor;
window.closeImageEditor = closeImageEditor;
window.saveEditedImage = saveEditedImage;
window.clearSearchHistory = clearSearchHistory;
window.removeRecentSearch = removeRecentSearch;
window.continueLearning = continueLearning;
window.openCourse = (id) => showToast(`Opening course...`, 'info');
window.openMaterial = openMaterial;
window.searchTrending = (term) => {
    const searchInput = $('mainSearchInput');
    if (searchInput) {
        searchInput.value = term;
        performSearch();
    }
};