import getGoDAMAuthToken from "./getGoDAMAuthToken";

// Function to upload a video to GoDAM
const saveToGoDAM = async (videoBlob, fileName, sendResponse) => {
    try {
        const token = await getGoDAMAuthToken();
        const formData = new FormData();
        formData.append('file', videoBlob, fileName);

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

        sendResponse({ status: "ok", url: `${baseURL}/web/video/${videoName}` });

    } catch (error) {
        sendResponse({ status: "error", url: null, message: error.message });

    }



};

export default saveToGoDAM; 