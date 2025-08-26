const ROLES_ALLOWED_TO_UPLOAD = ["owner", "manager", "creator"]

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

    if(!data && !data.message && !Array.isArray(data.message)){
        throw new Error('Got Unexpected data');
    }else{
        const filteredOrgList = data.message.filter((org)=> ROLES_ALLOWED_TO_UPLOAD.includes(org.role.toLowerCase()))
        
        await chrome.storage.local.set({orgList:JSON.stringify(filteredOrgList)})
        const { selectedOrg } = await chrome.storage.local.get(["selectedOrg"])

        if (!selectedOrg){
            await chrome.storage.local.set({selectedOrg:filteredOrgList[0]["organization_name"]})
        }

    }
    
};

export default setOrgList;