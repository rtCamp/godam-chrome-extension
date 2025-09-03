import React, { useEffect, useState } from "react";
const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";
import { ReactSVG } from "react-svg";

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
        {`
				body {
					overflow: hidden;
					margin: 0px;
				}

        .loginHeader {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1000;
        }

				.setupInfo {
					margin-top: 20px;
				}
				a {
					text-decoration: none!important;
					color: #4C7DE2;
				}
				.setupBackgroundSVG {
					position: absolute;
					top: 0px;
					left: 0px;

					width: 100%;
					height: 100%;
					background: url('` +
          chrome.runtime.getURL("assets/helper/pattern-svg.svg") +
          `') repeat;
					background-size: 62px 23.5px;
					animation: moveBackground 138s linear infinite;
          pointer-events: none;
				}

        .message {
          color: #6E7684;
          font-size: 16px;
          position: absolute;
          bottom: 1.25rem;
          right: 1rem;
          margin: auto;
          text-align: center;
          width: 100%;
          z-index: 999;
          max-width: 300px;
          padding: 1rem;
          border-radius: 0.25rem;
        }

        .loader-container {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 0 0 0.25rem 0.25rem;
          overflow: hidden;
        }

        .loader {
          height: 100%;
          background-color: currentColor;
          transition: width 0.03s linear;
        }

        .message.success {
          background-color: oklch(96.2% 0.044 156.743);
          color: oklch(72.3% 0.219 149.579);
        }

        .message.error {
          background-color: oklch(93.6% 0.032 17.717);
          color: oklch(63.7% 0.237 25.331);
        }

        .getGodamButton {
          background-color: #ab3a6c;
          color: #fff;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 0.75rem;
          font-size: 14px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: background-color 0.3s ease;
        }

        .getGodamButton:hover { 
          background-color: #9a2d5e;
        }

        .loginTitle {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .loginButton {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          padding: 10px;
          border: 1px solid #E0E0E0;
          cursor: pointer;
          gap: 16px;
          padding: 10px 20px;
        }
        .loginButton:hover {
          background-color: #fff;
        }

        .buttonLeft,
        .buttonRight {
          display: flex;
          align-items: center;
          text-align: center;
          height: 100%;
          justify-content: center;

          svg {
            color: $color-icon;
            width: 28px;
            height: 28px;
          }
        }
        .buttonRight {
          svg {
            width: 18px;
            height: 18px;
          }
        }

        .buttonMiddle {
          text-align: center;
          font-size: 16px;
          font-weight: 600;
        }
        
        .noAccount {
          margin: 32px 0; 
          font-size: 16px;
        }
        
        .noAccount a {
          color: #ab3a6c;
        }
        
        .noAccount a:hover {
          text-decoration: underline;
        }
				
				@keyframes moveBackground {
					0% {
						background-position: 0 0;
					}
					100% {
						background-position: 100% 0;
					}
				}

				.setupLogo {
					position: absolute;
					bottom: 30px;
					left: 0px;
					right: 0px;
					margin: auto;
					display: flex;
					justify-content: center;
					align-items: end;
					gap: 10px;
				}

				.setupLogo img {
					max-width: 120px;
					width: 100%;
				}

				.setupLogo span {
					font-size: 12px;
					color: #6E7684;
					line-height: 2;
				}

        .godamLogo {
          display: flex;
					justify-content: center;
					align-items: end;
					gap: 10px;
        }

        .godamLogo img {
					max-width: 120px;
					width: 100%;
				}

				.godamLogo span {
					font-size: 12px;
					color: #6E7684;
					line-height: 2;
				}

				.setupBackground {
					background-color: #f5f5f5;
					height: 100vh;
					width: 100vw;
					display: flex;
					justify-content: center;
					align-items: center;
          flex-direction: column;
				}

				.setupContainer {
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
					margin: auto;
					z-index: 999;
					display: flex;
					justify-content: center;
					align-items: center;
					width: 60%;
					height: fit-content;
					background-color: #fff;
					border-radius: 30px;
					padding: 50px 50px;
					gap: 80px;
					font-family: 'Satoshi-Medium', sans-serif;
				}

				.setupImage {
					width: 70%;
					display: flex;
					justify-content: center;
					align-items: center;
				}

				.setupImage img {
					width: 100%;
					border-radius: 30px;
				}

				.setupText {
					width: 50%;
					display: flex;
					flex-direction: column;
					justify-content: left;
					align-items: left;
					text-align: left;
				}

				.setupEmoji {
					font-size: 20px;
					margin-bottom: 10px;
				}

				.setupTitle {
					font-size: 20px;
					font-weight: bold;
					margin-bottom: 10px;
					color: #29292F;
				}

				.setupDescription {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: left;
					margin-top: 10px;
					color: #6E7684;
					font-size: 14px;
				}

				.setupStep {
					margin-bottom: 10px;
					vertical-align: middle;
				}

				.setupStep span {

					align-items: center;
					justify-content: center;
					text-align: center;
					width: 20px;
					height: 20px;
					padding: 2px;
					border-radius: 30px;
					display: inline-flex;
					vertical-align: middle;
					margin-left: 3px;
					margin-right: 3px;
					background-color: #F4F2F2;
				}

				.setupStep img {
					width: 100%;
					text-align: center;
					display: block;
				}

				.center {
					text-align: center!important;
				}
				.setupText.center {
					width: auto!important;
				}
				.setupContainer.center {
					width: 40%!important;
				}
				


				`}
      </style>
    </div>
  );
};

export default Setup;
