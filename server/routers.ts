import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getEarlyAccessSignups, insertEarlyAccessSignup, updateUserDisplayName } from "./db";
import { sendEarlyAccessConfirmation } from "./email";
import { webauthnRouter } from "./webauthnRouter";
import { passwordRouter } from "./passwordRouter";
import { sessionsRouter, teamsRouter, auditRouter, usersRouter } from "./sessionsRouter";
import { notificationsRouter } from "./notificationsRouter";
import { z } from "zod";

const earlyAccessRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email().max(320),
        company: z.string().min(1).max(200),
        teamSize: z.string().min(1).max(50),
        useCase: z.string().min(1).max(200),
        message: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Save to database
      await insertEarlyAccessSignup(input);

      // 2. Send confirmation email to the user (non-fatal)
      await sendEarlyAccessConfirmation({
        toEmail: input.email,
        firstName: input.firstName,
        company: input.company,
      }).catch(() => {
        console.warn("[EarlyAccess] Confirmation email failed but signup was saved.");
      });

      // 3. Notify owner via Manus notification service (non-fatal)
      await notifyOwner({
        title: `New LiveLock Early Access Request — ${input.firstName} ${input.lastName}`,
        content: [
          `**Name:** ${input.firstName} ${input.lastName}`,
          `**Email:** ${input.email}`,
          `**Company:** ${input.company}`,
          `**Team Size:** ${input.teamSize}`,
          `**Use Case:** ${input.useCase}`,
          input.message ? `**Message:** ${input.message}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      }).catch(() => {
        console.warn("[EarlyAccess] Owner notification failed but signup was saved.");
      });

      return { success: true };
    }),

  // Admin-only: list all signups with aggregate stats
  listSignups: adminProcedure.query(async () => {
    const signups = await getEarlyAccessSignups();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const todayCount = signups.filter(s => new Date(s.createdAt) >= todayStart).length;
    const weekCount = signups.filter(s => new Date(s.createdAt) >= weekStart).length;

    return {
      signups,
      stats: {
        total: signups.length,
        today: todayCount,
        thisWeek: weekCount,
      },
    };
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    updateProfile: protectedProcedure
      .input(z.object({ displayName: z.string().min(1).max(100).trim() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserDisplayName(ctx.user.id, input.displayName);
        return { success: true, displayName: input.displayName };
      }),
  }),
  earlyAccess: earlyAccessRouter,
  webauthn: webauthnRouter,
  password: passwordRouter,
  sessions: sessionsRouter,
  teams: teamsRouter,
  audit: auditRouter,
  users: usersRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
