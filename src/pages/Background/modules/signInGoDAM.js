const signInGoDAM = async () => {
    // GoDAM OAuth configuration
    const clientId = process.env.GODAM_OAUTH_CLIENT_ID || 'habg22ul6k';
    const scope = process.env.GODAM_OAUTH_SCOPE || 'all openid';
    
    // Get the redirect URL and remove any trailing slashes
    const redirectUrl = chrome.identity.getRedirectURL().replace(/\/$/, '');

    const baseURL = process.env.GODAM_BASE_URL || 'https://app.godam.io';    
    
    // Construct auth URL with state parameter for security
    const state = Math.random().toString(36).substring(7);
    const authUrl = new URL(`${baseURL}/api/method/frappe.integrations.oauth2.authorize`);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);

    const responseUrl = new URL(await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
    }))


    const url = new URL(responseUrl);

    const error = url.searchParams.get('error');
    const responseCode = url.searchParams.get('code');
    const responseState = url.searchParams.get('state');

    if (error){
        throw new Error(error)
    }

    if (!responseCode ){
        throw new Error('Authorization code not found in the response')
    }

    if (!responseState || responseState !== state  ){
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
};

export default signInGoDAM;