import posthog from 'posthog-js/dist/module.no-external';
import { v7 as uuidv7 } from 'uuid';

let isInitialized = false;

/**
 * @async
 * @description Returns a unique UUID stored in local storage for this device.
 * @returns {Promise<string>} Shared distinct device ID.
 */
export async function getSharedDistinctId() {
    const stored = await chrome.storage.local.get(['posthog_distinct_id']);
    if (stored.posthog_distinct_id) {
        return stored.posthog_distinct_id;
    }

    const distinctId = uuidv7();
    await chrome.storage.local.set({ posthog_distinct_id: distinctId });
    return distinctId;
}

/**
 * @async
 * @description Initializes PostHog for the current device. Will be called from background worker.
 * @returns {Promise<void>}
 */
export const initPostHog = async () => {
    if (isInitialized || !process.env.POSTHOG_KEY) {
        return;
    }

    try {
        const distinctId = await getSharedDistinctId();

        posthog.init(process.env.POSTHOG_KEY, {
            bootstrap: {
                distinctID: distinctId
            },
            api_host: process.env.POSTHOG_HOST,
            persistence: 'memory',
            disable_external_dependency_loading: true,
            capture_pageview: false,
            autocapture: false,
            disable_session_recording: true,
            disable_surveys: true,
        });

        isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize PostHog:', error);
    }
};

/**
 * @description Tracks an event for the current device. Will be called from background worker.
 * @param {string} eventName - The name of the event to track.
 * @param {Object} properties - The properties to track with the event.
 * @returns {void}
 */
export const trackEvent = (eventName, properties = {}) => {
    if (!isInitialized) return;

    try {
        posthog.capture(eventName, {
            ...properties,
            extension_version: chrome.runtime.getManifest().version,
        });
    } catch (error) {
        console.error('Failed to track event:', error);
    }
};

export default {
    initPostHog,
    trackEvent,
    getSharedDistinctId,
};
