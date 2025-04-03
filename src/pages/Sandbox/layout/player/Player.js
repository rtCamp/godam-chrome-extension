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

  const saveToGoDAM = () => {

    if (contentState.noffmpeg || !contentState.mp4ready || !contentState.blob) {
      chrome.runtime
        .sendMessage({
          type: "save-to-godam-fallback",
          title: contentState.title,
        })
        .then((response) => {
          console.log(response);
          // Cancel saving to GoDAM
          if (response.status === "ok") {
            chrome.tabs.getCurrent((tab) => {
              chrome.tabs.update(tab.id, { url: response.url });
            });
            setIsSaving(false);
          } else {
            console.log('Error saving to GoDAM');
          }
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
            console.log(response);
            // Cancel saving to GoDAM
            if (response.status === "ok") {
              // Close the current tab and open the GoDAM URL
              chrome.tabs.getCurrent((tab) => {
                chrome.tabs.update(tab.id, { url: response.url });
              });
              setIsSaving(false);
            } else {
              console.log('Error saving to GoDAM');
            }
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
          {isSaving && (
            <div className={styles.saving}>
              <div className={styles.savingSpinner}></div>
              <p className={styles.savingText}>Hold tight! We're setting up your video...</p>
            </div>
          )}
          <Content />
        {/* <RightPanel /> */}
      </div>
    </div>
  );
};

export default Player;
