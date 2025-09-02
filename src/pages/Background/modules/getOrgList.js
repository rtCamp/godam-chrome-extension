const getOrgList = async (sendResponse) => {
    const { orgList } = await chrome.storage.local.get(["orgList"])
    
    if (orgList){
        sendResponse(JSON.parse(orgList))
    }else{
        sendResponse([])
    }
};

export default getOrgList;