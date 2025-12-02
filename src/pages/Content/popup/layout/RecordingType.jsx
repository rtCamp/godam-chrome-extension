import React, { useEffect, useContext, useState, useRef } from "react";

import Dropdown from "../components/Dropdown";
import Switch from "../components/Switch";
import RegionDimensions from "../components/RegionDimensions";
import Settings from "./Settings";
import { contentStateContext } from "../../context/ContentState";
import { CameraOffBlue, MicOffBlue } from "../../images/popup/images";

import BackgroundEffects from "../components/BackgroundEffects";

import { AlertIcon, TimeIcon, NoInternet } from "../../toolbar/components/SVG";

const RecordingType = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const [cropActive, setCropActive] = useState(false);
  const [time, setTime] = useState(0);
  const [URL, setURL] = useState(
    "https://godam.io/docs/godam-screen-recorder/"
  );
  const [URL2, setURL2] = useState(
    "https://godam.io/docs/godam-screen-recorder/"
  );

  const buttonRef = useRef(null);
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  useEffect(() => {
    const locale = chrome.i18n.getMessage("@@ui_locale");
    if (!locale.includes("en")) {
      setURL(
        `https://translate.google.com/translate?sl=en&tl=${locale}&u=https://godam.io/docs/godam-screen-recorder/`
      );
      setURL2(
        `https://translate.google.com/translate?sl=en&tl=${locale}&u=https://godam.io/docs/godam-screen-recorder/`
      );
    }
  }, []);

  useEffect(() => {
    // Convert seconds to mm:ss
    let minutes = Math.floor(contentState.alarmTime / 60);
    let seconds = contentState.alarmTime - minutes * 60;
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    setTime(minutes + ":" + seconds);
  }, []);

  useEffect(() => {
    // Convert seconds to mm:ss
    let minutes = Math.floor(contentState.alarmTime / 60);
    let seconds = contentState.alarmTime - minutes * 60;
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    setTime(minutes + ":" + seconds);
  }, [contentState.alarmTime]);

  // Start recording
  const startStreaming = () => {
    contentState.startStreaming();
  };
  const setTeleprompter = (updates) => {
    setContentState((prev) => ({ ...prev, ...updates }));
    chrome.storage.local.set(updates);
  };

  useEffect(() => {
    // Check if CropTarget is null
    if (typeof CropTarget === "undefined") {
      setCropActive(false);
      setContentState((prevContentState) => ({
        ...prevContentState,
        customRegion: false,
      }));
    } else {
      setCropActive(true);
    }
  }, []);

  useEffect(() => {
    if (contentState.recording) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        pendingRecording: false,
      }));
    }
  }, [contentState.recording]);

  return (
    <div>
      {contentState.updateChrome && (
        <div className="popup-warning">
          <div className="popup-warning-left">
            <AlertIcon />
          </div>
          <div className="popup-warning-middle">
            <div className="popup-warning-title">
              {chrome.i18n.getMessage("customAreaRecordingDisabledTitle")}
            </div>
            <div className="popup-warning-description">
              {chrome.i18n.getMessage("customAreaRecordingDisabledDescription")}
            </div>
          </div>
          <div className="popup-warning-right">
            <a href={URL} target="_blank">
              {chrome.i18n.getMessage("customAreaRecordingDisabledAction")}
            </a>
          </div>
        </div>
      )}
      {/*contentState.offline && (
        <div className="popup-warning">
          <div className="popup-warning-left">
            <NoInternet />
          </div>
          <div className="popup-warning-middle">
            <div className="popup-warning-title">You are currently offline</div>
            <div className="popup-warning-description">
              Some features are unavailable
            </div>
          </div>
          <div className="popup-warning-right">
            <a href="#">Try again</a>
          </div>
        </div>
			)*/}
      {!cropActive &&
        contentState.recordingType === "region" &&
        !contentState.offline && (
          <div className="popup-warning">
            <div className="popup-warning-left">
              <AlertIcon />
            </div>
            <div className="popup-warning-middle">
              <div className="popup-warning-title">
                {chrome.i18n.getMessage("customAreaRecordingDisabledTitle")}
              </div>
              <div className="popup-warning-description">
                {chrome.i18n.getMessage(
                  "customAreaRecordingDisabledDescription"
                )}
              </div>
            </div>
            <div className="popup-warning-right">
              <a
                href="https://support.google.com/chrome/answer/95414?hl=en-GB&co=GENIE.Platform%3DDesktop"
                target="_blank"
              >
                {chrome.i18n.getMessage("customAreaRecordingDisabledAction")}
              </a>
            </div>
          </div>
        )}
      {!contentState.cameraPermission && (
        <button
          className="permission-button"
          onClick={() => {
            if (typeof contentState.openModal === "function") {
              contentState.openModal(
                chrome.i18n.getMessage("permissionsModalTitle"),
                chrome.i18n.getMessage("permissionsModalDescription"),
                chrome.i18n.getMessage("permissionsModalReview"),
                chrome.i18n.getMessage("permissionsModalDismiss"),
                () => {
                  chrome.runtime.sendMessage({
                    type: "extension-media-permissions",
                  });
                },
                () => {},
                chrome.runtime.getURL("assets/helper/permissions.png"),
                chrome.i18n.getMessage("learnMoreDot"),
                URL2,
                true,
                false
              );
            }
          }}
        >
          <img src={CameraOffBlue} />
          <span>{chrome.i18n.getMessage("allowCameraAccessButton")}</span>
        </button>
      )}
      {contentState.cameraPermission && (
        <Dropdown type="camera" shadowRef={props.shadowRef} />
      )}
      {contentState.cameraPermission &&
        contentState.defaultVideoInput != "none" &&
        contentState.cameraActive && (
          <div>
            <Switch
              label={chrome.i18n.getMessage("flipCameraLabel")}
              name="flip-camera"
              value="cameraFlipped"
            />
            <Switch
              label={chrome.i18n.getMessage("backgroundEffectsLabel")}
              name="background-effects-active"
              value="backgroundEffectsActive"
            />
            {contentState.backgroundEffectsActive && <BackgroundEffects />}
          </div>
        )}

      {!contentState.microphonePermission && (
        <button
          className="permission-button"
          onClick={() => {
            if (typeof contentState.openModal === "function") {
              contentState.openModal(
                chrome.i18n.getMessage("permissionsModalTitle"),
                chrome.i18n.getMessage("permissionsModalDescription"),
                chrome.i18n.getMessage("permissionsModalReview"),
                chrome.i18n.getMessage("permissionsModalDismiss"),
                () => {
                  chrome.runtime.sendMessage({
                    type: "extension-media-permissions",
                  });
                },
                () => {},
                chrome.runtime.getURL("assets/helper/permissions.png"),
                chrome.i18n.getMessage("learnMoreDot"),
                URL2,
                true,
                false
              );
            }
          }}
        >
          <img src={MicOffBlue} />
          <span>{chrome.i18n.getMessage("allowMicrophoneAccessButton")}</span>
        </button>
      )}
      {contentState.microphonePermission && (
        <Dropdown type="mic" shadowRef={props.shadowRef} />
      )}
      {((contentState.microphonePermission &&
        contentState.defaultAudioInput != "none" &&
        contentState.micActive) ||
        (contentState.microphonePermission && contentState.pushToTalk)) && (
        <div>
          <iframe
            style={{
              width: "100%",
              height: "30px",
              zIndex: 9999999999,
              position: "relative",
            }}
            allow="camera; microphone"
            src={chrome.runtime.getURL("waveform.html")}
          ></iframe>
          <Switch
            label={
              isMac
                ? chrome.i18n.getMessage("pushToTalkLabel") + " (⌥⇧U)"
                : chrome.i18n.getMessage("pushToTalkLabel") + " (Alt⇧U)"
            }
            name="pushToTalk"
            value="pushToTalk"
          />
        </div>
      )}
      {contentState.recordingType === "region" && cropActive && (
        <div>
          <div className="popup-content-divider"></div>
          <Switch
            label={chrome.i18n.getMessage("customAreaLabel")}
            name="customRegion"
            value="customRegion"
          />
          {contentState.customRegion && <RegionDimensions />}
        </div>
      )}
      <div className="popup-content-divider"></div>
      <div>
        <Switch
          label={"Teleprompter"}
          name="teleprompterEnabled"
          value="teleprompterEnabled"
        />
        {contentState.teleprompterEnabled && (
          <div>
            <div className="popup-field">
              <label style={{ display: "block", marginBottom: 6 }}>
                Script
              </label>
              <textarea
                style={{ width: "100%", minHeight: 90 }}
                placeholder="Paste or write your script here..."
                value={contentState.teleprompterText}
                onChange={(e) =>
                  setTeleprompter({ teleprompterText: e.target.value })
                }
              />
            </div>
            <div className="popup-field">
              <label>
                Speed
                <span style={{ opacity: 0.6, marginLeft: 8 }}>
                  {contentState.teleprompterSpeed}
                </span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={contentState.teleprompterSpeed}
                onChange={(e) =>
                  setTeleprompter({ teleprompterSpeed: Number(e.target.value) })
                }
              />
            </div>
            <div className="popup-field">
              <label>
                Font size
                <span style={{ opacity: 0.6, marginLeft: 8 }}>
                  {contentState.teleprompterFontSize}px
                </span>
              </label>
              <input
                type="range"
                min={16}
                max={48}
                step={1}
                value={contentState.teleprompterFontSize}
                onChange={(e) =>
                  setTeleprompter({ teleprompterFontSize: Number(e.target.value) })
                }
              />
            </div>
            <div className="popup-field">
              <label style={{ display: "block", marginBottom: 6 }}>
                Position
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={
                    contentState.teleprompterPosition === "top"
                      ? "button-secondary active"
                      : "button-secondary"
                  }
                  onClick={() => setTeleprompter({ teleprompterPosition: "top" })}
                >
                  Top
                </button>
                <button
                  className={
                    contentState.teleprompterPosition === "bottom"
                      ? "button-secondary active"
                      : "button-secondary"
                  }
                  onClick={() => setTeleprompter({ teleprompterPosition: "bottom" })}
                >
                  Bottom
                </button>
              </div>
            </div>
            <div className="popup-field">
              <label>
                Width
                <span style={{ opacity: 0.6, marginLeft: 8 }}>
                  {contentState.teleprompterWidth}px
                </span>
              </label>
              <input
                type="range"
                min={400}
                max={1000}
                step={10}
                value={contentState.teleprompterWidth}
                onChange={(e) =>
                  setTeleprompter({ teleprompterWidth: Number(e.target.value) })
                }
              />
            </div>
            <div className="popup-field">
              <label>
                Opacity
                <span style={{ opacity: 0.6, marginLeft: 8 }}>
                  {Math.round(contentState.teleprompterOpacity * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.05}
                value={contentState.teleprompterOpacity}
                onChange={(e) =>
                  setTeleprompter({ teleprompterOpacity: Number(e.target.value) })
                }
              />
            </div>
          </div>
        )}
      </div>
      <button
        role="button"
        className="main-button recording-button"
        ref={buttonRef}
        tabIndex="0"
        onClick={startStreaming}
        disabled={
          contentState.pendingRecording ||
          ((!contentState.cameraPermission || !contentState.cameraActive) &&
            contentState.recordingType === "camera")
        }
      >
        {contentState.alarm && contentState.alarmTime > 0 && (
          <div className="alarm-time-button">
            <TimeIcon />
            {time}
          </div>
        )}
        <span className="main-button-label">
          {contentState.pendingRecording
            ? chrome.i18n.getMessage("recordButtonInProgressLabel")
            : (!contentState.cameraPermission || !contentState.cameraActive) &&
              contentState.recordingType === "camera"
            ? chrome.i18n.getMessage("recordButtonNoCameraLabel")
            : chrome.i18n.getMessage("recordButtonLabel")}
        </span>
        <span className="main-button-shortcut">
          {contentState.recordingShortcut}
        </span>
      </button>
      <Settings />
    </div>
  );
};

export default RecordingType;
