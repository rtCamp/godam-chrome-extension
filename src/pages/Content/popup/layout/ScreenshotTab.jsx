import React, { useEffect, useState } from 'react'

import * as Select from "@radix-ui/react-select";
import {
    CheckWhiteIcon,
    DropdownIcon
} from "../../images/popup/images";

import {
    Maximize,
    LaptopMinimal
} from "lucide-react";


const ScreenshotTab = () => {
    // screenshotType state
    const [screenshotType, setScreenshotType] = useState('fullscreen');
    
    return (
        <div className="" style={{
            padding: "1rem",
            backgroundColor: "#F6F7FB", // color-light-gray in variables
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
                        border: screenshotType === 'custom-area' ? '2px solid #ab3a6c' : 'transparent'
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
                    color: '#fff !important',
                }}
            >
                {
                    screenshotType === 'custom-area' ? 'Select area' : 'Take screenshot'
                }
            </button>
        </div>
    )
}

export default ScreenshotTab;