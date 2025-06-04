const signInGoDAM = async () => {
  try {
    // GoDAM OAuth configuration
    const clientId = process.env.GODAM_OAUTH_CLIENT_ID || 'habg22ul6k';
    const clientSecret = process.env.GODAM_OAUTH_CLIENT_SECRET || '05e0758f00';
    
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

    // Launch OAuth flow with more detailed error handling
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
      })
        .then( response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response) {
            reject(new Error("No response URL received"));
            return;
          }
          resolve(response);
        });
    });

    // Extract authorization code from the redirect URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    if (!code) {
      throw new Error('Authorization code not found in the response');
    }

    if (returnedState !== state) {
      throw new Error('State parameter mismatch');
    }

    // Exchange code for access token with more detailed logging.
    const tokenResponse = await fetch(`${baseURL}/api/method/frappe.integrations.oauth2.get_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
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

export default signInGoDAM;