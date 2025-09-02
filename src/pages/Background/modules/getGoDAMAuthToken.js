import signInGoDAM from "./signInGoDAM";

// GoDAM OAuth configuration
const clientId = process.env.GODAM_OAUTH_CLIENT_ID;

async function getGoDAMAuthToken() {
    const { godamToken, godamRefreshToken, godamTokenExpiration } = await chrome.storage.local.get(["godamToken", "godamRefreshToken", "godamTokenExpiration"]);

    // Token is not set, trigger sign-in
    if (!godamToken) {
        const newToken = await signInGoDAM();
        return newToken
    }
    // Token is set, check if it has expired
    const currentTime = Date.now();

    if (currentTime < godamTokenExpiration) {
        return godamToken
    }

    const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';

    try {
        const refreshResponse = await fetch(`${baseUrl}/api/method/frappe.integrations.oauth2.get_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            credentials: 'omit',
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                refresh_token: godamRefreshToken,
                client_id: clientId,
            }),
        });

        if (!refreshResponse.ok) {
            // Refresh token failed, try to sign in again
            const newToken = await signInGoDAM();
            if (!newToken) {
                throw new Error("GoDAM token refresh and sign-in failed");
            }
            return newToken;
        }

        const tokenData = await refreshResponse.json();
        const newToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in || 3600;
        const expirationTime = Date.now() + expiresIn * 1000;

        // Save new token to storage
        await chrome.storage.local.set({
            godamToken: newToken,
            godamRefreshToken: tokenData.refresh_token || godamRefreshToken,
            godamTokenExpiration: expirationTime
        })

        return newToken;
    } catch (error) {
        // If refresh fails, try to sign in again
        const newToken = await signInGoDAM();
        if (!newToken) {
            throw new Error("GoDAM token refresh and sign-in failed");
        }
        return newToken
    }
}

export default getGoDAMAuthToken