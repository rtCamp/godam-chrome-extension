import saveToDrive from "./modules/saveToDrive";

import {
    sendMessageTab,
    focusTab,
    removeTab,
    getCurrentTab,
    createTab,
} from "./modules/tabHelper";

import localforage from "localforage";

const saveToGoDAM = require('./modules/saveToGoDAM').default;

localforage.config({
    driver: localforage.INDEXEDDB,
    name: "screenity",
    version: 1,
});

// Get chunks store
const chunksStore = localforage.createInstance({
    name: "chunks",
});

// Get localDirectory store
const localDirectoryStore = localforage.createInstance({
    name: "localDirectory",
});

const startAfterCountdown = async () => {
    // Check that the recording didn't get dismissed
    const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
    const { offscreen } = await chrome.storage.local.get(["offscreen"]);

    if (recordingTab != null || offscreen) {
        chrome.storage.local.set({ recording: true });
        startRecording();
    }
};

const resetActiveTab = async () => {
    let editor_url = "editor.html";

    // Check if Chrome version is 109 or below
    if (navigator.userAgent.includes("Chrome/")) {
        const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
        if (version <= 109) {
            editor_url = "editorfallback.html";
        }
    }
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);

    // Check if activeTab exists
    chrome.tabs.get(activeTab, (tab) => {
        if (tab) {
            // Focus the window
            chrome.windows.update(tab.windowId, { focused: true }, async () => {
                chrome.tabs.update(activeTab, {
                    active: true,
                    selected: true,
                    highlighted: true,
                });

                focusTab(activeTab);

                sendMessageTab(activeTab, { type: "ready-to-record" });

                // Check if countdown is set, if so start recording after 3 seconds
                const { countdown } = await chrome.storage.local.get(["countdown"]);
                if (countdown) {
                    setTimeout(() => {
                        startAfterCountdown();
                    }, 3500);
                } else {
                    setTimeout(() => {
                        startAfterCountdown();
                    }, 500);
                }
            });
        }
    });
};

const resetActiveTabRestart = async () => {
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);
    focusTab(activeTab).then(async () => {
        sendMessageTab(activeTab, { type: "ready-to-record" });

        // Check if countdown is set, if so start recording after 3 seconds
        const { countdown } = await chrome.storage.local.get(["countdown"]);
        if (countdown) {
            setTimeout(() => {
                startAfterCountdown();
            }, 3000);
        } else {
            startRecording();
        }
    });
};

const startRecording = async () => {
    chrome.storage.local.set({
        recordingStartTime: Date.now(),
        restarting: false,
        recording: true,
    });

    // Check if customRegion is set
    const { customRegion } = await chrome.storage.local.get(["customRegion"]);

    if (customRegion) {
        sendMessageRecord({ type: "start-recording-tab", region: true });
    } else {
        sendMessageRecord({ type: "start-recording-tab" });
    }
    chrome.action.setIcon({ path: "assets/stop-recording.png" });
    // Set up alarm if set in storage
    const { alarm } = await chrome.storage.local.get(["alarm"]);
    const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
    if (alarm) {
        const seconds = parseFloat(alarmTime);
        chrome.alarms.create("recording-alarm", { delayInMinutes: seconds / 60 });
    }
};

// Detect commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "start-recording") {
        // get active tab
        const activeTab = await getCurrentTab();

        // Check if it's possible to inject into content (not a chrome:// page, new tab, etc)
        if (
            !(
                (navigator.onLine === false &&
                    !activeTab.url.includes("/playground.html") &&
                    !activeTab.url.includes("/setup.html")) ||
                activeTab.url.startsWith("chrome://") ||
                (activeTab.url.startsWith("chrome-extension://") &&
                    !activeTab.url.includes("/playground.html") &&
                    !activeTab.url.includes("/setup.html"))
            ) &&
            !activeTab.url.includes("stackoverflow.com/") &&
            !activeTab.url.includes("chrome.google.com/webstore") &&
            !activeTab.url.includes("chromewebstore.google.com")
        ) {
            sendMessageTab(activeTab.id, { type: "start-stream" });
        } else {
            chrome.tabs
                .create({
                    url: "playground.html",
                    active: true,
                })
                .then((tab) => {
                    chrome.storage.local.set({ activeTab: tab.id });
                    // Wait for the tab to load
                    chrome.tabs.onUpdated.addListener(function _(tabId, changeInfo, tab) {
                        if (tabId === tab.id && changeInfo.status === "complete") {
                            setTimeout(() => {
                                sendMessageTab(tab.id, { type: "start-stream" });
                            }, 500);
                            chrome.tabs.onUpdated.removeListener(_);
                        }
                    });
                });
        }
    } else if (command === "cancel-recording") {
        // get active tab
        const activeTab = await getCurrentTab();
        sendMessageTab(activeTab.id, { type: "cancel-recording" });
    } else if (command == "pause-recording") {
        const activeTab = await getCurrentTab();
        sendMessageTab(activeTab.id, { type: "pause-recording" });
    }
});

const handleAlarm = async (alarm) => {
    if (alarm.name === "recording-alarm") {
        // Check if recording
        const { recording } = await chrome.storage.local.get(["recording"]);
        if (recording) {
            stopRecording();

            const { activeTab } = await chrome.storage.local.get(["activeTab"]);

            // Check if actual tab
            chrome.tabs.get(activeTab, (t) => {
                if (t) {
                    sendMessageTab(activeTab, { type: "stop-recording-tab" });
                } else {
                    sendMessageTab(tab.id, { type: "stop-recording-tab" });
                    chrome.storage.local.set({ activeTab: tab.id });
                }
            });
        }
        chrome.alarms.clear("recording-alarm");
    }
};

const alarmListener = (alarm) => {
    handleAlarm(alarm);
};

const addAlarmListener = () => {
    if (!chrome.alarms.onAlarm.hasListener(alarmListener)) {
        chrome.alarms.onAlarm.addListener(alarmListener);
    }
};

// Check if the permission is granted
if (chrome.permissions) {
    chrome.permissions.contains({ permissions: ["alarms"] }, (result) => {
        if (result) {
            addAlarmListener();
        }
    });
}

const onActivated = async (activeInfo) => {
    const { recordingStartTime } = await chrome.storage.local.get([
        "recordingStartTime",
    ]);
    // Get tab
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // Check if not recording (needs to hide the extension)
    const { recording } = await chrome.storage.local.get(["recording"]);
    const { restarting } = await chrome.storage.local.get(["restarting"]);

    // Update active tab
    if (recording) {
        // Check if region recording, and if the recording tab is the same as the current tab
        const { tabRecordedID } = await chrome.storage.local.get(["tabRecordedID"]);
        if (tabRecordedID && tabRecordedID != activeInfo.tabId) {
            sendMessageTab(activeInfo.tabId, { type: "hide-popup-recording" });
            // Check if active tab is not backup.html + chrome-extension://
        } else if (
            !(
                tab.url.includes("backup.html") &&
                tab.url.includes("chrome-extension://")
            )
        ) {
            chrome.storage.local.set({ activeTab: activeInfo.tabId });
        }

        // Check if region or customRegion is set
        const { region } = await chrome.storage.local.get(["region"]);
        const { customRegion } = await chrome.storage.local.get(["customRegion"]);
        if (!region && !customRegion) {
            sendMessageTab(activeInfo.tabId, { type: "recording-check" });
        }
    } else if (!recording && !restarting) {
        sendMessageTab(activeInfo.tabId, { type: "recording-ended" });
    }

    if (recordingStartTime) {
        // Check if alarm
        const { alarm } = await chrome.storage.local.get(["alarm"]);
        if (alarm) {
            // Send remaining seconds
            const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
            const seconds = parseFloat(alarmTime);
            const time = Math.floor((Date.now() - recordingStartTime) / 1000);
            const remaining = seconds - time;
            sendMessageTab(activeInfo.tabId, {
                type: "time",
                time: remaining,
            });
        } else {
            const time = Math.floor((Date.now() - recordingStartTime) / 1000);
            sendMessageTab(activeInfo.tabId, { type: "time", time: time });
        }
    }
};

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
    }

    // Get the tab that is active in the focused window
    const [activeTab] = await chrome.tabs.query({
        active: true,
        windowId: windowId,
    });

    if (activeTab) {
        onActivated({ tabId: activeTab.id });
    }
});

// Check when a page is activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    onActivated(activeInfo);
});

// Check when a user navigates to a different domain in the same tab (chrome.tabs?)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        // Check if not recording (needs to hide the extension)
        const { recording } = await chrome.storage.local.get(["recording"]);
        const { restarting } = await chrome.storage.local.get(["restarting"]);
        const { tabRecordedID } = await chrome.storage.local.get(["tabRecordedID"]);

        if (!recording && !restarting) {
            sendMessageTab(tabId, { type: "recording-ended" });
        } else if (recording && tabRecordedID && tabRecordedID == tabId) {
            sendMessageTab(tabId, { type: "recording-check", force: true });
        }

        const { recordingStartTime } = await chrome.storage.local.get([
            "recordingStartTime",
        ]);
        // Get tab
        const tab = await chrome.tabs.get(tabId);

        if (recordingStartTime) {
            // Check if alarm
            const { alarm } = await chrome.storage.local.get(["alarm"]);
            if (alarm) {
                // Send remaining seconds
                const { alarmTime } = await chrome.storage.local.get(["alarmTime"]);
                const seconds = parseFloat(alarmTime);
                const time = Math.floor((Date.now() - recordingStartTime) / 1000);
                const remaining = seconds - time;
                sendMessageTab(tabId, {
                    type: "time",
                    time: remaining,
                });
            } else {
                const time = Math.floor((Date.now() - recordingStartTime) / 1000);
                sendMessageTab(tabId, { type: "time", time: time });
            }
        }

        const commands = await chrome.commands.getAll();
        sendMessageTab(tabId, {
            type: "commands",
            commands: commands,
        });

        // Check if tab is playground.html
        if (
            tab.url.includes(chrome.runtime.getURL("playground.html")) &&
            changeInfo.status === "complete"
        ) {
            sendMessageTab(tab.id, { type: "toggle-popup" });
        }
    }
});

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(reader.result);
        };
        reader.onerror = function (error) {
            reject(error);
        };
        reader.readAsDataURL(blob);
    });
}

const handleChunks = async (chunks, override = false) => {
    const { sendingChunks, sandboxTab } = await chrome.storage.local.get([
        "sendingChunks",
        "sandboxTab",
    ]);

    if (sendingChunks) {
        console.warn("Chunks are already being sent, skipping...");
        return;
    }
    await chrome.storage.local.set({ sendingChunks: true });

    if (chunks.length === 0) {
        await chrome.storage.local.set({ sendingChunks: false });
        sendMessageTab(sandboxTab, { type: "make-video-tab", override });
        return;
    }

    // Order chunks by timestamp
    chunks.sort((a, b) => a.timestamp - b.timestamp);

    let currentIndex = 0;
    const batchSize = 10;
    const maxRetries = 3;
    const retryDelay = 1000;
    const chunksCount = chunks.length;

    sendMessageTab(sandboxTab, {
        type: "chunk-count",
        count: chunksCount,
        override,
    });

    const sendBatch = async (batch, retryCount = 0) => {
        try {
            const response = await sendMessageTab(sandboxTab, {
                type: "new-chunk-tab",
                chunks: batch,
            });
            if (!response) {
                throw new Error("No response or failed response from tab.");
            }
        } catch (error) {
            if (retryCount < maxRetries) {
                console.error(
                    `Sending batch failed, retrying... Attempt ${retryCount + 1}`,
                    error
                );
                setTimeout(() => sendBatch(batch, retryCount + 1), retryDelay);
            } else {
                console.error("Maximum retry attempts reached for this batch.", error);
            }
        }
    };

    while (currentIndex < chunksCount) {
        const end = Math.min(currentIndex + batchSize, chunksCount);
        const batch = await Promise.all(
            chunks.slice(currentIndex, end).map(async (chunk, index) => {
                try {
                    const base64 = await blobToBase64(chunk.chunk);
                    return { chunk: base64, index: currentIndex + index };
                } catch (error) {
                    console.error("Error converting chunk to Base64", error);
                    return null;
                }
            })
        );

        // Filter out any failed conversions
        const filteredBatch = batch.filter((chunk) => chunk !== null);
        if (filteredBatch.length > 0) {
            await sendBatch(filteredBatch);
        }
        currentIndex += batchSize;
    }

    await chrome.storage.local.set({ sendingChunks: false });
    sendMessageTab(sandboxTab, { type: "make-video-tab", override });
};

const sendChunks = async (override = false) => {
    try {
        const chunks = [];
        await chunksStore.iterate((value, key) => {
            chunks.push(value);
        });

        handleChunks(chunks, override);
    } catch (error) {
        chrome.runtime.reload();
    }
};

const getChunks = async () => {
    const chunks = [];
    await chunksStore.iterate((value, key) => {
        chunks.push(value);
    });
    return chunks;
};

const stopRecording = async () => {
    chrome.storage.local.set({ restarting: false });
    const { recordingStartTime } = await chrome.storage.local.get([
        "recordingStartTime",
    ]);
    let duration = Date.now() - recordingStartTime;
    const maxDuration = 7 * 60 * 1000;

    if (recordingStartTime === 0) {
        duration = 0;
    }
    chrome.storage.local.set({
        recording: false,
        recordingDuration: duration,
        tabRecordedID: null,
    });

    chrome.storage.local.set({ recordingStartTime: 0 });

    if (duration > maxDuration) {
        // Close the sandbox tab, open a new one with fallback editor
        chrome.tabs.create(
            {
                url: "editorfallback.html",
                active: true,
            },
            (tab) => {
                chrome.tabs.onUpdated.addListener(function _(
                    tabId,
                    changeInfo,
                    updatedTab
                ) {
                    if (tabId === tab.id && changeInfo.status === "complete") {
                        chrome.tabs.onUpdated.removeListener(_);
                        chrome.storage.local.set({ sandboxTab: tab.id });
                        sendChunks();
                    }
                });
            }
        );
    } else {
        // Close the sandbox tab, open a new one with normal editor
        chrome.tabs.create(
            {
                url: "editor.html",
                active: true,
            },
            (tab) => {
                chrome.tabs.onUpdated.addListener(function _(
                    tabId,
                    changeInfo,
                    updatedTab
                ) {
                    if (tabId === tab.id && changeInfo.status === "complete") {
                        chrome.tabs.onUpdated.removeListener(_);
                        chrome.storage.local.set({ sandboxTab: tab.id });
                        sendChunks();
                    }
                });
            }
        );
    }

    chrome.action.setIcon({ path: "assets/icon-34.png" });

    // Check if wasRegion is set
    const { wasRegion } = await chrome.storage.local.get(["wasRegion"]);
    if (wasRegion) {
        chrome.storage.local.set({ wasRegion: false, region: true });
    }

    // Cancel any alarms
    chrome.alarms.clear("recording-alarm");

    discardOffscreenDocuments();
};

const forceProcessing = async () => {
    // Need to create a new sandbox tab
    let editor_url = "editor.html";

    // Get sandbox tab
    const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);

    chrome.tabs.create(
        {
            url: editor_url,
            active: true,
        },
        (tab) => {
            chrome.tabs.onUpdated.addListener(function _(
                tabId,
                changeInfo,
                updatedTab
            ) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(_);
                    // Close the existing sandbox tab
                    removeTab(sandboxTab);
                    chrome.storage.local.set({ sandboxTab: tab.id });

                    sendChunks(true);
                }
            });
        }
    );
};

// For some reason without this the service worker doesn't always work
chrome.runtime.onStartup.addListener(() => {
    console.log(`Starting...`);
});

// Check when action button is clicked
chrome.action.onClicked.addListener(async (tab) => {

    // Check if user is logged in to GoDAM
    const { godamToken } = await chrome.storage.local.get(["godamToken"]);

    if (!godamToken) {
        // Store the current tab ID before opening login page
        chrome.storage.local.set({ previousTabId: tab.id });

        chrome.tabs.create({
            url: "login.html",
            active: true
        });

        return;
    }

    // Check if recording
    const { recording } = await chrome.storage.local.get(["recording"]);
    if (recording) {
        stopRecording();
        sendMessageRecord({ type: "stop-recording-tab" });
        const { activeTab } = await chrome.storage.local.get(["activeTab"]);

        // Check if actual tab
        chrome.tabs.get(activeTab, (t) => {
            if (t) {
                sendMessageTab(activeTab, { type: "stop-recording-tab" });
            } else {
                sendMessageTab(tab.id, { type: "stop-recording-tab" });
                chrome.storage.local.set({ activeTab: tab.id });
            }
        });
    } else {
        // Check if it's possible to inject into content (not a chrome:// page, new tab, etc)
        if (
            !(
                (navigator.onLine === false &&
                    !tab.url.includes("/playground.html") &&
                    !tab.url.includes("/setup.html")) ||
                tab.url.startsWith("chrome://") ||
                (tab.url.startsWith("chrome-extension://") &&
                    !tab.url.includes("/playground.html") &&
                    !tab.url.includes("/setup.html"))
            ) &&
            !tab.url.includes("stackoverflow.com/") &&
            !tab.url.includes("chrome.google.com/webstore") &&
            !tab.url.includes("chromewebstore.google.com")
        ) {
            sendMessageTab(tab.id, { type: "toggle-popup" });
            chrome.storage.local.set({ activeTab: tab.id });
        } else {
            chrome.tabs
                .create({
                    url: "playground.html",
                    active: true,
                })
                .then((tab) => {
                    chrome.storage.local.set({ activeTab: tab.id });
                });
        }
    }

    const { firstTime } = await chrome.storage.local.get(["firstTime"]);

    if (firstTime && tab.url.includes(chrome.runtime.getURL("setup.html"))) {
        chrome.storage.local.set({ firstTime: false });
        // Send message to active tab
        const activeTab = await getCurrentTab();
        sendMessageTab(activeTab.id, { type: "setup-complete" });
    }
});

const restartActiveTab = async () => {
    const activeTab = await getCurrentTab();
    sendMessageTab(activeTab.id, { type: "ready-to-record" });
};

const getStreamingData = async () => {
    const {
        micActive,
        defaultAudioInput,
        defaultAudioOutput,
        defaultVideoInput,
        systemAudio,
        recordingType,
    } = await chrome.storage.local.get([
        "micActive",
        "defaultAudioInput",
        "defaultAudioOutput",
        "defaultVideoInput",
        "systemAudio",
        "recordingType",
    ]);

    return {
        micActive,
        defaultAudioInput,
        defaultAudioOutput,
        defaultVideoInput,
        systemAudio,
        recordingType,
    };
};

const handleDismiss = async () => {
    chrome.storage.local.set({ restarting: true });
    const { region } = await chrome.storage.local.get(["region"]);
    // Check if wasRegion is set
    const { wasRegion } = await chrome.storage.local.get(["wasRegion"]);
    if (wasRegion) {
        chrome.storage.local.set({ wasRegion: false, region: true });
    }
    chrome.action.setIcon({ path: "assets/icon-34.png" });
};

const handleRestart = async () => {
    chrome.storage.local.set({ restarting: true });
    let editor_url = "editor.html";

    // Check if Chrome version is 109 or below
    if (navigator.userAgent.includes("Chrome/")) {
        const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
        if (version <= 109) {
            editor_url = "editorfallback.html";
        }
    }

    resetActiveTabRestart();
};

const sendMessageRecord = async (message) => {
    // Send a message to the recording tab or offscreen recording document, depending on which was created
    chrome.storage.local.get(["recordingTab", "offscreen"], (result) => {
        if (result.offscreen) {
            chrome.runtime.sendMessage(message);
        } else {
            // Get the recording tab first before sending the message
            sendMessageTab(result.recordingTab, message);
        }
    });
};

const initBackup = async (request, id) => {
    const { backupTab } = await chrome.storage.local.get(["backupTab"]);
    const backupURL = chrome.runtime.getURL("backup.html");

    if (backupTab) {
        chrome.tabs.get(backupTab, (tab) => {
            if (tab) {
                sendMessageTab(tab.id, {
                    type: "init-backup",
                    request: request,
                    tabId: id,
                });
            } else {
                chrome.tabs.create(
                    {
                        url: backupURL,
                        active: true,
                        pinned: true,
                        index: 0,
                    },
                    (tab) => {
                        chrome.storage.local.set({ backupTab: tab.id });
                        chrome.tabs.onUpdated.addListener(function _(
                            tabId,
                            changeInfo,
                            updatedTab
                        ) {
                            // Check if recorder tab has finished loading
                            if (tabId === tab.id && changeInfo.status === "complete") {
                                sendMessageTab(tab.id, {
                                    type: "init-backup",
                                    request: request,
                                    tabId: id,
                                });
                                chrome.tabs.onUpdated.removeListener(_);
                            }
                        });
                    }
                );
            }
        });
    } else {
        chrome.tabs.create(
            {
                url: backupURL,
                active: true,
                pinned: true,
                index: 0,
            },
            (tab) => {
                chrome.storage.local.set({ backupTab: tab.id });
                chrome.tabs.onUpdated.addListener(function _(
                    tabId,
                    changeInfo,
                    updatedTab
                ) {
                    // Check if recorder tab has finished loading
                    if (tabId === tab.id && changeInfo.status === "complete") {
                        sendMessageTab(tab.id, {
                            type: "init-backup",
                            request: request,
                            tabId: id,
                        });
                        chrome.tabs.onUpdated.removeListener(_);
                    }
                });
            }
        );
    }
};

const offscreenDocument = async (request, tabId = null) => {
    const { backup } = await chrome.storage.local.get(["backup"]);
    let activeTab = await getCurrentTab();
    if (tabId !== null) {
        activeTab = await chrome.tabs.get(tabId);
    }
    chrome.storage.local.set({
        activeTab: activeTab.id,
        tabRecordedID: null,
        memoryError: false,
    });

    // Check activeTab URL
    if (activeTab.url.includes(chrome.runtime.getURL("playground.html"))) {
        chrome.storage.local.set({ tabPreferred: true });
    } else {
        chrome.storage.local.set({ tabPreferred: false });
    }

    // Close all offscreen documents (if chrome.offscreen is available)
    try {
        const existingContexts = await chrome.runtime.getContexts({});
        const offscreenDocument = existingContexts.find(
            (c) => c.contextType === "OFFSCREEN_DOCUMENT"
        );
        if (offscreenDocument) {
            await chrome.offscreen.closeDocument();
        }
    } catch (error) { }

    if (request.region) {
        if (tabId !== null) {
            // Navigate to the tab
            chrome.tabs.update(tabId, { active: true });
        }
        chrome.storage.local.set({
            recordingTab: activeTab.id,
            offscreen: false,
            region: true,
        });

        if (request.customRegion) {
            sendMessageRecord({
                type: "loaded",
                request: request,
                backup: backup,
                region: true,
            });
        } else {
            try {
                // This is following the steps from this page, but it still doesn't work :( https://developer.chrome.com/docs/extensions/mv3/screen_capture/#audio-and-video-offscreen-doc
                throw new Error("Exit offscreen recording");
                const existingContexts = await chrome.runtime.getContexts({});

                const offDocument = existingContexts.find(
                    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
                );

                if (offDocument) {
                    // If an offscreen document is already open, close it.
                    await chrome.offscreen.closeDocument();
                }

                // Create an offscreen document.
                await chrome.offscreen.createDocument({
                    url: "recorderoffscreen.html",
                    reasons: ["USER_MEDIA", "AUDIO_PLAYBACK", "DISPLAY_MEDIA"],
                    justification:
                        "Recording from getDisplayMedia API and tabCapture API",
                });

                const streamId = await chrome.tabCapture.getMediaStreamId({
                    targetTabId: activeTab.id,
                });

                chrome.storage.local.set({
                    recordingTab: null,
                    offscreen: true,
                    region: false,
                    wasRegion: true,
                });
                sendMessageRecord({
                    type: "loaded",
                    request: request,
                    isTab: true,
                    tabID: streamId,
                });
            } catch (error) {
                // Open the recorder.html page as a normal tab.
                chrome.tabs
                    .create({
                        url: "recorder.html",
                        pinned: true,
                        index: 0,
                        active: activeTab.url.includes(
                            chrome.runtime.getURL("playground.html")
                        )
                            ? true
                            : false,
                    })
                    .then((tab) => {
                        chrome.storage.local.set({
                            recordingTab: tab.id,
                            offscreen: false,
                            region: false,
                            wasRegion: true,
                            tabRecordedID: activeTab.id,
                        });
                        chrome.tabs.onUpdated.addListener(function _(
                            tabId,
                            changeInfo,
                            updatedTab
                        ) {
                            // Check if recorder tab has finished loading
                            if (tabId === tab.id && changeInfo.status === "complete") {
                                chrome.tabs.onUpdated.removeListener(_);
                                sendMessageRecord({
                                    type: "loaded",
                                    request: request,
                                    tabID: activeTab.id,
                                    backup: backup,
                                    isTab: true,
                                });
                            }
                        });
                    });
            }
        }
    } else {
        try {
            if (!request.offscreenRecording || request.camera) {
                throw new Error("Exit offscreen recording");
            }

            if (tabId !== null) {
                // Navigate to the tab
                chrome.tabs.update(tabId, { active: true });
            }

            const { qualityValue } = await chrome.storage.local.get(["qualityValue"]);
            const { fpsValue } = await chrome.storage.local.get(["fpsValue"]);

            // also add && !request.camera above if works
            const existingContexts = await chrome.runtime.getContexts({});

            const offDocument = existingContexts.find(
                (c) => c.contextType === "OFFSCREEN_DOCUMENT"
            );

            if (offDocument) {
                // If an offscreen document is already open, close it.
                await chrome.offscreen.closeDocument();
            }
            // Create an offscreen document.
            await chrome.offscreen.createDocument({
                url: "recorderoffscreen.html",
                reasons: ["USER_MEDIA", "AUDIO_PLAYBACK", "DISPLAY_MEDIA"],
                justification: "Recording from getDisplayMedia API",
            });

            chrome.storage.local.set({
                recordingTab: null,
                offscreen: true,
                region: false,
                wasRegion: false,
            });
            sendMessageRecord({
                type: "loaded",
                request: request,
                isTab: false,
                quality: qualityValue,
                fps: fpsValue,
                backup: backup,
            });
        } catch (error) {
            // Open the recorder.html page as a normal tab.
            let switchTab = true;
            if (request.camera) {
                switchTab = false;
            }
            chrome.tabs
                .create({
                    url: "recorder.html",
                    pinned: true,
                    index: 0,
                    active: switchTab,
                })
                .then((tab) => {
                    chrome.storage.local.set({
                        recordingTab: tab.id,
                        offscreen: false,
                        region: false,
                        wasRegion: false,
                    });
                    chrome.tabs.onUpdated.addListener(function _(
                        tabId,
                        changeInfo,
                        updatedTab
                    ) {
                        // Check if recorder tab has finished loading
                        if (tabId === tab.id && changeInfo.status === "complete") {
                            chrome.tabs.onUpdated.removeListener(_);
                            sendMessageRecord({
                                type: "loaded",
                                request: request,
                                backup: backup,
                            });
                        }
                    });
                });
        }
    }
};

const savedToDrive = async () => {
    const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);
    sendMessageTab(sandboxTab, { type: "saved-to-drive" });
};

const discardOffscreenDocuments = async () => {
    // Try doing (maybe offscreen isn't available)
    try {
        const existingContexts = await chrome.runtime.getContexts({});
        const offscreenDocument = existingContexts.find(
            (c) => c.contextType === "OFFSCREEN_DOCUMENT"
        );
        if (offscreenDocument) {
            await chrome.offscreen.closeDocument();
        }
    } catch (error) { }
};

const executeScripts = async () => {
    const contentScripts = chrome.runtime.getManifest().content_scripts;
    const tabQueries = contentScripts.map((cs) =>
        chrome.tabs.query({ url: cs.matches })
    );
    const tabResults = await Promise.all(tabQueries);

    const executeScriptPromises = [];
    for (let i = 0; i < tabResults.length; i++) {
        const tabs = tabResults[i];
        const cs = contentScripts[i];

        for (const tab of tabs) {
            const executeScriptPromise = chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    files: cs.js,
                },
                () => chrome.runtime.lastError
            );
            executeScriptPromises.push(executeScriptPromise);
        }
    }

    await Promise.all(executeScriptPromises);
};

// On first install open setup.html
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        // Clear storage
        chrome.storage.local.clear();

        chrome.runtime.setUninstallURL('https://godam.io/chrome-extension-feedback/');
        chrome.storage.local.set({ firstTime: true });
        chrome.tabs.create({
            url: "setup.html",
        });
    } else if (details.reason === "update") {
        if (details.previousVersion === "2.8.6") {
            // Clear storage
            chrome.storage.local.clear();
            chrome.storage.local.set({ updatingFromOld: true });
        } else {
            chrome.storage.local.set({ updatingFromOld: false });
        }

        chrome.runtime.setUninstallURL('https://godam.io/chrome-extension-feedback/');
    }
    // Check chrome version, if 109 or below, disable backups
    if (navigator.userAgent.includes("Chrome/")) {
        const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
        if (version <= 109) {
            chrome.storage.local.set({ backup: false });
        }
    }

    chrome.storage.local.set({ systemAudio: true });

    // Check if the backup tab is open, if so close it
    const { backupTab } = await chrome.storage.local.get(["backupTab"]);
    if (backupTab) {
        removeTab(backupTab);
    }

    executeScripts();
});

// Detect if recordingTab is closed
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    // Check if region recording
    const { region } = await chrome.storage.local.get(["region"]);

    if (region) return;
    const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
    const { recording } = await chrome.storage.local.get(["recording"]);
    const { restarting } = await chrome.storage.local.get(["restarting"]);

    if (tabId === recordingTab && !restarting) {
        chrome.storage.local.set({ recordingTab: null });
        // Send a message to active tab
        const { activeTab } = await chrome.storage.local.get(["activeTab"]);

        try {
            if (recording) {
                focusTab(activeTab);
            }
            sendMessageTab(activeTab, { type: "stop-recording-tab" }, null, () => {
                // Tab doesn't exist, so just set activeTab to null
                sendMessageTab(tabId, { type: "stop-recording-tab" });
                chrome.storage.local.set({ activeTab: tabId });
            });
        } catch (error) {
            sendMessageTab(tabId, { type: "stop-recording-tab" });
            chrome.storage.local.set({ activeTab: tabId });
        }

        // Update icon
        chrome.action.setIcon({ path: "assets/icon-34.png" });
    }
});

const discardRecording = async () => {
    sendMessageRecord({ type: "dismiss-recording" });
    chrome.action.setIcon({ path: "assets/icon-34.png" });
    discardOffscreenDocuments();
    chrome.storage.local.set({
        recordingTab: null,
        sandboxTab: null,
        recording: false,
    });
    chrome.runtime.sendMessage({ type: "discard-backup" });
};

// Check if still (actually) recording by looking at recordingTab or offscreen document
const checkRecording = async () => {
    const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
    const { offscreen } = await chrome.storage.local.get(["offscreen"]);
    if (recordingTab && !offscreen) {
        try {
            chrome.tabs.get(recordingTab, (tab) => {
                if (!tab) {
                    discardRecording();
                }
            });
        } catch (error) {
            discardRecording();
        }
    } else if (offscreen) {
        const existingContexts = await chrome.runtime.getContexts({});
        const offDocument = existingContexts.find(
            (c) => c.contextType === "OFFSCREEN_DOCUMENT"
        );
        if (!offDocument) {
            discardRecording();
        }
    }
};

const newSandboxPageRestart = async () => {
    resetActiveTabRestart();
};

const isPinned = (sendResponse) => {
    chrome.action.getUserSettings().then((userSettings) => {
        sendResponse({ pinned: userSettings.isOnToolbar });
    });
};

const requestDownload = async (base64, title) => {
    // Open a new tab to get URL
    chrome.tabs.create(
        {
            url: "download.html",
            active: false,
        },
        (tab) => {
            chrome.tabs.onUpdated.addListener(function _(
                tabId,
                changeInfo,
                updatedTab
            ) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(_);
                    sendMessageTab(tab.id, {
                        type: "download-video",
                        base64: base64,
                        title: title,
                    });
                }
            });
        }
    );
};

const downloadIndexedDB = async () => {
    // Open a new tab to get URL
    chrome.tabs.create(
        {
            url: "download.html",
            active: false,
        },
        (tab) => {
            chrome.tabs.onUpdated.addListener(function _(
                tabId,
                changeInfo,
                updatedTab
            ) {
                if (tabId === tab.id && changeInfo.status === "complete") {
                    chrome.tabs.onUpdated.removeListener(_);
                    sendMessageTab(tab.id, {
                        type: "download-indexed-db",
                    });
                }
            });
        }
    );
};

const getPlatformInfo = (sendResponse) => {
    chrome.runtime.getPlatformInfo((info) => {
        sendResponse(info);
    });
};

const restoreRecording = async () => {
    let editor_url = "editorfallback.html";

    // Check if Chrome version is 109 or below
    if (navigator.userAgent.includes("Chrome/")) {
        const version = parseInt(navigator.userAgent.match(/Chrome\/([0-9]+)/)[1]);
        if (version <= 109) {
            editor_url = "editorfallback.html";
        }
    }

    let chunks = [];
    await chunksStore.iterate((value, key) => {
        chunks.push(value);
    });

    if (chunks.length === 0) {
        return;
    }

    chrome.tabs.create(
        {
            url: editor_url,
            active: true,
        },
        async (tab) => {
            // Set URL as sandbox tab
            chrome.storage.local.set({ sandboxTab: tab.id });
            // Wait for the tab to be loaded
            await new Promise((resolve) => {
                chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                    if (info.status === "complete" && tabId === tab.id) {
                        sendMessageTab(tab.id, {
                            type: "restore-recording",
                        });

                        sendChunks();
                    }
                });
            });
        }
    );
};

const checkRestore = async (sendResponse) => {
    const chunks = [];
    await chunksStore.iterate((value, key) => {
        chunks.push(value);
    });

    if (chunks.length === 0) {
        sendResponse({ restore: false, chunks: [] });
        return;
    }
    sendResponse({ restore: true });
};

const base64ToUint8Array = (base64) => {
    const dataUrlRegex = /^data:(.*?);base64,/;
    const matches = base64.match(dataUrlRegex);
    if (matches !== null) {
        // Base64 is a data URL
        const mimeType = matches[1];
        const binaryString = atob(base64.slice(matches[0].length));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    } else {
        // Base64 is a regular string
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: "video/webm" });
    }
};

const handleSaveToDrive = async (sendResponse, request, fallback = false) => {
    if (!fallback) {
        const blob = base64ToUint8Array(request.base64);

        // Specify the desired file name
        const fileName = request.title + ".mp4";

        // Call the saveToDrive function
        saveToDrive(blob, fileName, sendResponse).then(() => {
            savedToDrive();
        });
    } else {
        const chunks = [];
        await chunksStore.iterate((value, key) => {
            chunks.push(value);
        });

        // Build the video from chunks
        let array = [];
        let lastTimestamp = 0;
        for (const chunk of chunks) {
            // Check if chunk timestamp is smaller than last timestamp, if so, skip
            if (chunk.timestamp < lastTimestamp) {
                continue;
            }
            lastTimestamp = chunk.timestamp;
            array.push(chunk.chunk);
        }
        const blob = new Blob(array, { type: "video/webm" });

        const filename = request.title + ".webm";

        saveToDrive(blob, filename, sendResponse).then(() => {
            savedToDrive();
        });
    }
};

const desktopCapture = async (request) => {
    const { backup } = await chrome.storage.local.get(["backup"]);
    const { backupSetup } = await chrome.storage.local.get(["backupSetup"]);
    chrome.storage.local.set({ sendingChunks: false });
    if (backup) {
        if (!backupSetup) {
            localDirectoryStore.clear();
        }

        let activeTab = await getCurrentTab();
        initBackup(request, activeTab.id);
    } else {
        offscreenDocument(request);
    }
};

const writeFile = async (request) => {
    // Need to add safety check here to make sure the tab is still open
    const { backupTab } = await chrome.storage.local.get(["backupTab"]);

    if (backupTab) {
        sendMessageTab(
            backupTab,
            {
                type: "write-file",
                index: request.index,
            },
            null,
            () => {
                sendMessageRecord({ type: "stop-recording-tab" });
            }
        );
    } else {
        sendMessageRecord({ type: "stop-recording-tab" });
    }
};

const videoReady = async () => {
    const { backupTab } = await chrome.storage.local.get(["backupTab"]);
    if (backupTab) {
        sendMessageTab(backupTab, { type: "close-writable" });
    }
    stopRecording();
};

const newChunk = async (request) => {
    const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);
    sendMessageTab(sandboxTab, {
        type: "new-chunk-tab",
        chunk: request.chunk,
        index: request.index,
    });

    sendResponse({ status: "ok" });
};

const handleGetStreamingData = async () => {
    const data = await getStreamingData();
    sendMessageRecord({ type: "streaming-data", data: JSON.stringify(data) });
};

const cancelRecording = async () => {
    chrome.action.setIcon({ path: "assets/icon-34.png" });
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);
    sendMessageTab(activeTab, { type: "stop-pending" });
    focusTab(activeTab);
    discardOffscreenDocuments();
};

const handleStopRecordingTab = async (request) => {
    if (request.memoryError) {
        chrome.storage.local.set({
            recording: false,
            restarting: false,
            tabRecordedID: null,
            memoryError: true,
        });
    }
    // sendMessageRecord({
    //   type: "loaded",
    //   request: request,
    //   backup: backup,
    //   region: true,
    // });
    sendMessageRecord({ type: "stop-recording-tab" });
};

const handleRestartRecordingTab = async () => {
    //removeSandbox();
};

const handleDismissRecordingTab = async () => {
    chrome.runtime.sendMessage({ type: "discard-backup" });
    discardRecording();
};

const setMicActiveTab = async (request) => {
    chrome.storage.local.get(["region"], (result) => {
        if (result.region) {
            sendMessageRecord({
                type: "set-mic-active-tab",
                active: request.active,
                defaultAudioInput: request.defaultAudioInput,
            });
        }
    });
};

const handleRecordingError = async (request) => {
    // get actual active tab
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);

    sendMessageRecord({ type: "recording-error" }).then(() => {
        sendMessageTab(activeTab, { type: "stop-pending" });
        focusTab(activeTab);
        if (request.error === "stream-error") {
            sendMessageTab(activeTab, { type: "stream-error" });
        } else if (request.error === "backup-error") {
            sendMessageTab(activeTab, { type: "backup-error" });
        }
    });

    // Close recording tab
    const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);
    const { region } = await chrome.storage.local.get(["region"]);
    // Check if tab exists (with tab api)
    if (recordingTab && !region) {
        removeTab(recordingTab);
    }
    chrome.storage.local.set({ recordingTab: null });
    discardOffscreenDocuments();
};

const handleOnGetPermissions = async (request) => {
    // Send a message to (actual) active tab
    const activeTab = await getCurrentTab();
    if (activeTab) {
        sendMessageTab(activeTab.id, {
            type: "on-get-permissions",
            data: request,
        });
    }
};

const handleRecordingComplete = async () => {
    // Close the recording tab
    const { recordingTab } = await chrome.storage.local.get(["recordingTab"]);

    // Check if tab exists (with tab api)
    if (recordingTab) {
        chrome.tabs.get(recordingTab, (tab) => {
            if (tab) {
                // Check if tab url contains chrome-extension and recorder.html
                if (
                    tab.url.includes("chrome-extension") &&
                    tab.url.includes("recorder.html")
                ) {
                    removeTab(recordingTab);
                }
            }
        });
    }
};

const setSurface = async (request) => {
    chrome.storage.local.set({
        surface: request.surface,
    });

    const { activeTab } = await chrome.storage.local.get(["activeTab"]);
    sendMessageTab(activeTab, {
        type: "set-surface",
        surface: request.surface,
    });
};

const handlePip = async (started = false) => {
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);
    if (started) {
        sendMessageTab(activeTab, { type: "pip-started" });
    } else {
        sendMessageTab(activeTab, { type: "pip-ended" });
    }
};

const handleSignOutDrive = async () => {
    // Get token
    const { token } = await chrome.storage.local.get(["token"]);
    var url = "https://accounts.google.com/o/oauth2/revoke?token=" + token;
    fetch(url);

    chrome.identity.removeCachedAuthToken({ token: token });
    chrome.storage.local.set({ token: false });
};

const handleStopRecordingTabBackup = async (request) => {
    chrome.storage.local.set({
        recording: false,
        restarting: false,
        tabRecordedID: null,
        memoryError: true,
    });
    sendMessageRecord({ type: "stop-recording-tab" });

    // Get active tab
    const { activeTab } = await chrome.storage.local.get(["activeTab"]);
    // Check if actual tab
    sendMessageTab(activeTab, { type: "stop-pending" });
    focusTab(activeTab);
};

const clearAllRecordings = async () => {
    chunksStore.clear();
};

const resizeWindow = async (width, height) => {
    if (width === 0 || height === 0) {
        return;
    }

    chrome.windows.getCurrent((window) => {
        chrome.windows.update(window.id, {
            width: width,
            height: height,
        });
    });
};

const checkAvailableMemory = (sendResponse) => {
    navigator.storage.estimate().then((data) => {
        sendResponse({ data: data });
    });
};

// Add this function to handle sign out from GoDAM
const handleSignOutGoDAM = async () => {
    const { godamToken } = await chrome.storage.local.get(["godamToken"]);
    if (godamToken) {
        // Revoke token on the server
        const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';

        try {

            await fetch(`${baseUrl}/api/method/frappe.integrations.oauth2.revoke_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                credentials: 'omit',
                body: new URLSearchParams({
                    token: godamToken
                }),
            });
        } catch (error) {
            console.error("Error revoking GoDAM token:", error);
        }
    }

    // Clear token from storage
    chrome.storage.local.set({
        godamToken: null,
        godamRefreshToken: null,
        godamTokenExpiration: null
    });
};

// Function to handle saving to GoDAM
const handleSaveToGoDAM = async (sendResponse, request, fallback = false) => {
    if (!fallback) {
        const blob = base64ToUint8Array(request.base64);

        // Specify the desired file name
        const fileName = request.title + ".mp4";

        // Call the saveToGoDAM function
        const saveToGoDAM = require('./modules/saveToGoDAM').default;
        saveToGoDAM(blob, fileName, sendResponse);
    } else {
        const chunks = [];
        await chunksStore.iterate((value, key) => {
            chunks.push(value);
        });

        // Build the video from chunks
        let array = [];
        let lastTimestamp = 0;
        for (const chunk of chunks) {
            // Check if chunk timestamp is smaller than last timestamp, if so, skip
            if (chunk.timestamp < lastTimestamp) {
                continue;
            }
            lastTimestamp = chunk.timestamp;
            array.push(chunk.chunk);
        }
        const blob = new Blob(array, { type: "video/webm" });

        const filename = request.title + ".webm";

        const saveToGoDAM = require('./modules/saveToGoDAM').default;
        saveToGoDAM(blob, filename, sendResponse);
    }
};

const handleSignInGoDAM = async (sendResponse) => {
    const signInGoDAM = require('./modules/signInGoDAM').default;

    const token = await signInGoDAM();

    if (token) {
        sendResponse({ status: "ok", token: token });
    } else {
        sendResponse({ status: "error", message: "Failed to sign in to GoDAM" });
    }
};

const refreshToken = async (sendResponse) => {
    const { godamRefreshToken } = await chrome.storage.local.get(["godamRefreshToken", "code", "redirectUrl"]);

    const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
    const clientId = process.env.GODAM_OAUTH_CLIENT_ID || 'habg22ul6k';

    try {
        const refreshResponse = await fetch(`${baseUrl}/api/method/frappe.integrations.oauth2.get_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            credentials: 'omit',
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: godamRefreshToken,
                client_id: clientId,
            }),
        });


        const tokenData = await refreshResponse.json();

        const newToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in || 3600;
        const expirationTime = Date.now() + expiresIn * 1000;

        await chrome.storage.local.set({
            godamToken: newToken,
            godamRefreshToken: tokenData.refresh_token || godamRefreshToken,
            godamTokenExpiration: expirationTime
        })
        sendResponse(newToken)
    } catch (error) {
        const signInGoDAM = require('./modules/signInGoDAM').default;
        // If refresh fails, try to sign in again
        const newToken = await signInGoDAM();
        if (!newToken) {
            console.error("GoDAM token refresh and sign-in failed");
        }
        sendResponse(newToken)
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "desktop-capture") {
        desktopCapture(request);
    } else if (request.type === "backup-created") {
        offscreenDocument(request.request, request.tabId);
    } else if (request.type === "write-file") {
        writeFile(request);
    } else if (request.type === "handle-restart") {
        handleRestart();
    } else if (request.type === "handle-dismiss") {
        handleDismiss();
    } else if (request.type === "reset-active-tab") {
        resetActiveTab();
    } else if (request.type === "reset-active-tab-restart") {
        resetActiveTabRestart();
    } else if (request.type === "start-rec") {
        startRecording();
    } else if (request.type === "video-ready") {
        videoReady();
    } else if (request.type === "start-recording") {
        startRecording();
    } else if (request.type === "restarted") {
        restartActiveTab();
    } else if (request.type === "new-chunk") {
        newChunk(request);
        return true;
    } else if (request.type === "get-streaming-data") {
        handleGetStreamingData();
    } else if (request.type === "cancel-recording") {
        cancelRecording();
    } else if (request.type === "stop-recording-tab") {
        handleStopRecordingTab(request);
    } else if (request.type === "restart-recording-tab") {
        handleRestartRecordingTab();
    } else if (request.type === "dismiss-recording-tab") {
        handleDismissRecordingTab();
    } else if (request.type === "pause-recording-tab") {
        sendMessageRecord({ type: "pause-recording-tab" });
    } else if (request.type === "resume-recording-tab") {
        sendMessageRecord({ type: "resume-recording-tab" });
    } else if (request.type === "set-mic-active-tab") {
        setMicActiveTab(request);
    } else if (request.type === "recording-error") {
        handleRecordingError(request);
    } else if (request.type === "on-get-permissions") {
        handleOnGetPermissions(request);
    } else if (request.type === "recording-complete") {
        handleRecordingComplete();
    } else if (request.type === "check-recording") {
        checkRecording();
    } else if (request.type === "review-screenity") {
        createTab(
            "https://chrome.google.com/webstore/detail/screenity-screen-recorder/kbbdabhdfibnancpjfhlkhafgdilcnji/reviews",
            false,
            true
        );
    } else if (request.type === "open-processing-info") {
        createTab(
            "https://godam.io/docs/godam-screen-recorder/",
            true,
            true
        );
    } else if (request.type === "upgrade-info") {
        createTab(
            "https://godam.io/docs/godam-screen-recorder/",
            true,
            true
        );
    } else if (request.type === "trim-info") {
        createTab(
            "https://godam.io/docs/godam-screen-recorder/",
            true,
            true
        );
    } else if (request.type === "chrome-update-info") {
        createTab(
            "https://godam.io/docs/godam-screen-recorder/",
            true,
            true
        );
    } else if (request.type === "set-surface") {
        setSurface(request);
    } else if (request.type === "pip-ended") {
        handlePip(false);
    } else if (request.type === "pip-started") {
        handlePip(true);
    } else if (request.type === "new-sandbox-page-restart") {
        newSandboxPageRestart();
    } else if (request.type === "sign-out-drive") {
        handleSignOutDrive();
    } else if (request.type === "open-help") {
        createTab("https://godam.io/docs/godam-screen-recorder/", true, true);
    } else if (request.type === "memory-limit-help") {
        createTab(
            "https://godam.io/docs/godam-screen-recorder/",
            true,
            true
        );
    } else if (request.type === "open-home") {
        createTab("https://godam.io/features/godam-screen-recorder/", false, true);
    } else if (request.type === "report-bug") {
        createTab(
            "https://app.godam.io/helpdesk/my-tickets",
            false,
            true
        );
    } else if (request.type === "clear-recordings") {
        clearAllRecordings();
    } else if (request.type === "force-processing") {
        forceProcessing();
    } else if (request.type === "focus-this-tab") {
        focusTab(sender.tab.id);
    } else if (request.type === "stop-recording-tab-backup") {
        handleStopRecordingTabBackup(request);
    } else if (request.type === "indexed-db-download") {
        downloadIndexedDB();
    } else if (request.type === "get-platform-info") {
        getPlatformInfo(sendResponse);
        return true;
    } else if (request.type === "restore-recording") {
        restoreRecording();
    } else if (request.type === "check-restore") {
        checkRestore(sendResponse);
        return true;
    } else if (request.type === "check-capture-permissions") {
        chrome.permissions.contains(
            {
                permissions: ["desktopCapture", "alarms", "offscreen"],
            },
            (result) => {
                if (!result) {
                    chrome.permissions.request(
                        {
                            permissions: ["desktopCapture", "alarms", "offscreen"],
                        },
                        (granted) => {
                            if (!granted) {
                                sendResponse({ status: "error" });
                            } else {
                                addAlarmListener();
                                sendResponse({ status: "ok" });
                            }
                        }
                    );
                } else {
                    sendResponse({ status: "ok" });
                }
            }
        );
        return true;
    } else if (request.type === "is-pinned") {
        isPinned(sendResponse);
        return true;
    } else if (request.type === "save-to-drive") {
        handleSaveToDrive(sendResponse, request, false);
        return true;
    } else if (request.type === "save-to-drive-fallback") {
        handleSaveToDrive(sendResponse, request, true);
        return true;
    } else if (request.type === "request-download") {
        requestDownload(request.base64, request.title);
    } else if (request.type === "resize-window") {
        resizeWindow(request.width, request.height);
    } else if (request.type === "available-memory") {
        checkAvailableMemory(sendResponse);
        return true;
    } else if (request.type === "extension-media-permissions") {
        createTab(
            "chrome://settings/content/siteDetails?site=chrome-extension://" +
            chrome.runtime.id,
            false,
            true
        );
    } else if (request.type === "add-alarm-listener") {
        addAlarmListener();
    } else if (request.type === "sign-in-godam") {
        handleSignInGoDAM(sendResponse);
        return true;
    } else if (request.type === "refresh-godam-token") {
        refreshToken(sendResponse);
        return true;
    } else if (request.type === "save-to-godam-fallback") {
        handleSaveToGoDAM(sendResponse, request, true);
        return true;
    } else if (request.type === "sign-out-godam") {
        handleSignOutGoDAM(sendResponse);
        return true;
    } else if (request.type === "set-organizations") {
        const setOrgs = require('./modules/setOrgList').default;
        setOrgs();
        return true;
    }
});

// Listen for cookie changes on https://app.godam.io domain and logout from extension if user logout from application.
chrome.cookies.onChanged.addListener(async (changeInfo) => {
    const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
    const domain = new URL(baseUrl).hostname; // Extract the domain part

    const { cookie } = changeInfo;

    if (!cookie.domain.includes(domain)) return;

    if ( (cookie.name === "sid" || cookie.name === "user_id") && cookie.value === "Guest"  ) {
        await chrome.storage.local.remove(["godamToken", "godamRefreshToken", "godamTokenExpiration"]);
    }
});
