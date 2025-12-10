import React, { useEffect, useState } from "react";

// Import styles raw to inject into DOM
import playgroundStyles from "!raw-loader!sass-loader!./styles/_Setup.scss";

const Setup = () => {
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

	return (
		<div className="setupBackground">
			<div className="setupLogo">
				<img
					src={chrome.runtime.getURL("assets/logo-text.svg")}
				/>
			</div>

			<div className="setupBackgroundSVG"></div>
			<style>
				{playgroundStyles.replace(
					"__PATTERN_SVG_URL__",
					chrome.runtime.getURL("assets/helper/pattern-svg.svg")
				)}
			</style>
		</div>
	);
};

export default Setup;
