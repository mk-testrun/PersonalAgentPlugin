import { joinSession } from "@github/copilot-sdk/extension";
import { startBridge } from "./bridge.mjs";
const failMode = ["mkc-work-guardian", "mkc-work-sentinel"].includes("mkc-work-guardian") ? "closed" : "open";
export default await startBridge(joinSession, { name: "mkc-work-guardian", failMode, extensionUrl: import.meta.url });
