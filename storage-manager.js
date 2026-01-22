class StorageManager {
    constructor() {
        this.SETTINGS_KEY = 'typingSettings';
        this.STATS_KEY = 'typingStats';
        this.isIncognito = false;
    }

    setIncognito(enabled) {
        this.isIncognito = enabled;
        if (enabled) {
            console.log('Incognito mode enabled. Saving disabled.');
        }
    }

    saveSettings(settings) {
        if (this.isIncognito) return;
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    }

    loadSettings() {
        const data = localStorage.getItem(this.SETTINGS_KEY);
        return data ? JSON.parse(data) : null;
    }

    saveStats(history) {
        if (this.isIncognito) return;
        localStorage.setItem(this.STATS_KEY, JSON.stringify(history));
    }

    loadStats() {
        const data = localStorage.getItem(this.STATS_KEY);
        return data ? JSON.parse(data) : [];
    }

    exportData(settings, stats) {
        const exportData = {
            settings: settings,
            stats: stats,
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

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!importedData.settings && !importedData.stats) {
                        reject(new Error('Invalid backup file format'));
                    }
                    resolve(importedData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
}
