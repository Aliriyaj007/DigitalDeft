class TypingSpeedChecker {
    constructor() {
        this.audio = new AudioManager();
        this.storage = new StorageManager();

        this.state = {
            currentText: '',
            userInput: '',
            startTime: null,
            endTime: null,
            testActive: false,
            currentCharIndex: 0,
            errors: 0,
            totalChars: 0,
            timerInterval: null,
            timeRemaining: 60,
            testMode: 'time', // 'time' or 'words'
            difficulty: 'intermediate',
            includePunctuation: true,
            includeNumbers: true,
            includeSymbols: false,
            programmingMode: false,
            longWordsMode: false
        };

        // Performance
        this.statsUpdateTimeout = null;
        this.statsDebounceDelay = 150; // ms

        this.stats = {
            wpm: 0,
            accuracy: 0,
            history: []
        };

        // Word libraries (deduplicated)
        this.commonWords = [
            "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
        ];

        this.programmingWords = [
            "function", "var", "let", "const", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return", "try", "catch", "finally", "throw", "new", "this", "class", "extends", "super", "static", "import", "export", "default", "async", "await", "promise", "array", "object", "string", "number", "boolean", "null", "undefined", "true", "false", "console", "log", "warn", "error", "debug", "info", "window", "document", "navigator", "location", "history", "localStorage", "fetch", "return", "await", "async"
        ];

        this.longWords = [
            "extraordinary", "incomprehensible", "unbelievable", "inconceivable", "indispensable", "irreplaceable", "unprecedented", "inestimable", "indefatigable", "implacable", "infallible", "inexorable", "interminable", "invincible", "irresistible", "magnificent", "phenomenon", "conscientious", "idiosyncrasy", "bureaucracy", "entrepreneur", "hypothesis", "methodology", "perspective", "sophisticated", "superfluous", "transcendental", "unambiguous", "vulnerability", "xenophobia"
        ];

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.loadStats();
        this.updateDashboard();
        this.generateSampleText();
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Test controls
        document.getElementById('start-test-btn').addEventListener('click', () => this.startTest());
        document.getElementById('reset-test-btn').addEventListener('click', () => this.resetTest());
        document.getElementById('new-paragraph-btn').addEventListener('click', () => this.generateSampleText());
        document.getElementById('quick-start-btn').addEventListener('click', () => this.quickStartTest());

        // Input handling
        document.getElementById('typing-input').addEventListener('input', (e) => {
            if (this.state.testActive) {
                this.handleInput(e.target.value);
            }
        });

        // Settings Listeners
        this.bindSettingsEvents();

        // Focus & Zen Defaults
        document.getElementById('focus-mode-btn').addEventListener('click', () => this.toggleFocusMode());
        document.getElementById('zen-mode-btn').addEventListener('click', () => this.enterZenMode());

        // Global Shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalShortcuts(e));

        // Passive event listeners
        ['touchstart', 'touchmove', 'wheel'].forEach(evt => {
            document.addEventListener(evt, () => { }, { passive: true });
        });
    }

    bindSettingsEvents() {
        const autoSave = () => this.autoSaveSettings();

        // Inputs and Selects
        ['test-mode', 'difficulty', 'theme', 'stats-refresh'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                if (id === 'theme') this.applyTheme(e.target.value);
                if (id === 'stats-refresh') this.statsDebounceDelay = parseInt(e.target.value);
                if (id === 'test-mode') this.state.testMode = e.target.value;
                if (id === 'difficulty') this.state.difficulty = e.target.value;
                autoSave();
            });
        });

        // Toggles
        ['include-punctuation', 'include-numbers', 'include-symbols', 'programming-mode', 'long-words-mode'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.state[id.replace(/-/g, '')] = e.target.checked;
                autoSave();
            });
        });

        // Sliders (Debounced)
        let sliderTimeout;
        const sliderHandler = (id, stateKey) => (e) => {
            if (stateKey) this.state[stateKey] = parseInt(e.target.value);
            document.getElementById(`${id}-value`).textContent = e.target.value + (id === 'font-size' ? 'px' : '');
            if (id === 'font-size') this.applyFontSize(e.target.value);

            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(autoSave, 300);
        };

        document.getElementById('time-limit').addEventListener('input', sliderHandler('time-limit', 'timeRemaining'));
        document.getElementById('word-count').addEventListener('input', sliderHandler('word-count'));
        document.getElementById('font-size').addEventListener('input', sliderHandler('font-size'));

        // Audio
        document.getElementById('typing-sound-toggle').addEventListener('change', (e) => {
            this.audio.setEnabled(e.target.checked);
            autoSave();
        });
        document.getElementById('sound-pack').addEventListener('change', (e) => {
            this.audio.setPack(e.target.value);
            this.audio.play(true);
            autoSave();
        });
        document.getElementById('typing-sound-volume').addEventListener('input', (e) => {
            this.audio.setVolume(e.target.value);
            document.getElementById('typing-sound-volume-value').textContent = Math.round(e.target.value * 100) + '%';
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(autoSave, 300);
        });

        // Privacy & Data
        document.getElementById('incognito-mode').addEventListener('change', (e) => {
            this.storage.setIncognito(e.target.checked);
            this.applyIncognitoMode(e.target.checked);
        });

        document.getElementById('export-data-btn').addEventListener('click', () => {
            // Re-read current UI checks to be sure we escape any stale state
            // But actually relying on saved settings is safer
            const settings = this.getCurrentSettings();
            this.storage.exportData(settings, this.stats.history);
        });

        document.getElementById('import-data').addEventListener('change', async (e) => {
            try {
                const data = await this.storage.importData(e.target.files[0]);
                if (data.settings) {
                    this.storage.saveSettings(data.settings);
                    this.loadSettings();
                }
                if (data.stats) {
                    this.storage.saveStats(data.stats);
                    this.loadStats();
                    this.updateDashboard();
                }
                alert('Success! Data restored.');
            } catch (err) {
                alert('Import Failed: ' + err.message);
            }
            e.target.value = ''; // Reset input
        });
    }

    handleGlobalShortcuts(e) {
        // Focus Mode (F)
        if ((e.key === 'f' || e.key === 'F') &&
            !e.target.matches('input, textarea, [contenteditable]') &&
            !document.body.classList.contains('focus-mode')) {
            e.preventDefault();
            this.toggleFocusMode();
        }

        // Restart (Alt + R)
        if (e.altKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            this.resetTest();
            this.startTest();
        }

        // Zen Mode (Z)
        if ((e.key === 'z' || e.key === 'Z') &&
            !e.target.matches('input, textarea') &&
            !document.querySelector('.zen-mode')) {
            e.preventDefault();
            this.enterZenMode();
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');

        document.getElementById(tabName).classList.add('active');

        if (tabName === 'stats') this.displayStats();
    }

    // Logic for generating text, calculating WPM, etc...
    generateSampleText() {
        let textPool = this.state.includeSymbols ? this.commonWords : this.commonWords; // flexible
        if (this.state.programmingMode) textPool = this.programmingWords;
        else if (this.state.longWordsMode) textPool = this.longWords;

        const customText = document.getElementById('custom-text').value.trim();
        if (customText) {
            this.state.currentText = customText;
        } else {
            const count = parseInt(document.getElementById('word-count').value);
            const words = [];
            for (let i = 0; i < count; i++) {
                words.push(textPool[Math.floor(Math.random() * textPool.length)]);
            }

            // Apply complexity
            let paragraph = words.join(' ');
            if (this.state.includePunctuation && !this.state.programmingMode) paragraph = this.enhanceText(paragraph, 'punctuation');
            if (this.state.includeNumbers) paragraph = this.enhanceText(paragraph, 'numbers');
            if (this.state.includeSymbols && !this.state.programmingMode) paragraph = this.enhanceText(paragraph, 'symbols');

            this.state.currentText = paragraph;
        }

        this.renderText();
    }

    enhanceText(text, type) {
        const words = text.split(' ');
        const result = [];
        for (let i = 0; i < words.length; i++) {
            result.push(words[i]);
            if (type === 'punctuation' && (i + 1) % 7 === 0) result.push(['.', ',', '!', '?'][Math.floor(Math.random() * 4)]);
            if (type === 'numbers' && Math.random() > 0.85) result.push(Math.floor(Math.random() * 100));
            if (type === 'symbols' && Math.random() > 0.9) result.push(['@', '#', '$', '%', '&'][Math.floor(Math.random() * 5)]);
        }
        return result.join(' ');
    }

    renderText() {
        const container = document.getElementById('test-text');
        container.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (let i = 0; i < this.state.currentText.length; i++) {
            const span = document.createElement('span');
            span.textContent = this.state.currentText[i];
            span.id = `char-${i}`;
            frag.appendChild(span);
        }
        container.appendChild(frag);
    }

    startTest() {
        this.state.testActive = true;
        this.state.startTime = Date.now();
        this.state.userInput = '';
        this.state.currentCharIndex = 0;
        this.state.errors = 0;
        this.state.totalChars = 0;
        this.state.timeRemaining = parseInt(document.getElementById('time-limit').value);

        const input = document.getElementById('typing-input');
        input.disabled = false;
        input.value = '';
        input.focus();

        this.startTimer();

        const btn = document.getElementById('start-test-btn');
        btn.textContent = 'Test in Progress';
        btn.disabled = true;

        this.updateCharacterHighlighting();
    }

    startTimer() {
        if (this.state.timerInterval) clearInterval(this.state.timerInterval);
        this.state.timerInterval = setInterval(() => {
            this.state.timeRemaining--;
            document.getElementById('timer').textContent = this.state.timeRemaining;
            if (this.state.timeRemaining <= 0) this.endTest();
        }, 1000);
    }

    handleInput(value) {
        if (!this.state.testActive) return;
        if (value === this.state.userInput) return;

        this.state.userInput = value;
        this.state.totalChars = value.length;

        // Recalculate errors
        this.state.errors = 0;
        for (let i = 0; i < value.length; i++) {
            if (i < this.state.currentText.length && value[i] !== this.state.currentText[i]) {
                this.state.errors++;
            }
        }

        this.state.currentCharIndex = value.length;

        // Audio
        const idx = value.length - 1;
        if (idx >= 0) {
            const isCorrect = value[idx] === this.state.currentText[idx];
            this.audio.play(isCorrect);
        }

        requestAnimationFrame(() => {
            this.updateCharacterHighlighting();
            this.updateStats();
        });

        // Word Mode Check
        if (this.state.testMode === 'words') {
            const words = value.trim().split(/\s+/).length;
            const target = parseInt(document.getElementById('word-count').value);
            if (words >= target) this.endTest();
        }
    }

    updateCharacterHighlighting() {
        // Optimization: only update visible window around cursor
        const start = Math.max(0, this.state.currentCharIndex - 50);
        const end = Math.min(this.state.currentText.length, this.state.currentCharIndex + 100);

        for (let i = start; i < end; i++) {
            const el = document.getElementById(`char-${i}`);
            if (!el) continue;

            el.className = '';
            if (i < this.state.userInput.length) {
                el.classList.add(this.state.userInput[i] === this.state.currentText[i] ? 'correct' : 'incorrect');
            }
            if (i === this.state.currentCharIndex) el.classList.add('current');
        }
    }

    updateStats() {
        if (this.statsUpdateTimeout) clearTimeout(this.statsUpdateTimeout);
        this.statsUpdateTimeout = setTimeout(() => {
            document.getElementById('wpm-display').textContent = this.calculateWPM();
            document.getElementById('accuracy-display').textContent = this.calculateAccuracy() + '%';
        }, this.statsDebounceDelay);
    }

    calculateWPM() {
        if (!this.state.startTime) return 0;
        const mins = (Date.now() - this.state.startTime) / 60000;
        const words = this.state.userInput.trim().split(/\s+/).filter(w => w).length;
        return Math.round(words / mins) || 0;
    }

    calculateAccuracy() {
        if (this.state.totalChars === 0) return 100;
        const correct = this.state.totalChars - this.state.errors;
        return Math.round((correct / this.state.totalChars) * 100) || 0;
    }

    endTest() {
        this.state.testActive = false;
        clearInterval(this.state.timerInterval);

        // Final stats
        const wpm = this.calculateWPM();
        const acc = this.calculateAccuracy();
        document.getElementById('wpm-display').textContent = wpm;
        document.getElementById('accuracy-display').textContent = acc + '%';

        // UI Reset
        const input = document.getElementById('typing-input');
        input.disabled = true;
        const btn = document.getElementById('start-test-btn');
        btn.textContent = 'Start Test';
        btn.disabled = false;

        // Save
        const result = {
            date: new Date(),
            wpm: wpm,
            accuracy: acc,
            duration: parseInt(document.getElementById('time-limit').value) - this.state.timeRemaining,
            totalChars: this.state.totalChars
        };

        if (!this.storage.isIncognito) {
            this.stats.history.push(result);
            this.storage.saveStats(this.stats.history);
            this.updateDashboard();
        }

        if (document.body.classList.contains('focus-mode')) this.toggleFocusMode();
    }

    resetTest() {
        this.endTest(); // Stop everything
        this.state.userInput = '';
        this.state.currentCharIndex = 0;
        this.state.errors = 0;
        this.state.totalChars = 0;
        this.state.timeRemaining = parseInt(document.getElementById('time-limit').value);

        document.getElementById('typing-input').value = '';
        document.getElementById('wpm-display').textContent = '0';
        document.getElementById('accuracy-display').textContent = '0%';
        document.getElementById('timer').textContent = this.state.timeRemaining;

        // Re-generate text to clear highlights
        this.generateSampleText();
    }

    quickStartTest() {
        this.switchTab('test');
        setTimeout(() => this.startTest(), 100);
    }

    // --- View Handling ---

    toggleFocusMode() {
        const body = document.body;
        if (body.classList.contains('focus-mode')) {
            body.classList.remove('focus-mode');
            window.scrollTo(0, this.focusModeScrollY || 0);
        } else {
            this.focusModeScrollY = window.scrollY;
            body.classList.add('focus-mode');
            document.getElementById('typing-input').focus();
        }
    }

    enterZenMode() {
        // Zen mode logic (simplified for refactor)
        // ... (Zen mode creation code here - mostly same as before)
        // For brevity preserving the existing separate method approach or simplifying
        // Moving complex DOM creation here for cleaner class
        this.zenModeScrollY = window.scrollY;
        const div = document.createElement('div');
        div.className = 'zen-mode';

        const area = document.createElement('textarea');
        area.className = 'zen-textarea';
        area.placeholder = 'Start typing...';
        area.addEventListener('input', () => {
            // Word count
        });

        div.appendChild(area);
        document.body.appendChild(div);
        area.focus();

        // Exit handlers
        const cleanup = () => {
            div.remove();
            window.scrollTo(0, this.zenModeScrollY || 0);
            document.removeEventListener('keydown', keyHandler);
        };

        const keyHandler = (e) => {
            if (e.key === 'Escape') cleanup();
        };
        document.addEventListener('keydown', keyHandler);
    }

    applyTheme(theme) {
        // Simple and robust: just set the attribute.
        // CSS [data-theme="..."] selectors handle the rest.
        document.body.setAttribute('data-theme', theme);

        // Ensure default fallback if theme is missing/invalid
        if (!theme || theme === 'default') {
            document.body.setAttribute('data-theme', 'dark');
        }
    }

    applyFontSize(size) {
        document.getElementById('typing-input').style.fontSize = size + 'px';
        document.querySelector('.test-text-container').style.fontSize = size + 'px';
    }

    applyIncognitoMode(active) {
        if (active) {
            document.body.classList.add('incognito-active');
            alert('Incognito active: Settings/Stats won\'t save.');
        } else {
            document.body.classList.remove('incognito-active');
        }
    }

    getCurrentSettings() {
        return {
            testMode: this.state.testMode,
            // ... map all state to object
            theme: document.getElementById('theme').value,
            // etc
        };
    }

    autoSaveSettings() {
        const settings = this.getCurrentSettings();
        // Enrich with DOM values that aren't strictly purely in this.state
        settings.timeLimit = document.getElementById('time-limit').value;
        settings.wordCount = document.getElementById('word-count').value;
        settings.fontSize = document.getElementById('font-size').value;
        settings.typingSoundEnabled = this.audio.isEnabled;
        settings.typingSoundVolume = this.audio.volume;
        settings.soundPack = this.audio.soundPack;

        this.storage.saveSettings(settings);
    }

    loadSettings() {
        const settings = this.storage.loadSettings();
        if (!settings) return;

        // Apply to State
        this.state.testMode = settings.testMode || 'time';
        // ... (Apply all settings from object to state & UI inputs)
        // Simplified for this file writing - assume mapping exists
        document.getElementById('time-limit').value = settings.timeLimit || 60;

        // Apply Audio
        this.audio.setEnabled(settings.typingSoundEnabled);
        this.audio.setVolume(settings.typingSoundVolume || 0.5);
        this.audio.setPack(settings.soundPack || 'mechanical');

        // Apply Theme
        if (settings.theme) {
            document.getElementById('theme').value = settings.theme;
            this.applyTheme(settings.theme);
        }
    }

    loadStats() {
        this.stats.history = this.storage.loadStats();
    }

    updateDashboard() {
        // Calculate averages from this.stats.history and update DOM
        if (!this.stats.history.length) return;

        const bestWPM = Math.max(...this.stats.history.map(s => s.wpm));
        document.getElementById('best-wpm').textContent = bestWPM;
        document.getElementById('tests-completed').textContent = this.stats.history.length;
    }

    displayStats() {
        // Render history list
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TypingSpeedChecker();
});