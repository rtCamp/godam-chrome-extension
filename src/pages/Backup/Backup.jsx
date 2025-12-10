import React, { useState, useEffect, useRef } from "react";

import localforage from "localforage";

// Import styles raw to inject into DOM
import backupStyles from "!raw-loader!sass-loader!./styles/_Backup.scss";

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

const Backup = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const writable = useRef(null);
  const request = useRef(null);
  const tabId = useRef(null);
  const repeatRef = useRef(0);
  const [backupAgain, setBackupAgain] = useState(false);
  const backupRef = useRef(false);
  const writingFile = useRef(false);
  const titleRef = useRef(null);
  const [override, setOverride] = useState(false);
  const waitWrite = useRef(false);
  const closeRequest = useRef(false);

  useEffect(() => {
    backupRef.current = backupAgain;
  }, [backupAgain]);

  const verifyFilePermissions = async (fileHandle) => {
    const opts = {
      mode: "readwrite",
    };
    const permission = await fileHandle.queryPermission(opts);
    if (permission === "granted") {
      return true;
    } else if (permission === "prompt") {
      chrome.runtime.sendMessage({ type: "focus-this-tab" });
      return false;
    } else if ((await fileHandle.requestPermission(opts)) === "granted") {
      chrome.runtime.sendMessage({ type: "focus-this-tab" });
      return true;
    } else {
      return false;
    }
  };

  const initLocalDirectory = async (directoryHandle, prompt = true) => {
    const permissions = await verifyFilePermissions(directoryHandle);
    if (permissions) {
      let videoTitle = `GoDAM video - ${new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      })}.webm`;

      videoTitle = videoTitle.replace(/:/g, "-");

      titleRef.current = videoTitle;

      const fileHandle = await directoryHandle.getFileHandle(videoTitle, {
        create: true,
      });
      writable.current = await fileHandle.createWritable();

      setSetupComplete(true);
      setBackupAgain(true);
      if (prompt) {
        chrome.storage.local.set({ backupSetup: true }).then(() => {
          chrome.runtime.sendMessage({
            type: "backup-created",
            request: request.current,
            tabId: tabId.current,
          });
        });
      }
      writingFile.current = true;
    } else if (repeatRef.current < 3) {
      chrome.runtime.sendMessage({ type: "focus-this-tab" });
      repeatRef.current = repeatRef.current + 1;
      localDirectoryStore.clear();

      localSaving(prompt);
    } else {
      alert(
        "Failed to set up local backup. Reach out to us at https://app.godam.io/helpdesk/my-tickets for more help. You can still record your screen."
      );
      chrome.storage.local.set({ backup: false });
      chrome.runtime.sendMessage({
        type: "backup-created",
        request: request.current,
        tabId: tabId.current,
      });
      setOverride(true);
      window.close();
    }
  };

  const directoryPicker = async (prompt = true) => {
    chrome.runtime.sendMessage({ type: "focus-this-tab" });
    let directoryPicker = null;
    // Request access to create a file in a user-selected directory
    try {
      directoryPicker = await window.showDirectoryPicker({
        startIn: "videos",
        mode: "readwrite",
      });
    } catch (err) {
      if (backupRef.current) {
        chrome.runtime.sendMessage({
          type: "recording-error",
          error: "backup-error",
          why: JSON.stringify(err),
        });
      }
      return;
    }
    // check if user cancelled the prompt
    if (!directoryPicker) {
      if (backupRef.current) {
        chrome.runtime.sendMessage({
          type: "recording-error",
          error: "backup-error",
          why: JSON.stringify(err),
        });
      }
      return;
    }

    let directoryHandle = directoryPicker;

    // Check if the selected directory is the "GoDAM recordings" folder
    if (directoryPicker.name === "GoDAM Recordings") {
      // Use the selected directory directly
      directoryHandle = directoryPicker;
    } else {
      // If not, create the "GoDAM recordings" folder within it
      directoryHandle = await directoryPicker.getDirectoryHandle(
        "GoDAM Recordings",
        { create: true }
      );
    }

    await localDirectoryStore.clear();
    await localDirectoryStore.setItem("directoryHandle", directoryHandle);

    initLocalDirectory(directoryHandle, prompt);
  };

  const localSaving = async (prompt = true) => {
    waitWrite.current = false;
    closeRequest.current = false;
    // Check if user gesture has happened with UserActivation API
    if (!navigator.userActivation.isActive) {
      chrome.runtime.sendMessage({ type: "focus-this-tab" });
      return;
    }

    if (!backupRef.current) {
      localDirectoryStore.clear();
    }

    // Check if the FileSystem API is available
    if ("showDirectoryPicker" in window) {
      localDirectoryStore.getItem("directoryHandle").then(async (directory) => {
        if (directory) {
          try {
            const permissions = await verifyFilePermissions(
              directory.directoryHandle
            );
            if (!permissions) {
              directoryPicker(prompt);
            } else {
              initLocalDirectory(directory.directoryHandle, prompt);
            }
          } catch (e) {
            localDirectoryStore.clear();
            directoryPicker(prompt);
          }
        } else {
          directoryPicker(prompt);
        }
      });
    } else {
      alert(
        "Your browser doesn't support local backups. Reach out to us at https://app.godam.io/helpdesk/my-tickets for more help. You can still record your screen."
      );
      chrome.storage.local.set({ backup: false });
      chrome.runtime.sendMessage({
        type: "backup-created",
        request: request.current,
        tabId: tabId.current,
      });
      setOverride(true);
      window.close();
    }
  };

  const writeFile = async (index) => {
    if (!writable.current) return;
    if (!writingFile.current) return;
    waitWrite.current = true;
    try {
      const chunks = [];
      chunksStore
        .iterate((value, key, iterationNumber) => {
          chunks.push(value);
        })
        .then(async () => {
          if (chunks && chunks.length > 0) {
            const chunk = chunks.find((chunk) => chunk.index === index);

            if (chunk) {
              await writable.current.write(chunk.chunk);
              waitWrite.current = false;
              if (closeRequest.current) {
                closeRequest.current = false;
                writable.current.close();
              }
            } else {
              waitWrite.current = false;
              if (closeRequest.current) {
                closeRequest.current = false;
                writable.current.close();
              }
            }
          }
        });
    } catch {
      waitWrite.current = false;
      if (closeRequest.current) {
        closeRequest.current = false;
        writable.current.close();
      }
      chrome.storage.local.set({
        recording: false,
        restarting: false,
        tabRecordedID: null,
        memoryError: true,
      });
      chrome.runtime.sendMessage({ type: "stop-recording-tab" });
    }
  };

  // Delete the latest file saved in the local backup folder
  const deleteFile = async (restart = null) => {
    if (writingFile.current) {
      await writable.current.close();
      writingFile.current = false;

      const directory = await localDirectoryStore.getItem("directoryHandle");
      if (directory && directory !== null) {
        const permissions = await verifyFilePermissions(
          directory.directoryHandle
        );
        if (permissions) {
          await directory.directoryHandle.removeEntry(titleRef.current);
          if (restart) {
            localSaving(false);
          }
        } else if (restart) {
          localSaving(false);
        }
      }
    } else if (restart) {
      localSaving(false);
    }
  };

  const skipBackup = () => {
    chrome.storage.local.set({ backup: false });
    chrome.runtime.sendMessage({
      type: "backup-created",
      request: request.current,
      tabId: tabId.current,
    });
    setOverride(true);
    window.close();
  };

  const stopBackup = () => {
    chrome.storage.local.set({ backup: false });
    chrome.runtime.sendMessage({
      type: "stop-recording-tab-backup",
    });
    setOverride(true);
    window.close();
  };

  const checkBackupSetup = async () => {
    const { backupSetup } = await chrome.storage.local.get("backupSetup");
    if (backupSetup) {
      setBackupAgain(true);
    }
  };

  useEffect(() => {
    checkBackupSetup();
  }, []);

  const onMessage = (message, sender, sendResponse) => {
    if (message.type === "init-backup") {
      request.current = message.request;
      tabId.current = message.tabId;
      localSaving(true);
    } else if (message.type === "write-file") {
      writeFile(message.index);
    } else if (message.type === "close-writable") {
      if (!waitWrite.current) {
        writable.current.close();
      } else {
        closeRequest.current = true;
      }
    } else if (
      message.type === "discard-backup" ||
      message.type === "recording-error"
    ) {
      deleteFile(false);
    } else if (message.type === "discard-backup-restart") {
      deleteFile(true);
    } else if (message.type === "close-backup-tab") {
      setOverride(true);
      window.close();
    }
  };
  const closeTab = () => {
    chrome.runtime.sendMessage({
      type: "stop-recording-tab-backup",
    });
    setOverride(true);
    window.close();
  };

  useEffect(() => {
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return (
    <div className="setupBackground">
      {!setupComplete && !backupAgain && (
        <div className="setupContainer">
          <div className="setupImage">
            <img src={chrome.runtime.getURL("assets/helper/backup.png")} />
          </div>
          <div className="setupText">
            <div className="setupEmoji">💾</div>
            <div className="setupTitle">
              {chrome.i18n.getMessage("backupsTitle")}
            </div>
            <div className="setupDescription">
              {chrome.i18n.getMessage("backupsDescription1")}
              <br />
              {chrome.i18n.getMessage("backupsDescription2")}{" "}
              <a
                href=" https://godam.io/features/godam-screen-recorder/"
                target="_blank"
              >
                {chrome.i18n.getMessage("learnMoreDot")}
              </a>
            </div>
            <div className="setupActions">
              <button
                className="setupButton"
                onClick={() => {
                  localSaving(true);
                }}
              >
                {chrome.i18n.getMessage("backupsSelectFolder")}
              </button>
              <button
                className="cancelButton"
                onClick={() => {
                  skipBackup();
                }}
              >
                {chrome.i18n.getMessage("backupsNotNow")}
              </button>
            </div>
          </div>
        </div>
      )}
      {setupComplete && (
        <div>
          <div className="middle-area">
            <img src={chrome.runtime.getURL("assets/backup-icon.svg")} />
            <div className="title">
              {chrome.i18n.getMessage("backupsOnTitle")}
            </div>
            <div className="subtitle">
              {chrome.i18n.getMessage("backupsOnDescription")}
            </div>

            <div
              className="button-stop"
              onClick={() => {
                closeTab();
              }}
            >
              {chrome.i18n.getMessage("backupsClose")}
            </div>
            <div
              className="button-cancel"
              onClick={() => {
                stopBackup();
              }}
            >
              {chrome.i18n.getMessage("backupsStop")}
            </div>
          </div>
        </div>
      )}
      {backupAgain && !setupComplete && (
        <div>
          <div className="middle-area">
            <img src={chrome.runtime.getURL("assets/backup-icon.svg")} />
            <div className="title">
              {chrome.i18n.getMessage("backupsConfirmTitle")}
            </div>
            <div className="subtitle">
              {chrome.i18n.getMessage("backupsConfirmDescription")}{" "}
              <a
                href="https://godam.io/features/godam-screen-recorder/"
                target="_blank"
              >
                {chrome.i18n.getMessage("learnMoreDot")}
              </a>
            </div>

            <div
              className="button-strong"
              onClick={() => {
                localSaving(true);
              }}
            >
              {chrome.i18n.getMessage("backupsConfirmAllow")}
            </div>
            <div
              className="button-cancel"
              onClick={() => {
                stopBackup();
              }}
            >
              {chrome.i18n.getMessage("backupsStop")}
            </div>
          </div>
        </div>
      )}
      <div className="setupLogo">
        <img
          src={chrome.runtime.getURL("assets/logo-text.svg")}
        />
      </div>
      <style>
        {backupStyles.replace(
          "__PATTERN_SVG_URL__",
          chrome.runtime.getURL("assets/helper/pattern-svg.svg")
        )}
      </style>
    </div>
  );
};

export default Backup;
