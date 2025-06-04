import React, { useContext, useEffect, useState, useRef } from "react";
import styles from "../../styles/player/_RightPanel.module.scss";
import styless from "../../styles/player/_GoDAMModal.module.scss";

import JSZip from "jszip";

import { ReactSVG } from "react-svg";

const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";

// Components
import CropUI from "../editor/CropUI";
import AudioUI from "../editor/AudioUI";
import { GoDAMModal } from "./GoDAMModal";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const RightPanel = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const [webmFallback, setWebmFallback] = useState(false);
  const [videoModal, setVideoModal] = useState('');
  const contentStateRef = useRef(contentState);
  const consoleErrorRef = useRef([]);

  // Override console.error to catch errors from ffmpeg.wasm
  useEffect(() => {
    console.error = (error) => {
      consoleErrorRef.current.push(error);
    };
  }, []);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  const saveToGoDAM = () => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      saveGoDAM: true,
    }));

    if (contentState.noffmpeg || !contentState.mp4ready || !contentState.blob) {
      chrome.runtime
        .sendMessage({
          type: "save-to-godam-fallback",
          title: contentState.title,
        })
        .then((response) => {
          // Cancel saving to GoDAM
          if (response.status === "ok") {
            setContentState((prevContentState) => ({
              ...prevContentState,
              uploaded: true,
              videoUrl: response.url,
              success: true,
              saveGoDAM: false,
            }));
          } else {
            setContentState((prevContentState) => ({
              ...prevContentState,
              uploaded: false,
              videoUrl: '',
              error: response.error,
              saveGoDAM: false,
            }));
          }
          setVideoModal(true);
        });
    } else {
      // Blob to base64
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];

        chrome.runtime
          .sendMessage({
            type: "save-to-godam",
            base64: base64,
            title: contentState.title,
          })
          .then((response) => {
            // Cancel saving to GoDAM
            if (response.status === "ok") {
              setContentState((prevContentState) => ({
                ...prevContentState,
                uploaded: true,
                videoUrl: response.url,
                success: true,
                saveGoDAM: false,
              }));
            } else {
              setContentState((prevContentState) => ({
                ...prevContentState,
                error: false,
                videoUrl: '',
                error: response.error,
                saveGoDAM: false,
              }));
            }
            setVideoModal(true);
          });
      };
      if (
        !contentState.noffmpeg &&
        contentState.mp4ready &&
        contentState.blob
      ) {
        reader.readAsDataURL(contentState.blob);
      } else {
        reader.readAsDataURL(contentState.webm);
      }
    }
  };

  const signOutGoDAM = () => {
    chrome.runtime.sendMessage({ type: "sign-out-godam" });
    setContentState((prevContentState) => ({
      ...prevContentState,
      godamEnabled: false
    }));
  };

  const handleEdit = () => {
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return;
    if (!contentState.mp4ready) return;
    setContentState((prevContentState) => ({
      ...prevContentState,
      mode: "edit",
      dragInteracted: false,
    }));

    if (!contentState.hasBeenEdited) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        hasBeenEdited: true,
      }));
    }
  };

  const handleCrop = () => {
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return;
    if (!contentState.mp4ready) return;
    setContentState((prevContentState) => ({
      ...prevContentState,
      mode: "crop",
    }));

    if (!contentState.hasBeenEdited) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        hasBeenEdited: true,
      }));
    }
  };

  const handleAddAudio = async () => {
    if (
      contentState.duration > contentState.editLimit &&
      !contentState.override
    )
      return;
    if (!contentState.mp4ready) return;
    setContentState((prevContentState) => ({
      ...prevContentState,
      mode: "audio",
    }));

    if (!contentState.hasBeenEdited) {
      setContentState((prevContentState) => ({
        ...prevContentState,
        hasBeenEdited: true,
      }));
    }
  };

  const handleRawRecording = () => {
    if (typeof contentStateRef.current.openModal === "function") {
      contentStateRef.current.openModal(
        chrome.i18n.getMessage("rawRecordingModalTitle"),
        chrome.i18n.getMessage("rawRecordingModalDescription"),
        chrome.i18n.getMessage("rawRecordingModalButton"),
        chrome.i18n.getMessage("sandboxEditorCancelButton"),
        () => {
          const blob = contentStateRef.current.rawBlob;
          const url = window.URL.createObjectURL(blob);
          chrome.downloads.download(
            {
              url: url,
              filename: "raw-recording.webm",
            },
            () => {
              window.URL.revokeObjectURL(url);
            }
          );
        },
        () => {}
      );
    }
  };

  const handleTroubleshooting = () => {
    if (typeof contentStateRef.current.openModal === "function") {
      contentStateRef.current.openModal(
        chrome.i18n.getMessage("troubleshootModalTitle"),
        chrome.i18n.getMessage("troubleshootModalDescription"),
        chrome.i18n.getMessage("troubleshootModalButton"),
        chrome.i18n.getMessage("sandboxEditorCancelButton"),
        () => {
          // Need to create a file with the original data, any console logs, and system info
          const userAgent = navigator.userAgent;
          let platformInfo = {};
          chrome.runtime.getPlatformInfo(function (info) {
            platformInfo = info;
            const manifestInfo = chrome.runtime.getManifest().version;
            const blob = contentStateRef.current.rawBlob;

            // Now we need to create a file with all of this data
            const data = {
              userAgent: userAgent,
              platformInfo: platformInfo,
              manifestInfo: manifestInfo,
              contentState: contentStateRef.current,
            };
            // Create a zip file with the original recording and the data
            const zip = new JSZip();
            zip.file("recording.webm", blob);
            zip.file("troubleshooting.json", JSON.stringify(data));
            zip.generateAsync({ type: "blob" }).then(function (blob) {
              const url = window.URL.createObjectURL(blob);
              chrome.downloads.download(
                {
                  url: url,
                  filename: "troubleshooting.zip",
                },
                () => {
                  window.URL.revokeObjectURL(url);
                }
              );
            });
          });
        },
        () => {}
      );
    }
  };

  return (
    <div className={styles.panel}>
      {contentState.mode === "player" && (
        <div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {chrome.i18n.getMessage("sandboxExportTitle")}
            </div>
            <div className={styles.buttonWrap}>
              {contentState.fallback && (
                <div
                  role="button"
                  className={styles.button}
                  onClick={() => contentState.downloadWEBM()}
                  disabled={contentState.isFfmpegRunning}
                >
                  <div className={styles.buttonLeft}>
                    <ReactSVG src={URL + "editor/icons/download.svg"} />
                  </div>
                  <div className={styles.buttonMiddle}>
                    <div className={styles.buttonTitle}>
                      {contentState.downloadingWEBM
                        ? chrome.i18n.getMessage("downloadingLabel")
                        : chrome.i18n.getMessage("downloadWEBMButtonTitle")}
                    </div>
                    <div className={styles.buttonDescription}>
                      {chrome.i18n.getMessage("downloadWEBMButtonDescription")}
                    </div>
                  </div>
                  <div className={styles.buttonRight}>
                    <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                  </div>
                </div>
              )}
              <div
                role="button"
                className={styles.button}
                onClick={() => {
                  if (!contentState.mp4ready) return;
                  contentState.download();
                }}
                disabled={
                  contentState.isFfmpegRunning ||
                  contentState.noffmpeg ||
                  !contentState.mp4ready ||
                  contentState.noffmpeg
                }
              >
                <div className={styles.buttonLeft}>
                  <ReactSVG src={URL + "editor/icons/download.svg"} />
                </div>
                <div className={styles.buttonMiddle}>
                  <div className={styles.buttonTitle}>
                    {contentState.downloading
                      ? chrome.i18n.getMessage("downloadingLabel")
                      : chrome.i18n.getMessage("downloadMP4ButtonTitle")}
                  </div>
                  <div className={styles.buttonDescription}>
                    {contentState.offline && !contentState.ffmpegLoaded
                      ? chrome.i18n.getMessage("noConnectionLabel")
                      : contentState.updateChrome ||
                        contentState.noffmpeg ||
                        (contentState.duration > contentState.editLimit &&
                          !contentState.override)
                      ? chrome.i18n.getMessage("notAvailableLabel")
                      : contentState.mp4ready && !contentState.isFfmpegRunning
                      ? chrome.i18n.getMessage("downloadMP4ButtonDescription")
                      : chrome.i18n.getMessage("preparingLabel")}
                  </div>
                </div>
                <div className={styles.buttonRight}>
                  <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                </div>
              </div>
              {!contentState.fallback && (
                <div
                  role="button"
                  className={styles.button}
                  onClick={() => contentState.downloadWEBM()}
                  disabled={contentState.isFfmpegRunning}
                >
                  <div className={styles.buttonLeft}>
                    <ReactSVG src={URL + "editor/icons/download.svg"} />
                  </div>
                  <div className={styles.buttonMiddle}>
                    <div className={styles.buttonTitle}>
                      {contentState.downloadingWEBM
                        ? chrome.i18n.getMessage("downloadingLabel")
                        : chrome.i18n.getMessage("downloadWEBMButtonTitle")}
                    </div>
                    <div className={styles.buttonDescription}>
                      {!contentState.isFfmpegRunning
                        ? chrome.i18n.getMessage(
                            "downloadWEBMButtonDescription"
                          )
                        : chrome.i18n.getMessage("preparingLabel")}
                    </div>
                  </div>
                  <div className={styles.buttonRight}>
                    <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                  </div>
                </div>
              )}
              <div
                role="button"
                className={styles.button}
                onClick={() => {
                  if (!contentState.mp4ready) return;
                  contentState.downloadGIF();
                }}
                disabled={
                  contentState.isFfmpegRunning ||
                  contentState.duration > 30 ||
                  !contentState.mp4ready ||
                  contentState.noffmpeg
                }
              >
                <div className={styles.buttonLeft}>
                  <ReactSVG src={URL + "editor/icons/gif.svg"} />
                </div>
                <div className={styles.buttonMiddle}>
                  <div className={styles.buttonTitle}>
                    {contentState.downloadingGIF
                      ? chrome.i18n.getMessage("downloadingLabel")
                      : chrome.i18n.getMessage("downloadGIFButtonTitle")}
                  </div>
                  <div className={styles.buttonDescription}>
                    {contentState.offline && !contentState.ffmpegLoaded
                      ? chrome.i18n.getMessage("noConnectionLabel")
                      : contentState.updateChrome ||
                        contentState.noffmpeg ||
                        (contentState.duration > contentState.editLimit &&
                          !contentState.override)
                      ? chrome.i18n.getMessage("notAvailableLabel")
                      : contentState.mp4ready
                      ? chrome.i18n.getMessage("downloadGIFButtonDescription")
                      : chrome.i18n.getMessage("preparingLabel")}
                  </div>
                </div>
                <div className={styles.buttonRight}>
                  <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
