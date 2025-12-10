import React, { useEffect, useState } from "react";

// Import styles raw to inject into DOM
import setupStyles from "!raw-loader!sass-loader!./styles/_Setup.scss";

const Setup = () => {
	const [setupComplete, setSetupComplete] = useState(false);

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

	useEffect(() => {
		chrome.runtime.onMessage.addListener(function (
			request,
			sender,
			sendResponse
		) {
			if (request.type === "setup-complete") {
				setSetupComplete(true);
			}
		});
	}, []);

	return (
		<div className="setupBackground">
			{!setupComplete && (
				<div className="setupContainer">
					<div className="setupImage">
						<img src={chrome.runtime.getURL("assets/helper/pin.gif")} />
					</div>
					<div className="setupText">
						<div className="setupEmoji">👋</div>
						<div className="setupTitle">
							{chrome.i18n.getMessage("setupTitle")}
						</div>
						<div className="setupDescription">
							<div className="setupStep">
								{chrome.i18n.getMessage("setupStep1Before")}
								<span>
									<img
										src={chrome.runtime.getURL("assets/helper/puzzle.svg")}
									/>
								</span>
								{chrome.i18n.getMessage("setupStep1After")}
							</div>
							<div className="setupStep">
								{chrome.i18n.getMessage("setupStep2Before")}
								<span>
									<img src={chrome.runtime.getURL("assets/helper/pin.svg")} />
								</span>{" "}
								{chrome.i18n.getMessage("setupStep2After")}
							</div>
							<div className="setupStep">
								{chrome.i18n.getMessage("setupStep3Before")}
								<span>
									<img
										src={chrome.runtime.getURL(
											"assets/helper/mini-godam.png"
										)}
									/>
								</span>
								{chrome.i18n.getMessage("setupStep3After")}
							</div>
						</div>
					</div>
				</div>
			)}
			{setupComplete && (
				<div className="setupContainer center">
					<div className="setupText center">
						<div className="setupEmoji">🥳</div>
						<div className="setupTitle">
							{chrome.i18n.getMessage("setupCompleteTitle")}
						</div>
						<div className="setupDescription">
							{chrome.i18n.getMessage("setupCompleteDescription")}
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
				{setupStyles.replace(
					"__PATTERN_SVG_URL__",
					chrome.runtime.getURL("assets/helper/pattern-svg.svg")
				)}
			</style>
		</div>
	);
};

export default Setup;
