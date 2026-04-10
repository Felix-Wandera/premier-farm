"use client";
import { useEffect, useCallback } from "react";
import { savePushSubscription } from "@/actions/push.actions";

export function NotificationManager() {
  const registerServiceWorker = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("Service Worker registered with scope:", registration.scope);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  return null; // This component doesn't render anything UI-wise by default
}

/**
 * Utility function to subscribe a user to push notifications.
 * Can be called from the Settings page toggle.
 */
export async function subscribeUser() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const registration = await navigator.serviceWorker.ready;

  // Get the server's public key from environment variables
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("VAPID public key not found.");

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Send to server to save in DB
  await savePushSubscription(JSON.stringify(subscription));

  return true;
}

export async function unsubscribeUser() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    // Implementation for server-side removal can be added to savePushSubscription
    await savePushSubscription(null);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
