const signInGoDAM = async () => {
  try {
    // GoDAM OAuth configuration
    const clientId = 'habg22ul6k';
    
    // Get the redirect URL and remove any trailing slashes
    const redirectUrl = chrome.identity.getRedirectURL().replace(/\/$/, '');
    console.log("Redirect URL:", redirectUrl);
    
    // Construct auth URL with state parameter for security
    const state = Math.random().toString(36).substring(7);
    const authUrl = new URL('https://frappe-transcoder-api.rt.gw/api/method/frappe.integrations.oauth2.authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUrl);
    authUrl.searchParams.append('scope', 'all');
    authUrl.searchParams.append('state', state);
    
    console.log("Auth URL:", authUrl.toString());

    // Launch OAuth flow with more detailed error handling
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true
      })
        .then( response => {
          console.log("Response:", response);
          
          if (chrome.runtime.lastError) {
            console.error("WebAuthFlow Error:", chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response) {
            console.error("No response URL received");
            reject(new Error("No response URL received"));
            return;
          }
          console.log("Response URL:", response);
          resolve(response);
        });
    });

    // Extract authorization code from the redirect URL
    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    if (!code) {
      console.error("No code found in response URL");
      throw new Error('Authorization code not found in the response');
    }

    if (returnedState !== state) {
      console.error("State mismatch");
      throw new Error('State parameter mismatch');
    }

    console.log("Obtained authorization code:", code);

    // Exchange code for access token with more detailed logging
    console.log("Exchanging code for token...");
    const tokenResponse = await fetch('https://frappe-transcoder-api.rt.gw/api/method/frappe.integrations.oauth2.get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: '05e0758f00',
        redirect_uri: redirectUrl,
      }),
      credentials: 'include'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("Token response:", tokenData);

    // Check for token in both standard and Frappe-specific response formats
    const token = tokenData.access_token || (tokenData.message && tokenData.message.access_token);

    if (!token) {
      console.error("No access token in response:", tokenData);
      throw new Error('Failed to get access token');
    }

    console.log("Successfully obtained access token");

    // Save token to storage with expiration time
    const expiresIn = tokenData.expires_in || (tokenData.message && tokenData.message.expires_in) || 3600;
    const expirationTime = Date.now() + expiresIn * 1000;
    const refreshToken = tokenData.refresh_token || (tokenData.message && tokenData.message.refresh_token);
    
    await new Promise((resolve) =>
      chrome.storage.local.set({ 
        godamToken: token,
        godamRefreshToken: refreshToken,
        godamTokenExpiration: expirationTime
      }, () => {
        console.log("Token saved to storage");
        resolve();
      })
    );

    return token;
  } catch (error) {
    console.error('Error signing in to GoDAM:', error);
    return null;
  }
};

export default signInGoDAM;