class TypingSpeedChecker {
    constructor() {
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

        // Audio state
        this.audioContext = null;
        this.isAudioEnabled = false;
        this.audioVolume = 0.5;
        
        // Privacy state
        this.isIncognitoMode = false;
        
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
            "function", "var", "let", "const", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "return", "try", "catch", "finally", "throw", "new", "this", "class", "extends", "super", "static", "import", "export", "default", "async", "await", "promise", "array", "object", "string", "number", "boolean", "null", "undefined", "true", "false", "console", "log", "warn", "error", "debug", "info", "time", "timeEnd", "group", "groupEnd", "table", "trace", "clear", "dir", "dirxml", "count", "assert", "profile", "profileEnd", "timeStamp", "context", "memory", "cpu", "performance", "window", "document", "navigator", "location", "history", "localStorage", "sessionStorage", "cookie", "fetch", "XMLHttpRequest", "response", "request", "headers", "body", "method", "url", "status", "ok", "json", "text", "blob", "arrayBuffer", "formData", "event", "target", "currentTarget", "preventDefault", "stopPropagation", "addEventListener", "removeEventListener", "dispatchEvent", "click", "keydown", "keyup", "keypress", "input", "change", "focus", "blur", "submit", "load", "error", "resize", "scroll", "mouse", "touch", "pointer", "wheel", "animation", "transition", "transform", "translate", "rotate", "scale", "skew", "opacity", "visibility", "display", "position", "top", "right", "bottom", "left", "width", "height", "margin", "padding", "border", "background", "color", "font", "text", "align", "justify", "flex", "grid", "box", "shadow", "radius", "overflow", "clip", "mask", "filter", "backdrop", "keyframes", "timing", "duration", "delay", "iteration", "direction", "fill", "mode", "play", "state", "running", "paused", "reversed", "normal", "reverse", "alternate", "ease", "linear", "cubic", "bezier", "steps", "jump", "inherit", "initial", "unset", "revert"
        ];

        this.longWords = [
            "extraordinary", "incomprehensible", "unbelievable", "inconceivable", "indispensable", "irreplaceable", "unprecedented", "inestimable", "indefatigable", "implacable", "infallible", "inexorable", "interminable", "invincible", "irresistible", "magnificent", "phenomenon", "conscientious", "idiosyncrasy", "bureaucracy", "entrepreneur", "hypothesis", "methodology", "perspective", "sophisticated", "superfluous", "transcendental", "unambiguous", "vulnerability", "xenophobia"
        ];

        this.programmingSamples = [
            "function calculateWPM(words, time) { return Math.round((words / time) * 60); }",
            "const userStats = { wpm: 0, accuracy: 0, errors: 0 };",
            "if (testActive) { updateUI(); calculateStats(); }",
            "for (let i = 0; i < text.length; i++) { processCharacter(text[i]); }",
            "const timer = setInterval(() => { updateTime(); }, 1000);",
            "const promise = new Promise((resolve, reject) => { if (condition) resolve('success'); else reject('error'); });",
            "class TypingTest { constructor() { this.state = { active: false }; } start() { this.state.active = true; } }",
            "const array = [1, 2, 3, 4, 5]; const doubled = array.map(num => num * 2);",
            "try { performOperation(); } catch (error) { console.error('Error occurred:', error); }",
            "const arrowFunction = (param) => { return param * 2; };",
            "const destructuring = { name: 'John', age: 30 }; const { name, age } = destructuring;",
            "const templateString = `Hello, ${name}! You are ${age} years old.`;",
            "const asyncFunction = async () => { const response = await fetch('/api/data'); const data = await response.json(); return data; };",
            "const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/;",
            "const conditional = condition ? 'trueValue' : 'falseValue';"
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

        // Slider controls
        document.getElementById('time-limit').addEventListener('input', (e) => {
            this.state.timeRemaining = parseInt(e.target.value);
            document.getElementById('time-limit-value').textContent = e.target.value;
        });

        document.getElementById('word-count').addEventListener('input', (e) => {
            document.getElementById('word-count-value').textContent = e.target.value;
        });

        document.getElementById('font-size').addEventListener('input', (e) => {
            const fontSize = e.target.value;
            document.getElementById('typing-input').style.fontSize = fontSize + 'px';
            document.querySelector('.test-text-container').style.fontSize = fontSize + 'px';
            document.getElementById('font-size-value').textContent = fontSize + 'px';
        });

        // Settings form elements
        document.getElementById('test-mode').addEventListener('change', (e) => {
            this.state.testMode = e.target.value;
            this.autoSaveSettings();
        });

        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.state.difficulty = e.target.value;
            this.autoSaveSettings();
        });

        // Toggles (checkboxes)
        const toggleSettings = [
            'include-punctuation',
            'include-numbers',
            'include-symbols',
            'programming-mode',
            'long-words-mode'
        ];
        
        toggleSettings.forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.state[id.replace(/-/g, '')] = e.target.checked;
                this.autoSaveSettings();
            });
        });

        // Sliders (with debouncing for performance)
        let sliderTimeout;
        const debouncedSliderSave = () => {
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(() => this.autoSaveSettings(), 300);
        };

        document.getElementById('time-limit').addEventListener('input', (e) => {
            this.state.timeRemaining = parseInt(e.target.value);
            document.getElementById('time-limit-value').textContent = e.target.value;
            debouncedSliderSave();
        });

        document.getElementById('word-count').addEventListener('input', (e) => {
            document.getElementById('word-count-value').textContent = e.target.value;
            debouncedSliderSave();
        });

        document.getElementById('font-size').addEventListener('input', (e) => {
            const fontSize = e.target.value;
            document.getElementById('typing-input').style.fontSize = fontSize + 'px';
            document.querySelector('.test-text-container').style.fontSize = fontSize + 'px';
            document.getElementById('font-size-value').textContent = fontSize + 'px';
            debouncedSliderSave();
        });

        // Theme
        document.getElementById('theme').addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
            this.autoSaveSettings();
        });

        // Stats refresh rate
        document.getElementById('stats-refresh').addEventListener('change', (e) => {
            this.statsDebounceDelay = parseInt(e.target.value);
            this.autoSaveSettings();
        });

        // Custom text (debounced)
        let customTextTimeout;
        document.getElementById('custom-text').addEventListener('input', (e) => {
            clearTimeout(customTextTimeout);
            customTextTimeout = setTimeout(() => this.autoSaveSettings(), 1000);
        });

        // Audio settings
        document.getElementById('typing-sound-toggle').addEventListener('change', (e) => {
            this.isAudioEnabled = e.target.checked;
            if (this.isAudioEnabled) {
                this.initAudio();
            }
            this.autoSaveSettings();
        });

        document.getElementById('typing-sound-volume').addEventListener('input', (e) => {
            this.audioVolume = parseFloat(e.target.value);
            document.getElementById('typing-sound-volume-value').textContent = 
                Math.round(this.audioVolume * 100) + '%';
            this.autoSaveSettings();
        });

        // Incognito Mode
        document.getElementById('incognito-mode').addEventListener('change', (e) => {
            this.isIncognitoMode = e.target.checked;
            
            // Show confirmation for first-time users
            if (this.isIncognitoMode) {
                alert('Incognito Mode enabled!\n\n• Test results won\'t be saved\n• Settings won\'t persist\n• All data will be lost when you leave');
            }
            
            // Toggle visual indicator
            document.body.classList.toggle('incognito-active', this.isIncognitoMode);
            
            // Don't save this setting (it's session-only)
        });

        // Backup & Restore
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('import-data').addEventListener('change', (e) => this.importData(e));

        // Focus Mode
        document.getElementById('focus-mode-btn').addEventListener('click', () => {
            this.toggleFocusMode();
        });

        // Global F key shortcut (only outside focus mode)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'f' || e.key === 'F') && 
                !e.target.matches('input, textarea, [contenteditable]') &&
                !document.body.classList.contains('focus-mode')) {
                e.preventDefault();
                this.toggleFocusMode();
            }
        });

        // Zen Mode
        document.getElementById('zen-mode-btn').addEventListener('click', () => {
            this.enterZenMode();
        });

        // Global Z key shortcut (only outside Zen mode)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'z' || e.key === 'Z') && 
                !e.target.matches('input, textarea, [contenteditable]') &&
                !document.querySelector('.zen-mode')) {
                e.preventDefault();
                this.enterZenMode();
            }
        });

        // === PERFORMANCE: Passive event listeners ===
        const passiveEvents = ['touchstart', 'touchmove', 'wheel'];
        passiveEvents.forEach(eventType => {
            document.addEventListener(eventType, this.handlePassiveEvent.bind(this), { passive: true });
        });
    }

    handlePassiveEvent() {
        // Do nothing - this is just to register passive listeners
    }

    switchTab(tabName) {
        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Add active class to clicked tab
        event.target.classList.add('active');

        // Show corresponding pane
        document.getElementById(tabName).classList.add('active');

        // Update stats if switching to stats tab
        if (tabName === 'stats') {
            this.displayStats();
        }
    }

    generateSampleText() {
        let textPool = [];
        
        if (this.state.programmingMode) {
            textPool = [...this.programmingWords];
        } else if (this.state.longWordsMode) {
            textPool = [...this.longWords];
        } else {
            textPool = [...this.commonWords];
        }

        // Get custom text if available
        const customText = document.getElementById('custom-text').value.trim();
        if (customText) {
            this.state.currentText = customText;
        } else {
            // Generate random paragraph
            const wordCount = parseInt(document.getElementById('word-count').value);
            const words = [];
            
            for (let i = 0; i < wordCount; i++) {
                const randomIndex = Math.floor(Math.random() * textPool.length);
                words.push(textPool[randomIndex]);
            }
            
            // Add punctuation and symbols based on settings
            let paragraph = words.join(' ');
            
            if (this.state.includePunctuation) {
                paragraph = this.addPunctuation(paragraph);
            }
            
            if (this.state.includeNumbers) {
                paragraph = this.addNumbers(paragraph);
            }
            
            if (this.state.includeSymbols) {
                paragraph = this.addSymbols(paragraph);
            }
            
            this.state.currentText = paragraph;
        }
        
        // Update the test text display
        const testTextContainer = document.getElementById('test-text');
        testTextContainer.innerHTML = '';
        
        for (let i = 0; i < this.state.currentText.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.textContent = this.state.currentText[i];
            charSpan.id = `char-${i}`;
            testTextContainer.appendChild(charSpan);
        }
    }

    addPunctuation(text) {
        // Add periods after every 5-10 words
        const words = text.split(' ');
        const result = [];
        
        for (let i = 0; i < words.length; i++) {
            result.push(words[i]);
            
            // Add punctuation randomly
            if ((i + 1) % Math.floor(Math.random() * 5 + 5) === 0) {
                const punctuation = ['.', '!', '?', ','][Math.floor(Math.random() * 4)];
                result.push(punctuation);
            }
        }
        
        return result.join(' ');
    }

    addNumbers(text) {
        // Add numbers randomly in the text
        const words = text.split(' ');
        const result = [];
        
        for (let i = 0; i < words.length; i++) {
            result.push(words[i]);
            
            // Add a number randomly
            if (Math.random() > 0.8) {
                const number = Math.floor(Math.random() * 100).toString();
                result.push(number);
            }
        }
        
        return result.join(' ');
    }

    addSymbols(text) {
        // Add symbols randomly in the text
        const words = text.split(' ');
        const result = [];
        const symbols = ['@', '#', '$', '%', '&', '*', '+', '=', '-', '_', '|', '\\', '/', ':', ';', '"', "'", '<', '>', '[', ']', '{', '}', '~', '`'];
        
        for (let i = 0; i < words.length; i++) {
            result.push(words[i]);
            
            // Add a symbol randomly
            if (Math.random() > 0.9) {
                const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                result.push(symbol);
            }
        }
        
        return result.join(' ');
    }

    startTest() {
        this.state.testActive = true;
        this.state.startTime = Date.now();
        this.state.userInput = '';
        this.state.currentCharIndex = 0;
        this.state.errors = 0;
        this.state.totalChars = 0;
        this.state.timeRemaining = parseInt(document.getElementById('time-limit').value);

        // Enable typing input
        document.getElementById('typing-input').disabled = false;
        document.getElementById('typing-input').value = '';
        document.getElementById('typing-input').focus();

        // Start timer
        this.startTimer();

        // Update UI
        document.getElementById('start-test-btn').textContent = 'Test in Progress';
        document.getElementById('start-test-btn').disabled = true;
        this.updateCharacterHighlighting();
    }

    startTimer() {
        this.state.timerInterval = setInterval(() => {
            this.state.timeRemaining--;
            document.getElementById('timer').textContent = this.state.timeRemaining;

            if (this.state.timeRemaining <= 0) {
                this.endTest();
            }
        }, 1000);
    }

    handleInput(value) {
        if (!this.state.testActive) return;

        // Early exit if no change
        if (value === this.state.userInput) return;
        
        this.state.userInput = value;
        this.state.totalChars = value.length;

        // Recalculate errors from scratch
        this.state.errors = 0;
        for (let i = 0; i < value.length; i++) {
            if (i < this.state.currentText.length && value[i] !== this.state.currentText[i]) {
                this.state.errors++;
            }
        }

        // Update current character index
        this.state.currentCharIndex = value.length;

        // Play sound based on correctness
        if (this.isAudioEnabled) {
            const currentIndex = value.length - 1;
            if (currentIndex >= 0) {
                const isCorrect = value[currentIndex] === this.state.currentText[currentIndex];
                this.playSound(isCorrect);
            }
        }

        // Batch DOM updates
        requestAnimationFrame(() => {
            this.updateCharacterHighlighting();
            this.updateStats();
        });

        // End test if word count is reached (in word mode)
        if (this.state.testMode === 'words') {
            const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
            const targetWordCount = parseInt(document.getElementById('word-count').value);
            if (wordCount >= targetWordCount) {
                this.endTest();
            }
        }
    }

    updateCharacterHighlighting() {
        // Early exit if no changes needed
        if (!this.state.testActive && this.state.currentCharIndex === 0) return;

        // Use DocumentFragment for batch updates
        const testTextContainer = document.getElementById('test-text');
        const fragment = document.createDocumentFragment();
        
        // Only update visible portion (first 100 chars + current area)
        const visibleStart = Math.max(0, this.state.currentCharIndex - 50);
        const visibleEnd = Math.min(this.state.currentText.length, this.state.currentCharIndex + 100);
        
        for (let i = visibleStart; i < visibleEnd; i++) {
            let charElement = document.getElementById(`char-${i}`);
            if (!charElement) {
                charElement = document.createElement('span');
                charElement.id = `char-${i}`;
                charElement.textContent = this.state.currentText[i];
            }

            // Reset classes
            charElement.className = '';

            // Apply states
            if (i < this.state.userInput.length) {
                charElement.classList.add(
                    this.state.userInput[i] === this.state.currentText[i] 
                        ? 'correct' 
                        : 'incorrect'
                );
            }
            if (i === this.state.currentCharIndex) {
                charElement.classList.add('current');
            }

            fragment.appendChild(charElement);
        }

        // Replace only the visible portion
        testTextContainer.innerHTML = '';
        testTextContainer.appendChild(fragment);
    }

    // Debounced stats updater
    updateStats() {
        // Clear pending update if typing is still active
        if (this.statsUpdateTimeout) {
            clearTimeout(this.statsUpdateTimeout);
        }

        // Schedule a new update
        this.statsUpdateTimeout = setTimeout(() => {
            const wpm = this.calculateWPM();
            const accuracy = this.calculateAccuracy();

            document.getElementById('wpm-display').textContent = wpm;
            document.getElementById('accuracy-display').textContent = `${accuracy}%`;
            
            // Clean up timeout reference
            this.statsUpdateTimeout = null;
        }, this.statsDebounceDelay);
    }

    calculateWPM() {
        if (!this.state.startTime) return 0;

        const timeElapsed = (Date.now() - this.state.startTime) / 60000; // in minutes
        const wordsTyped = this.state.userInput.trim().split(/\s+/).filter(word => word.length > 0).length;

        return Math.round(wordsTyped / timeElapsed) || 0;
    }

    calculateAccuracy() {
        if (this.state.totalChars === 0) return 100;

        const correctChars = this.state.totalChars - this.state.errors;
        return Math.round((correctChars / this.state.totalChars) * 100) || 0;
    }

    endTest() {
        this.state.testActive = false;
        this.state.endTime = Date.now();

        clearInterval(this.state.timerInterval);

        // Clear any pending stats update
        if (this.statsUpdateTimeout) {
            clearTimeout(this.statsUpdateTimeout);
            this.statsUpdateTimeout = null;
            
            // Force final stats update
            const wpm = this.calculateWPM();
            const accuracy = this.calculateAccuracy();
            document.getElementById('wpm-display').textContent = wpm;
            document.getElementById('accuracy-display').textContent = `${accuracy}%`;
        }

        // Disable typing input
        document.getElementById('typing-input').disabled = true;
        document.getElementById('start-test-btn').textContent = 'Start Test';
        document.getElementById('start-test-btn').disabled = false;

        // Save results (unless in incognito mode)
        this.saveTestResult();

        // Update dashboard
        this.updateDashboard();
        
        // Exit focus mode if active
        if (document.body.classList.contains('focus-mode')) {
            this.toggleFocusMode();
        }
    }

    resetTest() {
        this.state.testActive = false;
        clearInterval(this.state.timerInterval);

        // Reset state
        this.state.userInput = '';
        this.state.currentCharIndex = 0;
        this.state.errors = 0;
        this.state.totalChars = 0;
        this.state.timeRemaining = parseInt(document.getElementById('time-limit').value);

        // Reset UI
        document.getElementById('typing-input').value = '';
        document.getElementById('typing-input').disabled = true;
        document.getElementById('wpm-display').textContent = '0';
        document.getElementById('accuracy-display').textContent = '0%';
        document.getElementById('timer').textContent = this.state.timeRemaining;

        // Reset character highlighting
        this.updateCharacterHighlighting();

        // Reset button state
        document.getElementById('start-test-btn').textContent = 'Start Test';
        document.getElementById('start-test-btn').disabled = false;

        // Generate new sample text
        this.generateSampleText();
        
        // Exit focus mode if active
        if (document.body.classList.contains('focus-mode')) {
            this.toggleFocusMode();
        }
    }

    quickStartTest() {
        this.switchTab('test');
        setTimeout(() => {
            this.startTest();
        }, 100);
    }

    saveTestResult() {
        // Don't save anything in incognito mode
        if (this.isIncognitoMode) {
            console.log('Incognito mode: Test result not saved');
            return;
        }
        
        const testResult = {
            date: new Date(),
            wpm: this.calculateWPM(),
            accuracy: this.calculateAccuracy(),
            duration: this.state.timeRemaining,
            errors: this.state.errors,
            totalChars: this.state.totalChars
        };

        this.stats.history.push(testResult);
        localStorage.setItem('typingStats', JSON.stringify(this.stats.history));
        this.updateDashboard();
    }

    autoSaveSettings() {
        // Don't save settings in incognito mode
        if (this.isIncognitoMode) {
            console.log('Incognito mode: Settings not saved');
            return;
        }
        
        const settings = {
            testMode: this.state.testMode,
            difficulty: this.state.difficulty,
            includePunctuation: this.state.includePunctuation,
            includeNumbers: this.state.includeNumbers,
            includeSymbols: this.state.includeSymbols,
            programmingMode: this.state.programmingMode,
            longWordsMode: this.state.longWordsMode,
            timeLimit: document.getElementById('time-limit').value,
            wordCount: document.getElementById('word-count').value,
            fontSize: document.getElementById('font-size').value,
            theme: document.getElementById('theme').value,
            statsRefresh: this.statsDebounceDelay,
            typingSoundEnabled: this.isAudioEnabled,
            typingSoundVolume: this.audioVolume,
            customText: document.getElementById('custom-text').value
        };

        localStorage.setItem('typingSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('typingSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Apply settings to UI
            document.getElementById('test-mode').value = settings.testMode || 'time';
            document.getElementById('difficulty').value = settings.difficulty || 'intermediate';
            document.getElementById('include-punctuation').checked = settings.includePunctuation !== undefined ? settings.includePunctuation : true;
            document.getElementById('include-numbers').checked = settings.includeNumbers !== undefined ? settings.includeNumbers : true;
            document.getElementById('include-symbols').checked = settings.includeSymbols !== undefined ? settings.includeSymbols : false;
            document.getElementById('programming-mode').checked = settings.programmingMode !== undefined ? settings.programmingMode : false;
            document.getElementById('long-words-mode').checked = settings.longWordsMode !== undefined ? settings.longWordsMode : false;
            document.getElementById('time-limit').value = settings.timeLimit || 60;
            document.getElementById('word-count').value = settings.wordCount || 100;
            document.getElementById('font-size').value = settings.fontSize || 18;
            document.getElementById('theme').value = settings.theme || 'dark';
            document.getElementById('custom-text').value = settings.customText || '';
            
            // Stats refresh rate
            const refreshRate = settings.statsRefresh || 150;
            document.getElementById('stats-refresh').value = refreshRate;
            this.statsDebounceDelay = refreshRate;
            
            // Audio settings
            this.isAudioEnabled = settings.typingSoundEnabled || false;
            this.audioVolume = settings.typingSoundVolume || 0.5;
            document.getElementById('typing-sound-toggle').checked = this.isAudioEnabled;
            document.getElementById('typing-sound-volume').value = this.audioVolume;
            document.getElementById('typing-sound-volume-value').textContent = 
                Math.round(this.audioVolume * 100) + '%';
            
            // IMPORTANT: Never restore incognito mode from storage
            this.isIncognitoMode = false;
            document.getElementById('incognito-mode').checked = false;
            document.body.classList.remove('incognito-active');

            // Update slider values
            document.getElementById('time-limit-value').textContent = settings.timeLimit || 60;
            document.getElementById('word-count-value').textContent = settings.wordCount || 100;
            document.getElementById('font-size-value').textContent = (settings.fontSize || 18) + 'px';

            // Apply font size
            document.getElementById('typing-input').style.fontSize = (settings.fontSize || 18) + 'px';
            document.querySelector('.test-text-container').style.fontSize = (settings.fontSize || 18) + 'px';

            // Apply theme
            this.applyTheme(settings.theme || 'dark');

            // Update state
            this.state.testMode = settings.testMode || 'time';
            this.state.difficulty = settings.difficulty || 'intermediate';
            this.state.includePunctuation = settings.includePunctuation !== undefined ? settings.includePunctuation : true;
            this.state.includeNumbers = settings.includeNumbers !== undefined ? settings.includeNumbers : true;
            this.state.includeSymbols = settings.includeSymbols !== undefined ? settings.includeSymbols : false;
            this.state.programmingMode = settings.programmingMode !== undefined ? settings.programmingMode : false;
            this.state.longWordsMode = settings.longWordsMode !== undefined ? settings.longWordsMode : false;
        } else {
            // Default state
            this.isIncognitoMode = false;
            document.getElementById('incognito-mode').checked = false;
        }
    }

    loadStats() {
        const savedStats = localStorage.getItem('typingStats');
        if (savedStats) {
            this.stats.history = JSON.parse(savedStats);
        }
    }

    updateDashboard() {
        if (this.stats.history.length === 0) return;

        // Calculate overall stats
        const totalTests = this.stats.history.length;
        const totalWPM = this.stats.history.reduce((sum, test) => sum + test.wpm, 0);
        const avgWPM = Math.round(totalWPM / totalTests);
        
        const totalAccuracy = this.stats.history.reduce((sum, test) => sum + test.accuracy, 0);
        const avgAccuracy = Math.round(totalAccuracy / totalTests);

        const bestWPM = Math.max(...this.stats.history.map(test => test.wpm));
        const bestAccuracy = Math.max(...this.stats.history.map(test => test.accuracy));

        // Update dashboard elements
        document.getElementById('best-wpm').textContent = bestWPM;
        document.getElementById('best-accuracy').textContent = `${bestAccuracy}%`;
        document.getElementById('tests-completed').textContent = totalTests;
        document.getElementById('overall-wpm').textContent = avgWPM;
        document.getElementById('overall-accuracy').textContent = `${avgAccuracy}%`;
        document.getElementById('best-performance').textContent = bestWPM;

        // Update progress bars (simplified)
        const maxWPM = Math.max(100, bestWPM); // Cap at 100 for progress bar
        const wpmPercentage = Math.min(100, (avgWPM / maxWPM) * 100);
        document.getElementById('wpm-progress').style.width = `${wpmPercentage}%`;

        const accuracyPercentage = avgAccuracy;
        document.getElementById('accuracy-progress').style.width = `${accuracyPercentage}%`;
    }

    displayStats() {
        if (this.stats.history.length === 0) {
            document.getElementById('history-list').innerHTML = '<p>No test history available.</p>';
            return;
        }

        // Sort history by date (newest first)
        const sortedHistory = [...this.stats.history].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const historyHTML = sortedHistory.map(test => `
            <div class="history-item">
                <div>
                    <div class="wpm">${test.wpm} WPM</div>
                    <div class="date">${new Date(test.date).toLocaleDateString()}</div>
                </div>
                <div class="accuracy">${test.accuracy}% Accuracy</div>
            </div>
        `).join('');

        document.getElementById('history-list').innerHTML = historyHTML;
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.style.setProperty('--primary-black', '#FFFFFF');
            document.documentElement.style.setProperty('--primary-white', '#000000');
            document.documentElement.style.setProperty('--gray-dark', '#F5F5F5');
            document.documentElement.style.setProperty('--gray-medium', '#E0E0E0');
            document.documentElement.style.setProperty('--gray-light', '#CCCCCC');
            document.documentElement.style.setProperty('--text-light', '#000000');
            document.documentElement.style.setProperty('--text-dark', '#FFFFFF');
            document.documentElement.style.setProperty('--text-gray', '#666666');
        } else {
            // Dark theme (default)
            document.documentElement.style.setProperty('--primary-black', '#000000');
            document.documentElement.style.setProperty('--primary-white', '#FFFFFF');
            document.documentElement.style.setProperty('--gray-dark', '#1a1a1a');
            document.documentElement.style.setProperty('--gray-medium', '#2d2d2d');
            document.documentElement.style.setProperty('--gray-light', '#404040');
            document.documentElement.style.setProperty('--text-light', '#FFFFFF');
            document.documentElement.style.setProperty('--text-dark', '#000000');
            document.documentElement.style.setProperty('--text-gray', '#CCCCCC');
        }
    }

    // Export all user data (settings + stats) as JSON file
    exportData() {
        const exportData = {
            settings: JSON.parse(localStorage.getItem('typingSettings') || '{}'),
            stats: JSON.parse(localStorage.getItem('typingStats') || '[]'),
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `digitaldeft-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Import data from a JSON file
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Validate structure
                if (!importedData.settings && !importedData.stats) {
                    throw new Error('Invalid backup file format');
                }

                // Restore settings
                if (importedData.settings) {
                    localStorage.setItem('typingSettings', JSON.stringify(importedData.settings));
                    this.loadSettings(); // Re-apply to UI and state
                }

                // Restore stats
                if (importedData.stats) {
                    localStorage.setItem('typingStats', JSON.stringify(importedData.stats));
                    this.loadStats();
                    this.updateDashboard();
                    if (document.getElementById('stats').classList.contains('active')) {
                        this.displayStats();
                    }
                }

                alert('Data imported successfully! Settings and stats have been restored.');
                // Reset file input
                event.target.value = '';
            } catch (error) {
                console.error('Import failed:', error);
                alert('Failed to import data. Please ensure you selected a valid backup file.');
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }

    // Initialize audio system (user gesture required)
    initAudio() {
        if (this.audioContext) return;
        
        try {
            // Create audio context (must be triggered by user interaction)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported:', e);
            this.isAudioEnabled = false;
        }
    }

    // Play sound with current volume
    playSound(isCorrect = true) {
        if (!this.isAudioEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Correct: higher pitch (800Hz), short duration
        // Error: lower pitch (400Hz), slightly longer
        const frequency = isCorrect ? 800 : 400;
        const duration = isCorrect ? 0.05 : 0.08;
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = this.audioVolume * 0.3; // Reduce volume
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Toggle focus mode
    toggleFocusMode() {
        const isEntering = !document.body.classList.contains('focus-mode');
        
        if (isEntering) {
            // Save current scroll position
            this.focusModeScrollY = window.scrollY;
            
            // Apply focus mode
            document.body.classList.add('focus-mode');
            document.getElementById('typing-input').focus();
            
            // Bind exit keys
            this.bindFocusModeKeys();
        } else {
            // Exit focus mode
            document.body.classList.remove('focus-mode');
            window.scrollTo(0, this.focusModeScrollY || 0);
            this.unbindFocusModeKeys();
        }
    }

    // Bind keyboard shortcuts for focus mode
    bindFocusModeKeys() {
        this.focusModeKeyHandler = (e) => {
            if (e.key === 'Escape' || e.key === 'f' || e.key === 'F') {
                this.toggleFocusMode();
            }
        };
        document.addEventListener('keydown', this.focusModeKeyHandler);
    }

    // Unbind keyboard shortcuts
    unbindFocusModeKeys() {
        if (this.focusModeKeyHandler) {
            document.removeEventListener('keydown', this.focusModeKeyHandler);
            this.focusModeKeyHandler = null;
        }
    }

    // Enter Zen Mode
    enterZenMode() {
        // Save current scroll position
        this.zenModeScrollY = window.scrollY;
        
        // Create Zen mode elements
        this.zenContainer = document.createElement('div');
        this.zenContainer.className = 'zen-mode';
        
        this.zenTextarea = document.createElement('textarea');
        this.zenTextarea.className = 'zen-textarea';
        this.zenTextarea.placeholder = 'Start typing...';
        this.zenTextarea.setAttribute('spellcheck', 'false');
        this.zenTextarea.setAttribute('autocapitalize', 'off');
        this.zenTextarea.setAttribute('autocomplete', 'off');
        
        this.zenContainer.appendChild(this.zenTextarea);
        document.body.appendChild(this.zenContainer);
        
        // Add word counter
        this.zenWordCounter = document.createElement('div');
        this.zenWordCounter.style.cssText = `
            position: absolute;
            top: 1.5rem;
            right: 2rem;
            color: var(--text-gray);
            font-size: 0.9rem;
            pointer-events: none;
        `;
        this.zenContainer.appendChild(this.zenWordCounter);
        
        // Word count update
        this.zenTextarea.addEventListener('input', () => {
            const text = this.zenTextarea.value;
            const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
            const charCount = text.length;
            this.zenWordCounter.textContent = `${wordCount} words • ${charCount} chars`;
        });
        
        // Focus textarea
        this.zenTextarea.focus();
        
        // Bind exit keys
        this.bindZenModeKeys();
        
        // Optional: Hide cursor (toggle with 'C' key)
        this.zenHideCursor = false;
    }

    // Exit Zen Mode
    exitZenMode() {
        if (this.zenContainer) {
            document.body.removeChild(this.zenContainer);
            window.scrollTo(0, this.zenModeScrollY || 0);
            this.unbindZenModeKeys();
            this.zenContainer = null;
            this.zenTextarea = null;
        }
    }

    // Bind keyboard shortcuts
    bindZenModeKeys() {
        this.zenKeyHandler = (e) => {
            // Exit on ESC
            if (e.key === 'Escape') {
                this.exitZenMode();
                return;
            }
            
            // Toggle cursor visibility (C key)
            if (e.key === 'c' || e.key === 'C') {
                this.zenHideCursor = !this.zenHideCursor;
                this.zenTextarea.style.caretColor = this.zenHideCursor ? 'transparent' : 'var(--accent-yellow)';
                e.preventDefault();
            }
            
            // Prevent tab navigation (keep focus in textarea)
            if (e.key === 'Tab') {
                e.preventDefault();
                // Insert tab character
                const start = this.zenTextarea.selectionStart;
                const end = this.zenTextarea.selectionEnd;
                const value = this.zenTextarea.value;
                this.zenTextarea.value = value.substring(0, start) + '  ' + value.substring(end);
                this.zenTextarea.selectionStart = this.zenTextarea.selectionEnd = start + 2;
            }
        };
        
        document.addEventListener('keydown', this.zenKeyHandler);
    }

    // Unbind keyboard shortcuts
    unbindZenModeKeys() {
        if (this.zenKeyHandler) {
            document.removeEventListener('keydown', this.zenKeyHandler);
            this.zenKeyHandler = null;
        }
    }
}

// Initialize the DigitalDeft application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TypingSpeedChecker();
});

// Handle page visibility change to pause/resume test
document.addEventListener('visibilitychange', () => {
    // Implementation can be added if needed
});

// Handle beforeunload to warn about unsaved progress
window.addEventListener('beforeunload', (e) => {
    // Note: We don't have a global 'app' variable, so this is disabled
    // To enable, store instance: window.typingApp = new TypingSpeedChecker();
});