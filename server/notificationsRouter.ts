/**
 * LiveLock — Notifications Router
 * Manages web push subscriptions and SMS notification preferences.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { pushSubscriptions, users } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getVapidPublicKey } from "./push";

export const notificationsRouter = router({
  /**
   * Return the VAPID public key so the client can subscribe to push notifications.
   * Public — no auth required (needed before login).
   */
  getVapidPublicKey: publicProcedure.query(() => {
    return { publicKey: getVapidPublicKey() };
  }),

  /**
   * Save a push subscription for the current user.
   * Upserts by endpoint to avoid duplicates.
   */
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Delete any existing subscription with this endpoint (dedup)
      await db.delete(pushSubscriptions).where(
        and(
          eq(pushSubscriptions.userId, ctx.user.id),
          eq(pushSubscriptions.endpoint, input.endpoint)
        )
      );

      await db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      });

      return { success: true };
    }),

  /**
   * Remove all push subscriptions for the current user (or a specific endpoint).
   */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (input.endpoint) {
        await db.delete(pushSubscriptions).where(
          and(
            eq(pushSubscriptions.userId, ctx.user.id),
            eq(pushSubscriptions.endpoint, input.endpoint)
          )
        );
      } else {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, ctx.user.id));
      }

      return { success: true };
    }),

  /**
   * Check whether the current user has any active push subscriptions.
   */
  getPushStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { subscribed: false };
    const subs = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, ctx.user.id))
      .limit(1);
    return { subscribed: subs.length > 0 };
  }),

  /**
   * Save SMS notification preferences (phone number + enabled toggle).
   */
  updateSmsSettings: protectedProcedure
    .input(z.object({
      phone: z.string().max(20).nullable(),
      smsNotifications: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Only enable SMS if a phone number is provided
      const smsEnabled = input.smsNotifications && !!input.phone?.trim();

      await db.update(users)
        .set({ phone: input.phone?.trim() ?? null, smsNotifications: smsEnabled })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
