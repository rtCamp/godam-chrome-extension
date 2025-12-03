import React, { useState, useContext, useRef } from 'react'
import ReactDOM from 'react-dom';

import {
    Maximize,
    LaptopMinimal
} from "lucide-react";

import { contentStateContext } from "../../context/ContentState";

const ScreenshotTab = ({onScreenshotComplete, shadowRef}) => {
    const [contentState, setContentState] = useContext(contentStateContext);
    const [contentStateBackup, setContentStateBackup] = useState(null);
    const [screenshotType, setScreenshotType] = useState('fullscreen');
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [mode, setMode] = useState('idle'); // 'idle' | 'selecting'
    const [selection, setSelection] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 });

    const overlayRef = useRef(null);
    const selectionRef = useRef(null);

    const uploadScreenshot = async (blob) => {
        try {
            // Convert blob to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Send request to background script
            const response = await chrome.runtime.sendMessage({
                type: "upload-screenshot",
                base64: base64
            });

            if (response.status === "ok") {
                return response.fileName;
            } else {
                throw new Error(response.message || "Upload failed");
            }
        } catch (error) {
            throw error;
        }
    };

    const playShutterSound = () => {
        try {
            const audio = new Audio(chrome.runtime.getURL("/assets/sounds/camera-shutter.mp3"));
            audio.volume = 0.5;
            audio.play();
        } catch (error) {
            console.error('Error playing shutter sound:', error);
        }
    };

    const captureScreenshot = async () => {
        if (isCapturing) return;
        
        setIsCapturing(true);

        try {
            // Wait for UI to hide
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture the current tab using Chrome API
            const dataUrl = await chrome.runtime.sendMessage({
                type: "capture-screenshot",
                format: 'png',
                quality: 100,
                rect: null, // Fullscreen
            });

            if (chrome.runtime.lastError) {
                throw new Error('Failed to capture screenshot');
            }

            if (!dataUrl) {
                throw new Error('Failed to capture screenshot');
            }

            // Play camera shutter sound
            playShutterSound();

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            if (!blob) {
                throw new Error('Failed to create screenshot blob');
            }

            // Upload screenshot
            const uploadedFileName = await uploadScreenshot(blob);

            // Redirect to GoDAM
            const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
            window.open(`${baseUrl}/web/media-library?media=${uploadedFileName}`, '_blank');

        } catch (error) {
            alert('Failed to capture screenshot: ' + error.message);
        } finally {
            setIsCapturing(false);

            // Show popup and toolbar again
            if ( contentStateBackup ) {
                setContentState(contentStateBackup);
                setContentStateBackup(null);
            } else {
                setContentState((prevContentState) => ({
                    ...prevContentState,
                    hideToolbar: false,
                    hideUI: false,
                }));
            }

            const screenityUI = document.getElementById('screenity-ui');
            
            if (screenityUI) {
                screenityUI.style.display = 'unset';
            }

            setContentState((prevContentState) => ({
                ...prevContentState,
                showExtension: false,
            }));

            // Trigger onScreenshotComplete function.
            onScreenshotComplete();
        }
    };

    const cancelSelection = () => {
        if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        }
        setMode(null);
        setIsSelecting(false);
    };

    const handleMouseDown = (e) => {
        if (mode !== 'selecting') return;

        // Prevent default behavior to avoid text selection
        e.preventDefault();
        document.body.style.userSelect = 'none';
    
        const rect = overlayRef.current.getBoundingClientRect();
        setIsSelecting(true);
        setSelection({
            startX: e.clientX,
            startY: e.clientY,
            endX: e.clientX,
            endY: e.clientY
        });
    };

    const getSelectionStyle = () => {
        const x = Math.min(selection.startX, selection.endX);
        const y = Math.min(selection.startY, selection.endY);
        const width = Math.abs(selection.endX - selection.startX);
        const height = Math.abs(selection.endY - selection.startY);
        
        return {
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`
        };
    };

    const handleMouseMove = (e) => {
        if (!isSelecting || mode !== 'selecting') return;
        
        const rect = overlayRef.current.getBoundingClientRect();
        setSelection(prev => ({
            ...prev,
            endX: e.clientX,
            endY: e.clientY,
        }));
    };

    const handleMouseUp = async () => {
        if (!isSelecting || mode !== 'selecting') return;
        
        if ( selectionRef.current ) {
            selectionRef.current.style.display = 'none';
        }

        setIsSelecting(false);
        setMode('ideal');

        const x = Math.min(selection.startX, selection.endX) * window.devicePixelRatio;
        const y = Math.min(selection.startY, selection.endY) * window.devicePixelRatio;
        const width = Math.abs(selection.endX - selection.startX) * window.devicePixelRatio;
        const height = Math.abs(selection.endY - selection.startY) * window.devicePixelRatio;

        if (width < 10 || height < 10) {
            cancelSelection();
            return;
        }

        // Capture the selected area
        try {
            // Stop selection mode
            setMode('idle');
            
            // Restore UI
            document.body.style.userSelect = '';

            // Capture screenshot of selected area
            const dataUrl = await chrome.runtime.sendMessage({
                type: "capture-screenshot",
                format: 'png',
                quality: 100,
            });

            if (!dataUrl) {
                throw new Error('Failed to capture screenshot');
            }

            // Play camera shutter sound
            playShutterSound();

            // Create an image from the captured data
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = dataUrl;
            });
            
            // Create canvas to crop the image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // Draw the cropped portion
            // sx, sy: source x,y coordinates
            // sWidth, sHeight: source width and height
            // dx, dy: destination x,y (0,0 for top-left)
            // dWidth, dHeight: destination width and height
            ctx.drawImage(
                img,
                x, y, width, height, // source rectangle
                0, 0, width, height // destination rectangle
            );

            // Convert to data URL with quality
            const croppedDataUrl = canvas.toDataURL(`image/png`, 1);

            // Convert data URL to blob
            const response = await fetch(croppedDataUrl);
            const blob = await response.blob();

            if (!blob) {
                throw new Error('Failed to create screenshot blob');
            }

            // Upload screenshot
            const uploadedFileName = await uploadScreenshot(blob);

            // Redirect to GoDAM
            const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
            window.open(`${baseUrl}/web/media-library?media=${uploadedFileName}`, '_blank');
        } catch (error) {
            alert(error.message);
            cancelSelection();
        } finally {
            const screenityUI = document.getElementById('screenity-ui');
            
            if (screenityUI) {
                screenityUI.style.display = 'unset';
            }

            setContentState((prevContentState) => ({
                ...prevContentState,
                showExtension: false,
            }));

            // Trigger onScreenshotComplete function.
            onScreenshotComplete();
        }
    };
    
    
    return (
        <>
            <div className="" style={{
                padding: "1rem",
                backgroundColor: "#F6F7FB",
                marginTop: "1rem"
            }}>
                <h2 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#29292F',
                    marginTop: '4px',
                    marginBottom: '20px'
                }}>Screenshot type</h2>
                <div className="screenshot-type-selector" style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px"
                }}>
                    <div className="screenshot-type-selector--item custom-area"
                        style={{
                            padding: '16px',
                            borderRadius: '8px',
                            color: '#29292F',
                            backgroundColor: screenshotType === 'custom-area' ? '#f7347f21' : '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: screenshotType === 'custom-area' ? '2px solid #ab3a6c' : 'transparent',
                        }}
                        onClick={() => setScreenshotType('custom-area')}
                    >
                        <Maximize size={24} />
                        <span>Custom area</span>
                    </div>
                    <div className="screenshot-type-selector--item fullscreen"
                        style={{
                            padding: '16px',
                            borderRadius: '8px',
                            color: '#29292F',
                            backgroundColor: screenshotType === 'fullscreen' ? '#f7347f21' : '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            border: screenshotType === 'fullscreen' ? '2px solid #ab3a6c' : 'transparent'
                        }}
                        onClick={() => setScreenshotType('fullscreen')}
                    >
                        <LaptopMinimal size={24} />
                        <span>Current tab</span>
                    </div>
                </div>

                <button
                    className="main-button recording-button"
                    style={{
                        marginTop: '20px',
                        color: '#fff',
                    }}
                    onClick={() => {
                        const screenityRootContainer = document.getElementById('screenity-root-container');

                        if (screenityRootContainer) {
                            screenityRootContainer.style.display = 'none';
                        }

                        if (screenshotType === 'custom-area') {
                            setMode('selecting');
                        } else {
                            captureScreenshot();
                        }
                    }}
                    disabled={isCapturing}
                >
                    {
                        isCapturing 
                            ? 'Capturing...' 
                            : screenshotType === 'custom-area' ? 'Select area' : 'Take screenshot'
                    }
                </button>
            </div>
            {
                mode === 'selecting' &&
                <OverlayControl>
                    <div
                        ref={overlayRef}
                        data-screenshot-overlay="true"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'transparent',
                            zIndex: 9999999999999,
                            cursor: 'crosshair',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <div
                            style={{
                                backgroundColor: 'transparent',
                                position: 'absolute',
                                border: '1px dashed #ab3a6c',
                                boxShadow: 'rgba(0, 0, 0, 0.2) 0px 0px 0px 9999px',
                                boxSizing: 'border-box',
                                ...getSelectionStyle(),
                            }}
                            ref={selectionRef}
                        ></div>
                    </div>
                </OverlayControl>
            }
        </>
    )
}

const OverlayControl = ( { children } ) => {
	return ReactDOM.createPortal(
		<>
			{ children }
		</>,
		document.getElementsByTagName( 'body' )[ 0 ],
	);
};

export default ScreenshotTab;
