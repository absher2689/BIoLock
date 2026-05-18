console.log('BioLock Background Service Worker Started');
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
async function setupOffscreenDocument(path) {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: path,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: 'BioLock ML Engine & Storage',
  });
}
chrome.runtime.onStartup.addListener(() => {
  setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
});
chrome.runtime.onInstalled.addListener(() => {
  setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DEBUG_LOG') {
    console.log(`[CONTENT]: ${message.message}`);
    return;
  }
  console.log('Background received message:', message);
  if (['SAVE_SAMPLE', 'START_ENROLLMENT', 'STOP_ENROLLMENT', 'START_MONITORING', 'STOP_MONITORING', 'TRAIN_MODEL', 'WIPE_PROFILE'].includes(message.action)) {
    console.log(`[Background] Routing ${message.action} to Offscreen`);
    setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH).then(() => {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        ...message
      });
    });
  }
  if (message.action === 'SECURITY_ALERT') {
    console.log('SECURITY ALERT:', message.level);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'SHOW_WARNING',
          level: message.level
        }).catch(() => { });
      }
    });
  }
  if (message.action === 'START_ENROLLMENT') {
    chrome.storage.local.set({ mode: 'enrollment' });
    broadcastToTabs(message);
  }
  if (message.action === 'STOP_ENROLLMENT') {
    chrome.storage.local.set({ mode: 'training_pending' });
    broadcastToTabs(message);
  }
  if (message.action === 'START_MONITORING') {
    chrome.storage.local.set({ mode: 'monitoring' });
  }
  if (message.action === 'STOP_MONITORING') {
    chrome.storage.local.set({ mode: 'idle' });
  }
  if (message.action === 'WIPE_PROFILE' || message.action === 'DISCARD_ENROLLMENT') {
    chrome.storage.local.set({ mode: 'idle' });
  }  if (message.action === 'TRAINING_COMPLETE') {
    chrome.storage.local.set({ mode: 'idle' });
  }
  if (message.action === 'GET_STATUS') {
    console.log('Background: Handling GET_STATUS');
    chrome.storage.local.get(['mode'], (result) => {
      console.log('Background: Current Mode in Storage:', result.mode);
      sendResponse({
        isEnrollmentActive: result.mode === 'enrollment',
        isMonitoringActive: result.mode === 'monitoring',
        isTrainingPending: result.mode === 'training_pending'
      });
      console.log('Background: Sent GET_STATUS response');
    });
    return true; 
  }
  if (message.action === 'UNLOCK_ATTEMPT') {
    chrome.storage.local.get(['unlockPassword'], (result) => {
      const savedPass = result.unlockPassword;
      if (!savedPass || savedPass === message.password) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'UNLOCK_SUCCESS' });
        setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH).then(() => {
          chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'UNLOCK_SUCCESS'
          });
          chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'START_MONITORING'
          });
        });
        chrome.storage.local.set({ mode: 'monitoring' });
      } else {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'UNLOCK_FAIL' });
      }
    });
  }
});
function broadcastToTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => { });
    });
  });
}
