import "./styles/edit/_VideoPlayer.scss";
import "./styles/global/_app.scss";

import React, { useState, useEffect, useRef, useContext } from "react";

// Import styles raw to inject into DOM
import sandboxStyles from "!raw-loader!sass-loader!./styles/_Sandbox.scss";
// Layout
import Player from "./layout/player/Player";
import Modal from "./components/global/Modal";

import HelpButton from "./components/player/HelpButton";

// Context
import { ContentStateContext } from "./context/ContentState"; // Import the ContentState context

const Sandbox = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const parentRef = useRef(null);
  const progress = useRef("");

  const getChromeVersion = () => {
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);

    return raw ? parseInt(raw[2], 10) : false;
  };

  useEffect(() => {
    const MIN_CHROME_VERSION = 110;
    const chromeVersion = getChromeVersion();

    if (chromeVersion && chromeVersion > MIN_CHROME_VERSION) {
      contentState.loadFFmpeg();
    } else {
      setContentState((prevState) => ({
        ...prevState,
        updateChrome: true,
        ffmpeg: true,
      }));
    }
  }, []);

  useEffect(() => {
    if (!contentState.blob || !contentState.ffmpeg) return;
    if (contentState.frame) return;
    contentState.getFrame();
  }, [contentState.blob, contentState.ffmpeg]);

  // Programmatically add custom scrollbars
  useEffect(() => {
    if (!parentRef) return;
    if (!parentRef.current) return;

    // Check if on mac
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    if (isMac) return;

    const parentDiv = parentRef.current;

    const elements = parentDiv.querySelectorAll("*");
    elements.forEach((element) => {
      element.classList.add("screenity-scrollbar");
    });

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.classList.add("screenity-scrollbar");
            }
          });

          removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.classList.remove("screenity-scrollbar");
            }
          });
        }
      }
    });

    observer.observe(parentDiv, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [parentRef.current]);

  useEffect(() => {
    if (contentState.chunkCount > 0) {
      progress.current = `(${Math.round(
        (contentState.chunkIndex / contentState.chunkCount) * 100
      )}%)`;
    }
  }, [contentState.chunkIndex, contentState.chunkCount]);

  return (
    <div ref={parentRef}>
      <Modal />
      <video></video>
      {contentState.ready && <Player />}
      {!contentState.ready && (
        <div className="wrap">
          <div className="setupLogo">
            <img
              src={chrome.runtime.getURL("assets/logo-text.svg")}
            />
          </div>
          <div className="middle-area">
            <img src="/assets/record-tab-active.svg" />
            <div className="title">
              {chrome.i18n.getMessage("sandboxProgressTitle") +
                " " +
                progress.current}
            </div>
            <div className="subtitle">
              {chrome.i18n.getMessage("sandboxProgressDescription")}
            </div>
            {typeof contentState.openModal === "function" && (
              <div
                className="button-stop"
                onClick={() => {
                  contentState.openModal(
                    chrome.i18n.getMessage("havingIssuesModalTitle"),
                    chrome.i18n.getMessage("havingIssuesModalDescription"),
                    chrome.i18n.getMessage("restoreRecording"),
                    chrome.i18n.getMessage("havingIssuesModalButton2"),
                    () => {
                      chrome.runtime.sendMessage({ type: "restore-recording" });
                    },
                    () => {
                      chrome.runtime.sendMessage({ type: "report-bug" });
                    }
                  );
                }}
              >
                {chrome.i18n.getMessage("havingIssuesButton")}
              </div>
            )}
          </div>
          <HelpButton />
          <div className="setupBackgroundSVG"></div>
        </div>
      )}
      <style>{sandboxStyles}</style>
    </div>
  );
};

export default Sandbox;
