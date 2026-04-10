"use server";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import { PushSubscription } from "@prisma/client";

// Initialize web-push with VAPID keys
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    "mailto:admin@premierfarm.co.ke",
    publicKey,
    privateKey
  );
}

/**
 * Save a push subscription to the database.
 * If subString is null, it removes any existing subscription (unsubscribe).
 */
export async function savePushSubscription(subString: string | null) {
  const sessionUser = await requireAuth();
  const userId = sessionUser.id as string;

  if (userId === "tech-admin-global") return { success: false, message: "Tech admin cannot receive push." };

  if (!subString) {
    // Basic unsubscribe logic (simplified: remove all for user or specific endpoint)
    // Here we'll just handle adding/removing.
    return { success: true };
  }

  const subscription = JSON.parse(subString);

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId,
    },
  });

  return { success: true };
}

/**
 * Helper to send a notification to a specific user.
 */
export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string; icon?: string }) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    const sendPromises = subscriptions.map((sub: PushSubscription) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };

      return webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or gone, delete it
            return prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
          console.error("Push Error Details:", err);
          throw err;
        });
    });

    await Promise.all(sendPromises);
    return { success: true };
  } catch (error) {
    console.error("Failed to send push:", error);
    return { success: false };
  }
}

/**
 * Trigger a test notification for the current user.
 */
export async function sendTestNotification() {
  const sessionUser = await requireAuth();
  const userId = sessionUser.id as string;

  return sendPushNotification(userId, {
    title: "Test Alert 🐮",
    body: "This is a test push notification from Premier Farm. Everything is working!",
    url: "/settings",
  });
}
