import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useRegisterPushToken } from "./use-notifications";

/**
 * No-ops in the browser (registerSW handles web push separately, out of
 * scope here) — only wires up native push registration when running inside
 * the Capacitor shell on a device/emulator.
 */
export function usePushRegistration(enabled: boolean) {
  const registerPushToken = useRegisterPushToken();

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function setup() {
      const permission = await PushNotifications.requestPermissions();
      if (cancelled || permission.receive !== "granted") return;

      await PushNotifications.register();
    }

    const registrationListener = PushNotifications.addListener("registration", (token) => {
      registerPushToken.mutate({ token: token.value, platform: Capacitor.getPlatform() as "ios" | "android" });
    });

    void setup();

    return () => {
      cancelled = true;
      void registrationListener.then((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
