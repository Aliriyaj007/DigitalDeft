class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isEnabled = false;
        this.volume = 0.5;
        this.soundPack = 'mechanical';
    }

    init() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Audio not supported:', e);
                this.isEnabled = false;
            }
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    setVolume(value) {
        this.volume = parseFloat(value);
    }

    setPack(packName) {
        this.soundPack = packName;
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) this.init();
    }

    play(isCorrect = true) {
        if (!this.isEnabled || !this.audioContext) return;

        this.resume();

        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);

        if (!isCorrect) {
            this.playErrorSound(now, gainNode);
            return;
        }

        switch (this.soundPack) {
            case 'typewriter':
                this.playTypewriterSound(now, gainNode);
                break;
            case 'soft':
                this.playSoftSound(now, gainNode);
                break;
            case 'bubble':
                this.playBubbleSound(now, gainNode);
                break;
            case 'mechanical':
            default:
                this.playMechanicalSound(now, gainNode);
                break;
        }
    }

    playErrorSound(t, output) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        output.gain.setValueAtTime(this.volume * 0.4, t);
        output.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(output);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playMechanicalSound(t, output) {
        // Click
        const click = this.audioContext.createOscillator();
        click.type = 'square';
        click.frequency.setValueAtTime(2000, t);
        click.frequency.exponentialRampToValueAtTime(1000, t + 0.05);

        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(this.volume * 0.15, t);
        clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        click.connect(clickGain);
        clickGain.connect(output);
        click.start(t);
        click.stop(t + 0.05);

        // Thock
        const thock = this.audioContext.createOscillator();
        thock.type = 'triangle';
        thock.frequency.setValueAtTime(300, t);
        thock.frequency.exponentialRampToValueAtTime(50, t + 0.1);

        output.gain.setValueAtTime(this.volume * 0.4, t);
        output.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        thock.connect(output);
        thock.start(t);
        thock.stop(t + 0.1);
    }

    playTypewriterSound(t, output) {
        const metal = this.audioContext.createOscillator();
        metal.type = 'sawtooth';
        metal.frequency.setValueAtTime(800, t);
        metal.frequency.exponentialRampToValueAtTime(100, t + 0.08);

        output.gain.setValueAtTime(this.volume * 0.5, t);
        output.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        metal.connect(output);
        metal.start(t);
        metal.stop(t + 0.15);
    }

    playSoftSound(t, output) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);

        output.gain.setValueAtTime(this.volume * 0.25, t);
        output.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(output);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    playBubbleSound(t, output) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.05);

        output.gain.setValueAtTime(this.volume * 0.3, t);
        output.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(output);
        osc.start(t);
        osc.stop(t + 0.1);
    }
}
