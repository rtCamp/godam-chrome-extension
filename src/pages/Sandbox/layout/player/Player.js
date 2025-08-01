import React, { useContext, useState, useEffect } from "react";

import Content from "./Content";
import PlayerNav from "./PlayerNav";

import styles from "../../styles/player/_Player.module.scss";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const Player = () => {
    const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
    const [isSaving, setIsSaving] = useState(false);

    const signInGoDAM = async () => {
        try {

            // GoDAM OAuth configuration
            const clientId = process.env.GODAM_OAUTH_CLIENT_ID || 'habg22ul6k';

            // Get the redirect URL and remove any trailing slashes
            const redirectUrl = chrome.identity.getRedirectURL().replace(/\/$/, '');

            const baseURL = process.env.GODAM_BASE_URL || 'https://app.godam.io';

            // Construct auth URL with state parameter for security
            const state = Math.random().toString(36).substring(7);
            const authUrl = new URL(`${baseURL}/api/method/frappe.integrations.oauth2.authorize`);
            authUrl.searchParams.append('client_id', clientId);
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('redirect_uri', redirectUrl);
            authUrl.searchParams.append('scope', 'all');
            authUrl.searchParams.append('state', state);

            const responseUrl = new URL(await chrome.identity.launchWebAuthFlow({
                url: authUrl.toString(),
                interactive: true
            }))


            const url = new URL(responseUrl);

            const error = url.searchParams.get('error');
            const responseCode = url.searchParams.get('code');
            const responseState = url.searchParams.get('state');

            if (error) {
                throw new Error(error)
            }

            if (!responseCode) {
                throw new Error('Authorization code not found in the response')
            }

            if (!responseState || responseState !== state) {
                throw new Error('State code mismatch')
            }

            // Get token with Auth code
            const tokenResponse = await fetch(`${baseURL}/api/method/frappe.integrations.oauth2.get_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                credentials: 'omit',
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: responseCode,
                    client_id: clientId,
                    redirect_uri: redirectUrl,
                }),
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
            }

            const tokenData = await tokenResponse.json();

            // Check for token in both standard and Frappe-specific response formats
            const token = tokenData.access_token || (tokenData.message && tokenData.message.access_token);

            if (!token) {
                throw new Error('Failed to get access token');
            }

            // Save token to storage with expiration time
            const expiresIn = tokenData.expires_in || (tokenData.message && tokenData.message.expires_in) || 3600;
            const expirationTime = Date.now() + expiresIn * 1000;
            const refreshToken = tokenData.refresh_token || (tokenData.message && tokenData.message.refresh_token);

            await chrome.storage.local.set({
                godamToken: token,
                godamRefreshToken: refreshToken,
                godamTokenExpiration: expirationTime
            })

            return token;
        } catch (error) {
            return null;
        }
    };

    const refreshToken = async () => {
        const token = await chrome.runtime.sendMessage({ type: "refresh-godam-token" })
        return token
    };

    const getGoDAMAuthToken = async () => {
        const { godamToken, godamTokenExpiration } = await chrome.storage.local.get(["godamToken", "godamTokenExpiration"]);

        const currentTime = Date.now();
        const isExpired = currentTime >= godamTokenExpiration;

        let token = undefined;

        if (!godamToken) {
            token = await signInGoDAM();
            if (!token) {
                throw new Error("GoDAM sign-in failed");
            }
        } else if (godamToken && isExpired) {
            token = await refreshToken();
            if (!newToken) {
                throw new Error("GoDAM sign-in failed");
            }
        } else {
            token = godamToken
        }

        return token
    };

    const saveToGoDAM = async () => {
        const blob = contentState.rawBlob;
        const token = await getGoDAMAuthToken()

        let fileName = `GoDAM video - ${new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
        })}.webm`;

        const formData = new FormData();
        formData.append('file', blob, fileName);

        const uploadUrl = process.env.GODAM_UPLOAD_URL || 'https://upload.godam.io'; // Todo: Replace the option with production URL

        const url = uploadUrl + '/upload-file';

        const uploadResponse = await fetch(
            url,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            }
        );

        let message = 'An error occurred while saving to GoDAM!';
        if (!uploadResponse.ok) {
            // error message
            if (uploadResponse.status === 400) {
                message = 'An error occurred while saving to GoDAM! <br> Looks like you are not logged in to GoDAM. Please log in again.';
            } else {
                message = 'An error occurred while saving to GoDAM! <br> Please try again later, if the problem persists, please contact <a href="https://app.godam.io/helpdesk/my-tickets" target="blank">support team</a>.';
            }
            throw new Error(message);
        }

        const responseData = await uploadResponse.json();

        const videoName = responseData?.file_informations?.name;
        const baseURL = process.env.GODAM_BASE_URL || 'https://app.godam.io';

        return `${baseURL}/web/video/${videoName}`

    };

    //  NOTE: This function can be usefull for debugging. Call it alongside saveToGoDAM to create a local copy
    //  of the video in Downloads.
    const handleRawRecording = () => {
        const blob = contentState.rawBlob;
        const url = window.URL.createObjectURL(blob);
        chrome.downloads.download(
            {
                url: url,
                filename: "raw-recording.webm",
            },
            () => {
                window.URL.revokeObjectURL(url);
            }
        )
    };

    useEffect(() => {
        if (!isSaving) {
            (async()=>{

            const url = await saveToGoDAM();
            setIsSaving(true);

            const currentTab = await chrome.tabs.getCurrent();
                chrome.tabs.update(currentTab.id, { url });
            })()
        }
    }, [])

    return (
        <div className={styles.layout}>
            <PlayerNav />
            <div className={styles.content}>
                <div className={styles.leftPanel}>
                    {isSaving && (
                        <div className={styles.saving}>
                            <div className={styles.savingSpinner}></div>
                            <p className={styles.savingText}>Hold tight! We're setting up your video...</p>
                        </div>
                    )}
                    <Content />
                </div>
            </div>
        </div>
    );
};

export default Player;
