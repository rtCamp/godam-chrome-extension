import getGoDAMAuthToken from "./getGoDAMAuthToken";

const setOrgList = async () => {

    const godamToken = await getGoDAMAuthToken();

    const baseURL = process.env.GODAM_BASE_URL || 'https://app.godam.io';

    const response = await fetch(`${baseURL}/api/method/frappe_organization.api.manage.list_organizations`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${godamToken}`,
            'Content-Type': 'application/json'
        },
        credentials: 'omit',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch organizations');
    }

    const data = await response.json();

    if (!data && !data.message && !Array.isArray(data.message)) {
        throw new Error('Got Unexpected data');
    }

    if (data.message.length === 0) {
        await chrome.storage.local.remove(["selectedOrg", "orgList"])
        return;
    }

    await chrome.storage.local.set({ orgList: JSON.stringify(data.message) })

    // If there is an Org is already selected dont override that choice.
    const { selectedOrg } = await chrome.storage.local.get(["selectedOrg"])

    if (selectedOrg){
        return
    }
    // Take the first Non Viewer choice and select it. 
    const firstNonViewerOrg = data.message.find(org => org.role.toLowerCase() !== "viewer");

    if (firstNonViewerOrg) {
        await chrome.storage.local.set({ selectedOrg: firstNonViewerOrg["organization_name"] });
    }
};

export default setOrgList;