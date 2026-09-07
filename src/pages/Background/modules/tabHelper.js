/**
 * Checks if a URL is restricted (cannot receive content script messages)
 * @param {string} urlString - The URL to check
 * @returns {boolean} - True if the URL is restricted, false otherwise
 */
const isRestrictedUrl = (urlString) => {
  if (!urlString || urlString === "" || urlString === "about:blank") {
    return true;
  }

  // Check for chrome:// URLs
  if (urlString.startsWith("chrome://")) {
    return true;
  }

  // Parse URL and check hostname for Chrome Web Store
  try {
    const url = new URL(urlString);
    const restrictedHosts = [
      'chromewebstore.google.com',
      'chrome.google.com'
    ];

    // Check if hostname matches restricted hosts
    return restrictedHosts.some(restrictedHost => {
      return url.hostname === restrictedHost ||
        url.hostname.endsWith('.' + restrictedHost);
    });
  } catch (e) {
    // If URL parsing fails, treat it as restricted for safety
    return true;
  }
};

const sendMessageTab = async (
  tabId,
  message,
  responseCallback = null,
  noTab = null
) => {
  if (tabId === null) {
    throw new Error("Tab ID is required and cannot be null");
  }
  if (message === null) {
    throw new Error("Message is required and cannot be null");
  }

  try {
    const tab = await chrome.tabs.get(tabId);

    if (!tab || isRestrictedUrl(tab.url)) {
      throw new Error("Cannot send message to restricted page (system pages, Chrome Web Store) or tab without valid URL");
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
