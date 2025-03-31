import React, { useEffect, useState } from "react";
const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";
import { ReactSVG } from "react-svg";

const Setup = () => {

  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Inject content script
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("contentScript.bundle.js");
    script.async = true;
    document.body.appendChild(script);

    // Also inject CSS
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.type = "text/css";
    style.href = chrome.runtime.getURL("assets/fonts/fonts.css");
    document.body.appendChild(style);

    // Return
    return () => {
      document.body.removeChild(script);
      document.body.removeChild(style);
    };
  }, []);

  const LoginWithGoDAM = () => {
    chrome.runtime.sendMessage({ type: "sign-in-godam" }, (response) => {
      
      if (response.status === "ok") {
        setMessage({
          type: "success",
          message: "Signed in to GoDAM successfully"
        });

        setTimeout(() => {
          setMessage(null);
          // Redirect to the playground.html page
          window.location.href = chrome.runtime.getURL("playground.html");
        }, 3000);
      } else {
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
      <div className="setupLogo">
        <img src={chrome.runtime.getURL("assets/logo-text.svg")} />
        <span>Powered by Screenity</span>
      </div>

      <h1>Login</h1>

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
          Login with GoDAM
        </div>
        <div className="buttonRight">
          <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.message}
        </div>
      )}

      <div className="setupBackgroundSVG"></div>

      <style>
        {`
				body {
					overflow: hidden;
					margin: 0px;
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
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          margin: auto;
          text-align: center;
          width: 100%;
          z-index: 999;
          max-width: 300px;
        }

        .message.success {
          background-color: oklch(0.925 0.084 155.995);
        }

        .message.error {
          color: oklch(0.885 0.062 18.334);
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
        }
        .loginButton:hover {
          background-color: #fff;
        }

        .buttonLeft,
        .buttonRight {
          width: 60px;
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
