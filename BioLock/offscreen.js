import { StorageManager } from './storage.js';
import { FeatureExtractor } from './featureExtractor.js';
import { BioModel } from './model.js';
import { SecurityPolicy } from './policy.js';

console.log('BioLock Offscreen Engine Active');

const storage = new StorageManager();
const extractor = new FeatureExtractor();
const model = new BioModel();
const policy = new SecurityPolicy();
const TEMP_BUFFER_LIMIT = 50;

let state = {
    enrollment: false,
    monitoring: false
};
let tempMonitoringBuffer = [];
let isInitialized = false;
let initPromise = (async () => {
    try {
        await storage.init();
        const savedProfiles = await storage.getAllProfiles();
        if (savedProfiles && savedProfiles.length > 0) {
            savedProfiles.forEach(p => model.loadProfile(p));
            console.log(`Loaded ${savedProfiles.length} existing profiles`);
        }
        return new Promise((resolve) => {
            console.log('Offscreen: Requesting GET_STATUS...');
            chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
                console.log('Offscreen: Received GET_STATUS response:', response);
                if (response) {
                    state.enrollment = response.isEnrollmentActive;
                    const profiles = model.getProfiles();
                    if (response.isMonitoringActive) {
                        if (profiles.length > 0 && profiles.some(p => p.dwellCount > 0 || p.velocityCount > 0 || p.flightCount > 0)) {
                            state.monitoring = true;
                            console.log('Offscreen State Initialized (Monitoring Active):', state);
                        } else {
                            console.warn('Offscreen: Cannot restore monitoring state - No valid profile loaded.');
                            state.monitoring = false;
                            chrome.runtime.sendMessage({ action: 'STOP_MONITORING' });
                        }
                    } else {
                        state.monitoring = false;
                        console.log('Offscreen State Initialized (Idle/Enrolling):', state);
                    }
                } else {
                    console.error('Offscreen: No response from GET_STATUS');
                }
                isInitialized = true;
                resolve();
            });
        });
    } catch (e) {
        console.error('Offscreen Init Error:', e);
        isInitialized = true; 
    }
})();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return false;
    initPromise.then(async () => {
        switch (message.action) {
        case 'START_ENROLLMENT':
            state.enrollment = true;
            state.monitoring = false;
            console.log('Enrollment Started');
            break;
        case 'STOP_ENROLLMENT':
            state.enrollment = false;
            console.log('Enrollment Stopped');
            break;
        case 'START_MONITORING':
            const profiles = model.getProfiles();
            if (profiles.length === 0 || !profiles.some(p => p.dwellCount >= 1 || p.velocityCount >= 1)) {
                console.warn('Cannot start monitoring: Model not trained or insufficient data');
                return;
            }
            state.monitoring = true;
            console.log(`Monitoring Started with ${profiles.length} profiles`);
            break;
        case 'STOP_MONITORING':
            state.monitoring = false;
            console.log('Monitoring Stopped');
            break;
        case 'SAVE_SAMPLE':
            handleIncomingData(message.data);
            break;
        case 'TRAIN_MODEL':
            performTraining(message.profileName);
            break;
        case 'UNLOCK_SUCCESS':
            trainFromTempData();
            break;
        case 'WIPE_PROFILE':
            await storage.clearSamples();
            await storage.clearProfiles();
            model.clearProfiles();
            tempMonitoringBuffer = [];
            console.log('Profile Wiped (Storage & Memory)');
            break;
    }
    });
});

async function handleIncomingData(data) {
    if (!state.enrollment && !state.monitoring) {
        return;
    }
    console.log(`[Offscreen] Processing ${data.length} events...`);
    const features = extractor.processBatch(data);
    features.timestamp = Date.now();
    if (state.enrollment) {
        await storage.saveSample(features);
        console.log('Sample saved during enrollment');
        const allSamples = await storage.getAllSamples();
        if (allSamples.length >= 30) {
            console.log(`Collected ${allSamples.length} samples. Auto-stopping enrollment.`);
            chrome.runtime.sendMessage({ action: 'STOP_ENROLLMENT' });
            state.enrollment = false;
        }
    }
    if (state.monitoring) {
        tempMonitoringBuffer.push(features);
        if (tempMonitoringBuffer.length > TEMP_BUFFER_LIMIT) {
            tempMonitoringBuffer.shift();
        }
        const score = model.score(features);
        const action = policy.evaluate(score);
        if (action !== 'ALLOW') {
            console.warn(`Security Event: ${action} | Score: ${score.toFixed(2)}`);
            chrome.runtime.sendMessage({
                action: 'SECURITY_ALERT',
                level: action,
                score: score
            });
            await storage.logEvent('SECURITY_ALERT', { level: action, score });
            if (action === 'LOCK') {
                state.monitoring = false;
                console.log('Monitoring paused due to LOCK event.');
            }
        }
    }
}

async function performTraining(profileName = 'default') {
    console.log(`Starting Training for profile: ${profileName}...`);
    const samples = await storage.getAllSamples();
    if (samples.length < 10) {
        console.warn(`Not enough samples to train. Found ${samples.length}, need 10.`);
        return;
    }
    const newBlankProfile = model.createNewBlankProfile();
    samples.forEach(s => {
        if (s.avgDwell !== undefined) {
            model.update(s, newBlankProfile);
        }
    });
    const newProfileData = { ...newBlankProfile, profileId: profileName };
    await storage.saveProfile(newProfileData);
    model.loadProfile(newProfileData);
    console.log(`Training Complete. Profile '${profileName}' saved.`);
    chrome.runtime.sendMessage({ action: 'TRAINING_COMPLETE', profileId: profileName });
}

async function trainFromTempData() {
    if (tempMonitoringBuffer.length < 5) {
        console.log(`[Continuous Learning] Not enough temp data to train (${tempMonitoringBuffer.length} samples)`);
        tempMonitoringBuffer = [];
        return;
    }
    console.log(`[Continuous Learning] Training new profile from ${tempMonitoringBuffer.length} samples...`);
    const newBlankProfile = model.createNewBlankProfile();
    tempMonitoringBuffer.forEach(features => {
        if (features.avgDwell !== undefined) {
            model.update(features, newBlankProfile);
        }
    });
    const profileId = 'learned_' + Date.now();
    const newProfileData = { ...newBlankProfile, profileId: profileId };
    await storage.saveProfile(newProfileData);
    model.loadProfile(newProfileData);
    console.log(`[Continuous Learning] Saved new profile '${profileId}'. Total profiles: ${model.getProfiles().length}`);
    tempMonitoringBuffer = [];
}

