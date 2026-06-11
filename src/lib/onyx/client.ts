import type { BetterAuthClientPlugin } from "better-auth";
import type { onyx } from "./plugin";

export const onyxClient = () => {
  return {
    id: "onyx",
    $InferServerPlugin: {} as ReturnType<typeof onyx>,
    pathMethods: {
      "/onyx/challenge": "POST",
      "/onyx/verify": "POST",
      "/onyx/link": "POST",
    },
  } satisfies BetterAuthClientPlugin;
};
