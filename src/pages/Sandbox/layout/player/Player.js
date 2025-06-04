import React, { useContext, useState, useEffect } from "react";

// Components
import PlayerNav from "./PlayerNav";
import CropNav from "../editor/CropNav";
import AudioNav from "../editor/AudioNav";
import RightPanel from "./RightPanel";
import Content from "./Content";

import styles from "../../styles/player/_Player.module.scss";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const Player = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveToGoDAM = () => {

    if (contentState.noffmpeg || !contentState.mp4ready || !contentState.blob) {
      chrome.runtime
        .sendMessage({
          type: "save-to-godam-fallback",
          title: contentState.title,
        })
        .then((response) => {
          // Cancel saving to GoDAM
          if (response.status === "ok") {
            chrome.tabs.getCurrent((tab) => {
              chrome.tabs.update(tab.id, { url: response.url });
            });
          } else {
            setError(response.message || "An error occurred while saving to GoDAM");
          }
          setIsSaving(false);
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
              // Close the current tab and open the GoDAM URL
              chrome.tabs.getCurrent((tab) => {
                chrome.tabs.update(tab.id, { url: response.url });
              });
            } else {
              setError(response.message || "An error occurred while saving to GoDAM");
            }
            setIsSaving(false);
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


  useEffect(() => {
    if (!isSaving) {
      setIsSaving(true);
      saveToGoDAM();
    }
  }, []);

  return (
    <div className={styles.layout}>
      {/* {contentState.mode === "crop" && <CropNav />} */}
      {contentState.mode === "player" && <PlayerNav />}
      {/* {contentState.mode === "audio" && <AudioNav />} */}
      <div className={styles.content}>

        <div className={styles.leftPanel}>
          {isSaving && (
            <div className={styles.saving}>
              <div className={styles.savingSpinner}></div>
              <p className={styles.savingText}>Hold tight! We're setting up your video...</p>
            </div>
          )}
          {
            error && (
              <div className={styles.error}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                </svg>
                <p dangerouslySetInnerHTML={{ __html: error }}></p>
              </div>
            )
          }

          <Content />
        </div>

          {
            error && (
              <RightPanel />
            )
          }
      </div>
    </div>
  );
};

export default Player;
