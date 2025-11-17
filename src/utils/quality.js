export const QUALITY_LEVELS = ["4k", "1080p", "720p", "480p"];

export function detectAutoQuality({ ram = 0, width = 0, height = 0 }) {
    const safeRam = typeof ram === "number" ? ram : 0;
    const safeWidth = typeof width === "number" ? width : 0;
    const safeHeight = typeof height === "number" ? height : 0;

    if (safeRam >= 8 && safeWidth >= 3840 && safeHeight >= 2160) {
        return "4k";
    }

    if (safeRam >= 4 && safeWidth >= 1920 && safeHeight >= 1080) {
        return "1080p";
    }

    if (safeRam >= 2 && safeWidth >= 1280 && safeHeight >= 720) {
        return "720p";
    }

    return "480p";
}

