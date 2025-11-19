// Language Manager - Handles localization across all windows
// This file should be loaded before renderer.js in both index.html and settings.html

let currentLanguage = 'en';
let translations = {};
let isUpdating = false; // Prevent recursive updates

// Initialize language system
async function initLanguage() {
    // Load translations
    if (typeof window.LOCALES !== 'undefined') {
        translations = window.LOCALES;
    }

    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
        currentLanguage = savedLanguage;
    } else {
        // Get language from main process
        if (window.electronAPI && window.electronAPI.getLanguage) {
            currentLanguage = await window.electronAPI.getLanguage();
        }
    }

    // Apply language
    applyLanguage(currentLanguage);

    // Setup language toggle button
    setupLanguageToggle();

    // Listen for language changes from other windows
    if (window.electronAPI && window.electronAPI.onLanguageChanged) {
        window.electronAPI.onLanguageChanged((language) => {
            // Only update if language actually changed
            if (language !== currentLanguage) {
                currentLanguage = language;
                localStorage.setItem('language', language);
                applyLanguage(language);
            }
        });
    }
}

// Apply language to all elements with data-i18n attribute
function applyLanguage(lang) {
    // Prevent recursive updates
    if (isUpdating) {
        return;
    }

    isUpdating = true;
    currentLanguage = lang;

    if (!translations[lang]) {
        console.error(`Language ${lang} not found in translations`);
        isUpdating = false;
        return;
    }

    const t = translations[lang];

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const value = getNestedProperty(t, key);

        if (value !== undefined) {
            // Check if element is an input
            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = value;
            } else if (element.tagName === 'INPUT' && element.placeholder !== undefined) {
                element.placeholder = value;
            } else {
                element.textContent = value;
            }
        }
    });

    // Update document title
    if (document.querySelector('title')) {
        const isSettingsWindow = window.location.pathname.includes('settings.html');
        document.title = isSettingsWindow ? t.settingsTitle : t.mainTitle;
    }

    // Update window title with Electron API
    if (window.electronAPI && window.electronAPI.setLanguage) {
        window.electronAPI.setLanguage(lang);
    }

    // Update language toggle button text
    updateLanguageToggleButton(lang);

    isUpdating = false;
}

// Get nested property from object using dot notation
function getNestedProperty(obj, path) {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return undefined;
        }
    }

    return result;
}

// Setup language toggle button
function setupLanguageToggle() {
    const languageToggleBtn = document.getElementById('language-toggle-btn');

    if (languageToggleBtn) {
        languageToggleBtn.addEventListener('click', () => {
            toggleLanguage();
        });
    }
}

// Toggle between English and Chinese
async function toggleLanguage() {
    const newLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    currentLanguage = newLanguage;

    // Save to localStorage
    localStorage.setItem('language', newLanguage);

    // Apply language
    applyLanguage(newLanguage);

    // Notify other windows via IPC
    if (window.electronAPI && window.electronAPI.setLanguage) {
        await window.electronAPI.setLanguage(newLanguage);
    }
}

// Update language toggle button text
function updateLanguageToggleButton(lang) {
    const languageText = document.getElementById('language-text');
    if (languageText) {
        languageText.textContent = lang === 'en' ? 'EN' : '中文';
    }
}

// Get translation for a specific key
function t(key) {
    if (!translations[currentLanguage]) {
        return key;
    }

    const value = getNestedProperty(translations[currentLanguage], key);
    return value !== undefined ? value : key;
}

// Get current language
function getCurrentLanguage() {
    return currentLanguage;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}

// Export for use in other scripts
window.t = t;
window.getCurrentLanguage = getCurrentLanguage;
window.applyLanguage = applyLanguage;
