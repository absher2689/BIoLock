const elements = {
    status: document.getElementById('status-text'),
    profile: document.getElementById('profile-status'),
    profileInput: document.getElementById('profile-name-input'),
    btnEnroll: document.getElementById('btn-enroll'),
    btnTrain: document.getElementById('btn-train'),
    btnMonitor: document.getElementById('btn-monitor'),
    btnDisable: document.getElementById('btn-disable-all'),
    btnDiscard: document.getElementById('btn-discard'),
    btnWipe: document.getElementById('btn-wipe')
};
let state = {
    isEnrollmentActive: false,
    isMonitoringActive: false,
    isTrainingPending: false
};
function updateUI() {
    elements.profileInput.classList.add('hidden');
    document.getElementById('password-input').classList.add('hidden');
    elements.btnTrain.classList.add('hidden');
    elements.btnDiscard.classList.add('hidden');
    elements.btnEnroll.classList.remove('hidden');

    if (state.isEnrollmentActive) {
        elements.status.textContent = 'Enrolling...';
        elements.status.style.color = '#1a73e8';
        elements.btnEnroll.textContent = 'Stop Enrollment';
        elements.btnEnroll.classList.add('btn-danger');
        elements.btnEnroll.classList.remove('btn-primary');
        elements.btnMonitor.classList.add('hidden');
        elements.btnDisable.classList.add('hidden');
    } else if (state.isTrainingPending) {
        elements.status.textContent = 'Enrollment Complete. Save Profile?';
        elements.status.style.color = '#e67c00'; 
        elements.btnEnroll.classList.add('hidden');
        elements.profileInput.classList.remove('hidden');
        document.getElementById('password-input').classList.remove('hidden');
        elements.btnTrain.classList.remove('hidden');
        elements.btnDiscard.classList.remove('hidden');
        elements.btnMonitor.classList.add('hidden');
    } else if (state.isMonitoringActive) {
        elements.status.textContent = 'Protected (Monitoring)';
        elements.status.style.color = 'green';
        elements.btnEnroll.classList.add('hidden');
        elements.btnMonitor.classList.add('hidden');
        elements.btnDisable.classList.remove('hidden');
    } else {
        elements.status.textContent = 'Idle';
        elements.status.style.color = '#333';
        elements.btnEnroll.textContent = 'Start Enrollment';
        elements.btnEnroll.classList.add('btn-primary');
        elements.btnEnroll.classList.remove('btn-danger');
        elements.btnMonitor.textContent = 'Enable Protection';
        elements.btnMonitor.classList.add('btn-primary');
        elements.btnMonitor.classList.remove('hidden');
        elements.btnDisable.classList.add('hidden');
    }
}
if (elements.btnEnroll) {
    elements.btnEnroll.addEventListener('click', () => {
        if (state.isEnrollmentActive) {
                chrome.runtime.sendMessage({ action: 'STOP_ENROLLMENT' });
                state.isEnrollmentActive = false;
                state.isTrainingPending = true; 
                updateUI();
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = tabs[0]?.url || '';
                if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || !url) {
                    alert('BioLock cannot run on this page (Browser Security Restriction).\n\nPlease visit a normal website (e.g., google.com, example.com) to Enroll and Test.');
                    return;
                }
                chrome.runtime.sendMessage({ action: 'START_ENROLLMENT' });
                state.isEnrollmentActive = true;
                updateUI();
            });
        }
    });
}
if (elements.btnTrain) {
    elements.btnTrain.addEventListener('click', () => {
        const name = elements.profileInput.value.trim() || 'Default';
        const password = document.getElementById('password-input').value.trim();
        if (password) {
            chrome.storage.local.set({ 'unlockPassword': password });
        }
        elements.status.textContent = 'Training...';
        chrome.runtime.sendMessage({
            action: 'TRAIN_MODEL',
            profileName: name
        });
    });
}
if (elements.btnMonitor) {
    elements.btnMonitor.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'START_MONITORING' });
        state.isMonitoringActive = true;
        updateUI();
    });
}
if (elements.btnDisable) {
    elements.btnDisable.addEventListener('click', () => {
        chrome.storage.local.get(['unlockPassword'], (result) => {
            const savedPass = result.unlockPassword;
            if (savedPass) {
                const pass = prompt("Enter password to disable protection:");
                if (pass !== savedPass) {
                    alert("Incorrect password!");
                    return;
                }
            }
            chrome.runtime.sendMessage({ action: 'STOP_MONITORING' });
            state.isMonitoringActive = false;
            updateUI();
        });
    });
}
if (elements.btnWipe) {
    elements.btnWipe.addEventListener('click', () => {
        chrome.storage.local.get(['unlockPassword'], (result) => {
            const savedPass = result.unlockPassword;
            if (savedPass) {
                const pass = prompt("Enter password to wipe profiles:");
                if (pass !== savedPass) {
                    alert("Incorrect password!");
                    return;
                }
            }
            if (confirm('Are you sure you want to wipe all biometric profiles? This cannot be undone.')) {
                chrome.runtime.sendMessage({ action: 'WIPE_PROFILE' });
                state.isEnrollmentActive = false;
                state.isMonitoringActive = false;
                updateUI();
                alert('Profile wiped.');
            }
        });
    });
}
if (elements.btnDiscard) {
    elements.btnDiscard.addEventListener('click', () => {
        if (confirm('Are you sure you want to discard this enrollment data?')) {
            chrome.runtime.sendMessage({ action: 'DISCARD_ENROLLMENT' });
            state.isTrainingPending = false;
            state.isEnrollmentActive = false;
            elements.profileInput.value = '';
            document.getElementById('password-input').value = '';
            updateUI();
        }
    });
}
chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response) {
        if (response.isEnrollmentActive !== undefined) state.isEnrollmentActive = response.isEnrollmentActive;
        if (response.isMonitoringActive !== undefined) state.isMonitoringActive = response.isMonitoringActive;
        if (response.isTrainingPending !== undefined) state.isTrainingPending = response.isTrainingPending;
        updateUI();
    }
});
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'TRAINING_COMPLETE') {
        elements.status.textContent = `Training Complete (${msg.profileId || 'Default'})`;
        elements.profile.textContent = msg.profileId || 'Default';
        setTimeout(() => {
            updateUI();
        }, 2000);
    }
});
