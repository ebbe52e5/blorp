import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "io.zhifou.app",
  appName: "ZhiFou",
  webDir: "dist",
  appendUserAgent: "Blorp",
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Ionic,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: false,
    },
  },
  ios: {
    preferredContentMode: "mobile",
  },
};

export default config;
