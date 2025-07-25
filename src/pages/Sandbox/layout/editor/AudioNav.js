import React, { useContext } from "react";
import styles from "../../styles/edit/_EditorNav.module.scss";
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const URL = "/assets/";

const AudioNav = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context

  const handleCancel = () => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      mode: "player",
      blob: contentState.originalBlob,
      start: 0,
      end: 1,
      width: contentState.prevWidth,
      height: contentState.prevHeight,
      left: 0,
      top: 0,
      fromCropper: false,
    }));
  };

  const handleRevert = () => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      blob: contentState.originalBlob,
      start: 0,
      end: 1,
    }));
  };

  const saveChanges = async () => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      mode: "player",
      start: 0,
      end: 1,
    }));
  };

  return (
    <div className={styles.editorNav}>
      <div className={styles.navWrap}>
        <div
          className={styles.editorNavLeft}
          onClick={() => {
            chrome.runtime.sendMessage({ type: "open-home" });
          }}
        >
          <div className={styles.godamLogo}>
            <img src={URL + "editor/godam-logo.png"} alt="GoDAM Logo" />
          </div>
        </div>
        <div className={styles.editorNavCenter}>
          <div className={styles.editorNavTitle}>
            {chrome.i18n.getMessage("sandboxEditorMainTitle") + " "}{" "}
            <span className={styles.beta}>BETA</span>
          </div>
        </div>
        <div className={styles.editorNavRight}>
          <button
            className="button simpleButton blackButton"
            onClick={handleCancel}
            disabled={contentState.isFfmpegRunning}
          >
            {chrome.i18n.getMessage("sandboxEditorCancelButton")}
          </button>
          <button
            className="button secondaryButton"
            onClick={handleRevert}
            disabled={contentState.isFfmpegRunning}
          >
            {chrome.i18n.getMessage("sandboxEditorRevertButton")}
          </button>
          <button
            className="button primaryButton"
            onClick={saveChanges}
            disabled={contentState.isFfmpegRunning}
          >
            {contentState.cropping
              ? chrome.i18n.getMessage("sandboxEditorSaveProgressButton")
              : chrome.i18n.getMessage("sandboxEditorSaveButton")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioNav;
