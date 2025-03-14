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

      // For this implementation, we'll just log the message
      console.log("Video uploaded to GoDAM");
      
      // In a real implementation, you would upload the video to GoDAM here
      // using FormData and fetch API similar to the Google Drive implementation
      
      // Example of what the actual implementation might look like:
      /*
      const formData = new FormData();
      formData.append('file', videoBlob, fileName);
      
      const uploadResponse = await fetch(
        "https://frappe-transcoder-api.rt.gw/api/method/upload_file",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Error uploading to GoDAM: ${uploadResponse.status}`);
      }

      const responseData = await uploadResponse.json();
      const fileId = responseData.file_id;
      */
      
      // For now, we'll simulate a successful upload
      const fileId = "godam_" + Date.now();
      
      sendResponse({ status: "ok", url: fileId });
      
      // Open the GoDAM file in a new tab (this would be the actual URL in production)
      chrome.tabs.create({
        url: `https://frappe-transcoder-api.rt.gw/desk#Form/File/${fileId}`,
      });

      resolve(`https://frappe-transcoder-api.rt.gw/desk#Form/File/${fileId}`);
    } catch (error) {
      console.error("Error uploading to GoDAM:", error.message);
      sendResponse({ status: "ew", url: null });
      reject(error);
    }
  });
};

export default saveToGoDAM; 