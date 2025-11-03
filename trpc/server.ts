import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { makeQueryClient } from "./query-client";
import { appRouter } from "@/server/trpc/routers/_app";
import { createCallerFactory } from "@/server/trpc/init";
import { createContext } from "@/server/trpc/context";


export const getQueryClient = cache(makeQueryClient);

const caller = createCallerFactory(appRouter)(createContext);

const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
    caller,
    getQueryClient
);

export { trpc, HydrateClient }
