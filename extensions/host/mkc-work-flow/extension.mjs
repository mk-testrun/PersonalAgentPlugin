import { joinSession } from "@github/copilot-sdk/extension";
import { startBridge } from "./bridge.mjs";
const failMode = ["mkc-work-guardian", "mkc-work-sentinel"].includes("mkc-work-flow") ? "closed" : "open";
export default await startBridge(joinSession, { name: "mkc-work-flow", failMode });
