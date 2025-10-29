import React, { useState, useContext, useRef } from 'react'
import ReactDOM from 'react-dom';

import {
    Maximize,
    LaptopMinimal
} from "lucide-react";

import { contentStateContext } from "../../context/ContentState";

const ScreenshotTab = ({onScreenshotComplete}) => {
    const [contentState, setContentState] = useContext(contentStateContext);
    const [contentStateBackup, setContentStateBackup] = useState(null);
    const [screenshotType, setScreenshotType] = useState('fullscreen');
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [mode, setMode] = useState('idle'); // 'idle' | 'selecting'
    const [selection, setSelection] = useState({ startX: 0, startY: 0, endX: 0, endY: 0 });

    const overlayRef = useRef(null);

    const getGoDAMAuthToken = async () => {
        const { godamToken, godamRefreshToken, godamTokenExpiration } = await chrome.storage.local.get(["godamToken", "godamRefreshToken", "godamTokenExpiration"]);

        // Token is not set or expired
        if (!godamToken || (godamTokenExpiration && Date.now() >= godamTokenExpiration)) {
            // Request token from background script
            const response = await chrome.runtime.sendMessage({ type: "get-godam-token" });
            return response.token;
        }

        return godamToken;
    };

    const uploadScreenshot = async (blob) => {
        try {
            const token = await getGoDAMAuthToken();
            const { selectedOrg } = await chrome.storage.local.get(["selectedOrg"]);

            if (!selectedOrg) {
                throw new Error("No organization selected");
            }

            const fileName = `Screenshot - ${new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: true,
            })}.png`;

            const formData = new FormData();
            formData.append('file', blob, fileName);

            const uploadUrl = process.env.GODAM_UPLOAD_URL || 'https://godam-upload.rt.gw';
            const url = uploadUrl + '/upload-file';

            const uploadResponse = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Organization: selectedOrg
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Upload failed');
            }

            const responseData = await uploadResponse.json();
            return responseData?.file_informations?.name;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    const captureScreenshot = async () => {
        if (isCapturing) return;
        
        setIsCapturing(true);

        try {
            setContentStateBackup(contentState);
            // Hide popup and toolbar
            setContentState((prevContentState) => ({
                ...prevContentState,
                hideToolbar: true,
                hideUI: true,
                cameraActive: false,
            }));

            // Wait for UI to hide
            await new Promise(resolve => setTimeout(resolve, 300));

            try {
                // Capture the current tab using Chrome API
                const dataUrl = await chrome.runtime.sendMessage({
                    type: "capture-screenshot",
                    format: 'png',
                    quality: 100,
                    rect: null, // Fullscreen
                });

                if (!dataUrl) {
                    throw new Error('Failed to capture screenshot');
                    // Todo : Handle the error gracefully
                }

                // Convert data URL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();

                if (!blob) {
                    throw new Error('Failed to create screenshot blob');
                }

                // Upload screenshot
                await uploadScreenshot(blob);

                // Redirect to GoDAM
                const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
                window.open(`${baseUrl}/web/media-library`, '_blank');

            } catch (error) {
                console.error('Screenshot error:', error);
                alert('Failed to capture screenshot: ' + error.message);
            }
        } catch (error) {
            console.error('Screenshot error:', error);
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

    // const captureArea = async (x, y, width, height) => {
    //     try {
    //     const video = videoRef.current;
        
    //     if (!video) {
    //         setError('Video capture not available');
    //         return;
    //     }

    //     // Calculate scale factors
    //     const scaleX = video.videoWidth / window.innerWidth;
    //     const scaleY = video.videoHeight / window.innerHeight;

    //     // Create canvas for cropped area
    //     const canvas = document.createElement('canvas');
    //     canvas.width = width * scaleX * quality;
    //     canvas.height = height * scaleY * quality;
        
    //     const ctx = canvas.getContext('2d');
    //     ctx.scale(quality, quality);
        
    //     // Draw the selected portion
    //     ctx.drawImage(
    //         video,
    //         x * scaleX, y * scaleY, width * scaleX, height * scaleY,
    //         0, 0, width * scaleX, height * scaleY
    //     );

    //     // Stop the stream
    //     if (streamRef.current) {
    //         streamRef.current.getTracks().forEach(track => track.stop());
    //     }

    //     // Convert to data URL
    //     const dataUrl = canvas.toDataURL('image/png', quality);
    //     setScreenshot(dataUrl);
    //     setMode('preview');
    //     } catch (error) {
    //     console.error('Error capturing area:', error);
    //     setError('Failed to capture selected area. Please try again.');
    //     cancelSelection();
    //     }
    // };

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
        
        setIsSelecting(false);
        
        const x = Math.min(selection.startX, selection.endX);
        const y = Math.min(selection.startY, selection.endY);
        const width = Math.abs(selection.endX - selection.startX);
        const height = Math.abs(selection.endY - selection.startY);
        
        if (width < 10 || height < 10) {
            cancelSelection();
            return;
        }

        console.log('Selected area:', { x, y, width, height });
        

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
                rect: { x, y, width, height },
            });

            if (!dataUrl) {
                throw new Error('Failed to capture screenshot');
            }

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            if (!blob) {
                throw new Error('Failed to create screenshot blob');
            }

            // Upload screenshot
            await uploadScreenshot(blob);

            // Redirect to GoDAM
            const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
            window.open(`${baseUrl}/web/media-library`, '_blank');
        } catch (error) {
            console.error('Error capturing area:', error);
            cancelSelection();
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
                        <span>Fullscreen</span>
                    </div>
                </div>

                <button
                    className="main-button recording-button"
                    style={{
                        marginTop: '20px',
                        color: '#fff',
                    }}
                    onClick={() => {
                        if (screenshotType === 'custom-area') {
                            // Activate selection mode
                            setContentStateBackup(contentState);
                            // Hide popup and toolbar
                            setContentState((prevContentState) => ({
                                ...prevContentState,
                                hideToolbar: true,
                                hideUI: true,
                                cameraActive: false,
                            }));

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
                            : screenshotType === 'custom-area' ? 'Select Area' : 'Take Screenshot'
                    }
                </button>
            </div>
            {
                mode === 'selecting' &&
                <OverlayControl>
                    <div
                        ref={overlayRef}
                        data-screenshot-overlay="true"
                        className="fixed inset-0 bg-black bg-opacity-50 cursor-crosshair z-50"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'transparent',
                            zIndex: 9999999999,
                            cursor: 'crosshair',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                border: '1px dashed #ab3a6c',
                                ...getSelectionStyle(),
                            }}
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
