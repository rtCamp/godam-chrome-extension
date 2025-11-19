const sendMessageTab = async (
  tabId,
  message,
  responseCallback = null,
  noTab = null
) => {
  if (tabId === null || message === null) {
    throw new Error("Tab ID or message is null");
  }

  try {
    const tab = await chrome.tabs.get(tabId);

    if (
      !tab ||
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chromewebstore.google.com") ||
      tab.url.startsWith("chrome.google.com/webstore") ||
      tab.url === "" ||
      tab.url === "about:blank"
    ) {
      throw new Error("Invalid tab URL");
    }

    const response = await chrome.tabs.sendMessage(tab.id, message);

    if (responseCallback && typeof responseCallback === "function") {
      responseCallback(response);
    }

    return response;
  } catch (error) {
    console.error("Error sending message to tab:", error);
    if (noTab && typeof noTab === "function") {
      noTab();
    }
    throw error;
  }
};

const focusTab = async (tabId) => {
  if (tabId === null) return;

  try {
    const tab = await chrome.tabs.get(tabId);

    if (tab && tab.id) {
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.update(tab.id, { active: true });
    }
  } catch (error) {
    // Tab doesn't exist or can't be accessed
  }
};

const removeTab = async (tabId) => {
  if (tabId === null) return;

  try {
    const tab = await chrome.tabs.get(tabId);

    if (tab && tab.id) {
      await chrome.tabs.remove(tab.id);
    }
  } catch (error) {
    // Tab doesn't exist or can't be accessed
  }
};

// Get current tab (requires activeTab permission)
const getCurrentTab = async () => {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

const createTab = async (url, translate = false, active = false) => {
  if (!url) return;

  if (translate) {
    const locale = chrome.i18n.getMessage("@@ui_locale");
    if (!locale.includes("en")) {
      url =
        "http://translate.google.com/translate?js=n&sl=auto&tl=" +
        locale +
        "&u=" +
        url;
    }
  }

  return await chrome.tabs.create({
    url: url,
    active: active,
  });
};

export { sendMessageTab, focusTab, removeTab, getCurrentTab, createTab };
