import React, { useEffect, useState } from "react";
const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";
import { ReactSVG } from "react-svg";

// Import styles raw to inject into DOM
import loginStyles from "!raw-loader!sass-loader!./styles/_Setup.scss";

const Setup = () => {

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(100);

  /**
   * Check if user is logged in to GoDAM, if already logged in redirect to playground
   */
  const checkLogin = async () => {
    // Check if user is logged in to GoDAM
    const { godamToken } = await chrome.storage.local.get(["godamToken"]);

    if (godamToken) {
      // Redirect to playground page if user is logged in
      window.location.href = chrome.runtime.getURL("playground.html");
    }
  }

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    if (message) {
      setLoaderProgress(100);
      const interval = setInterval(() => {
        setLoaderProgress((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            setMessage(null);
            return 0;
          }
          return prev - 1;
        });
      }, 30); // Decrease progress every 30ms for a 3-second duration
      return () => clearInterval(interval);
    }
  }, [message]);

  const LoginWithGoDAM = () => {

    setLoading(true);
    chrome.runtime.sendMessage({ type: "sign-in-godam" }, (response) => {

      if (response.status === "ok") {
        setLoading(false);
        setMessage({
          type: "success",
          message: "Successfully signed in with GoDAM 🎉"
        });

        setTimeout(() => {
          setMessage(null);
          // Get the previous tab ID from storage and navigate back to it
          chrome.storage.local.get(['previousTabId'], (result) => {
            if (result.previousTabId) {
              chrome.tabs.update(result.previousTabId, { active: true });
              // Clear the stored tab ID
              chrome.storage.local.remove('previousTabId');

              // Close the current window
              window.close();
            } else {
              // If no previous tab ID is found, redirect to the default page
              window.location.href = chrome.runtime.getURL("playground.html");
            }
          });
        }, 3000);
      } else {
        setLoading(false);
        setMessage({
          type: "error",
          message: response.message
        })

        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    });
  };

  return (
    <div className="setupBackground">
      <header className="loginHeader">
        <div className="godamLogo">
          <img src={chrome.runtime.getURL("assets/logo-text.svg")} />
        </div>

        <a className="getGodamButton" href="https://godam.io" target="_blank">Get GoDAM</a>
      </header>

      <h1 className="loginTitle">Log in</h1>

      {/* Sign in with GoDAM button */}
      <div
        role="button"
        className="loginButton"
        onClick={LoginWithGoDAM}
      >
        <div className="buttonLeft">
          <ReactSVG fontSize={16} src={URL + "editor/icons/godam.svg"} />
        </div>
        <div className="buttonMiddle">
          {
            loading ? 'Authenticating via GoDAM...' : 'Login with GoDAM'
          }
        </div>
      </div>

      <p className="noAccount">
        Start recording your screen with GoDAM. Need an account? <a href="https://godam.io/pricing/" target="_blank">Start a 7-day free trial.</a>
      </p>

      {message && (
        <div className={`message ${message.type}`}>
          {message.message}
          <div className="loader-container">
            <div className="loader" style={{ width: `${loaderProgress}%` }}></div>
          </div>
        </div>
      )}

      <div className="setupBackgroundSVG"></div>

      <style>
        {loginStyles.replace(
          "__PATTERN_SVG_URL__",
          chrome.runtime.getURL("assets/helper/pattern-svg.svg")
        )}
      </style>
    </div>
  );
};

export default Setup;
