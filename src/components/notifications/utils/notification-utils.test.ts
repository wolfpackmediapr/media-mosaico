import { describe, it, expect, afterEach, vi } from "vitest";
import { requestNotificationPermission, showBrowserNotification } from "./notification-utils";

const g = globalThis as any;

afterEach(() => {
  delete g.Notification;
  vi.restoreAllMocks();
});

describe("requestNotificationPermission", () => {
  it("resolves false without throwing when the Notification API is unavailable (iOS Safari)", async () => {
    delete g.Notification;
    expect(typeof (globalThis as any).Notification).toBe("undefined");

    await expect(requestNotificationPermission()).resolves.toBe(false);
  });

  it("requests permission when it is still 'default'", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    g.Notification = { permission: "default", requestPermission };

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("reports the existing permission without re-prompting", async () => {
    const requestPermission = vi.fn();
    g.Notification = { permission: "denied", requestPermission };

    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });
});

describe("showBrowserNotification", () => {
  it("returns false when the Notification API is unavailable", () => {
    delete g.Notification;
    expect(showBrowserNotification("t", "b")).toBe(false);
  });

  it("creates a notification when permission is granted", () => {
    const ctor = vi.fn() as unknown as ReturnType<typeof vi.fn> & { permission: string };
    ctor.permission = "granted";
    g.Notification = ctor;

    expect(showBrowserNotification("t", "b")).toBe(true);
    expect(ctor).toHaveBeenCalledWith("t", { body: "b" });
  });
});
