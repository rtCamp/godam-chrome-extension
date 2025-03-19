import signInGoDAM from "./signInGoDAM";

// Function to upload a video to GoDAM
const saveToGoDAM = async (videoBlob, fileName, sendResponse) => {
  // Function to get an access token from Chrome storage
  async function getGoDAMAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["godamToken", "godamRefreshToken", "godamTokenExpiration"], async (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError));
        } else {
          const { godamToken, godamRefreshToken, godamTokenExpiration } = result;
          
          if (!godamToken) {
            // Token is not set, trigger sign-in
            const newToken = await signInGoDAM();
            if (!newToken) {
              // Sign-in failed, throw an error
              reject(new Error("GoDAM sign-in failed"));
            }
            resolve(newToken);
          } else {
            // Token is set, check if it has expired
            const currentTime = Date.now();
            if (currentTime >= godamTokenExpiration) {
              // Token has expired, refresh it
              try {
                const refreshResponse = await fetch('https://frappe-transcoder-api.rt.gw/api/method/frappe.integrations.oauth2.get_token', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: godamRefreshToken,
                    client_id: 'habg22ul6k',
                    client_secret: '05e0758f00',
                  }),
                });

                if (!refreshResponse.ok) {
                  // Refresh token failed, try to sign in again
                  const newToken = await signInGoDAM();
                  if (!newToken) {
                    reject(new Error("GoDAM token refresh and sign-in failed"));
                  }
                  resolve(newToken);
                  return;
                }

                const tokenData = await refreshResponse.json();
                const newToken = tokenData.access_token;
                const expiresIn = tokenData.expires_in || 3600;
                const expirationTime = Date.now() + expiresIn * 1000;

                // Save new token to storage
                await new Promise((resolve) =>
                  chrome.storage.local.set({ 
                    godamToken: newToken,
                    godamRefreshToken: tokenData.refresh_token || godamRefreshToken,
                    godamTokenExpiration: expirationTime
                  }, () => resolve())
                );

                resolve(newToken);
              } catch (error) {
                // If refresh fails, try to sign in again
                const newToken = await signInGoDAM();
                if (!newToken) {
                  reject(new Error("GoDAM token refresh and sign-in failed"));
                }
                resolve(newToken);
              }
            } else {
              // Token is still valid
              resolve(godamToken);
            }
          }
        }
      });
    });
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Get the access token from Chrome storage
      let token = await getGoDAMAuthToken();

      if (!token) {
        throw new Error("GoDAM sign-in failed");
      }
      
      const formData = new FormData();
      formData.append('file', videoBlob, fileName);

      const url = 'https://upload.godam.io/upload';

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

      if (!uploadResponse.ok) {
        // error message
        const res = await uploadResponse.json();
        console.log(res);
        throw new Error(`Error uploading to GoDAM: ${uploadResponse.status}`);
      }

      const responseData = await uploadResponse.json();
      const filename = responseData.filename;
      const location = responseData.location;
      
      sendResponse({ status: "ok", url: `https://upload.godam.io/${location}` });
      
      // Open the GoDAM file in a new tab (this would be the actual URL in production)
      // chrome.tabs.create({
      //   url: `https://upload.godam.io/${location}`,
      // });

      resolve(`https://upload.godam.io/${location}`);
    } catch (error) {
      console.error("Error uploading to GoDAM:", error.message);
      sendResponse({ status: "error", url: null, message: error.message });
      reject(error);
    }
  });
};

export default saveToGoDAM; 