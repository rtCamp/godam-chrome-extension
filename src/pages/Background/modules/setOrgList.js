const setOrgList = async () => {
    const { godamToken } = await chrome.storage.local.get(["godamToken"]);
    if (!godamToken) {
        throw new Error('Auth token not found');
    }

    const response = await fetch('https://app-godam-preprod.rt.gw/api/method/frappe_organization.api.manage.list_organizations', {
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

    console.log(!data, !data.message, !Array.isArray(data.message));

    if(!data && !data.message && !Array.isArray(data.message)){
        throw new Error('Got Unexpected data');
    }else{
        // @todo: Filter by role. viewer role is not allowed to uplodad
        await chrome.storage.local.set({orgList:JSON.stringify(data.message)})
        await chrome.storage.local.set({selectedOrg:data.message[0]["organization_name"]})

    }
    
};

export default setOrgList;