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
              const baseUrl = process.env.GODAM_BASE_URL || 'https://app.godam.io';
              try {
                const refreshResponse = await fetch(`${baseUrl}/api/method/frappe.integrations.oauth2.get_token`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
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

      const uploadUrl =  process.env.GODAM_UPLOAD_URL || 'https://godam-upload.rt.gw'; // Todo: Replace the option with production URL

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
      const filename = responseData.filename;
      const location = responseData.location;
      const videoName = responseData?.file_informations?.name;

      const baseURL = process.env.GODAM_BASE_URL || 'https://app.godam.io';
    
      sendResponse({ status: "ok", url: `${baseURL}/web/video/${videoName}` }); 

      resolve(`${baseURL}/${location}`);
    } catch (error) {
      sendResponse({ status: "error", url: null, message: error.message });
      reject(error);
    }
  });
};

export default saveToGoDAM; 