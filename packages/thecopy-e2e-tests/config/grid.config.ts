/**
 * إعدادات شبكة سيلينيوم
 */

import type { GridConfig } from "./types.js";

export const gridConfig: GridConfig = {
  hubUrl: process.env.SELENIUM_HUB_URL ?? "http://localhost:4444",
  vncUrls: {
    chromium:
      process.env.SELENIUM_VNC_CHROMIUM ??
      "http://localhost:7900/?autoconnect=1&resize=remote",
    firefox:
      process.env.SELENIUM_VNC_FIREFOX ??
      "http://localhost:7901/?autoconnect=1&resize=remote",
    edge:
      process.env.SELENIUM_VNC_EDGE ??
      "http://localhost:7902/?autoconnect=1&resize=remote",
  },
  videoEnabled: process.env.SELENIUM_RECORD_VIDEO === "1",
};
