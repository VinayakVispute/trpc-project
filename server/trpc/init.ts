import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
    if (!ctx?.auth?.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User is not authenticated' });
    }

    return next({
        ctx: {
            auth: ctx.auth,
            userId: ctx.auth.userId,
            db: ctx.db,

        }
    })
})

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);

export const createCallerFactory = t.createCallerFactory;
