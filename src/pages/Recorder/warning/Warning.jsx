import React, {
	useState,
	useEffect,
	useContext,
	useCallback,
	useRef,
} from "react";

import { ReactSVG } from "react-svg";

// Import styles raw to inject into DOM
import warningStyles from "!raw-loader!sass-loader!./styles/_Warning.scss";

import * as ToastEl from "@radix-ui/react-toast";

const Warning = () => {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("Record computer audio");
	const [description, setDescription] = useState("");
	const [duration, setDuration] = useState(10000);

	const openWarning = useCallback((title, description, duration) => {
		setTitle(title);
		setDescription(description);
		setDuration(duration);
		setOpen(true);
	}, []);

	useEffect(() => {
		// Check if macOS
		const isMac = navigator.userAgent.indexOf("Mac") !== -1;
		if (isMac) {
			openWarning(
				chrome.i18n.getMessage("recordAudioWarningMacTitle"),
				chrome.i18n.getMessage("recordAudioWarningMacDescription"),
				10000
			);
		} else {
			openWarning(
				chrome.i18n.getMessage("recordAudioWarningOtherTitle"),
				chrome.i18n.getMessage("recordAudioWarningOtherDescription"),
				10000
			);
		}
	}, [openWarning]);

	return (
		<ToastEl.Provider swipeDirection="down" duration={duration}>
			<ToastEl.Root
				className="warning-root"
				open={open}
				onOpenChange={setOpen}
				onSwipeEnd={() => {
					setOpen(false);
				}}
			>
				<div className="warning-icon">
					<ReactSVG
						src={chrome.runtime.getURL("assets/tool-icons/audio-icon.svg")}
						width={20}
						height={20}
					/>
				</div>
				<div className="warning-content">
					<ToastEl.Title className="warning-title">{title}</ToastEl.Title>
					<ToastEl.Description className="warning-description">
						{description}
					</ToastEl.Description>
				</div>
				<ToastEl.Close
					className="warning-close"
					onClick={() => {
						setOpen(false);
					}}
				>
					<ReactSVG
						src={chrome.runtime.getURL("assets/camera-icons/close.svg")}
						width={20}
						height={20}
					/>
				</ToastEl.Close>
			</ToastEl.Root>
			<ToastEl.Viewport className="WarningViewport" />
			<style>{warningStyles}</style>
		</ToastEl.Provider>
	);
};

export default Warning;
