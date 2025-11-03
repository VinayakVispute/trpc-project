"use client";

import type { AppRouter } from "@/server/trpc/routers/_app";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";
export const trpc = createTRPCReact<AppRouter>();

let clientQueryClientSingleton: QueryClient;
function getQueryClient() {
    // For server create new client
    if (typeof window === "undefined") return makeQueryClient();
    if (!clientQueryClientSingleton) {
        clientQueryClientSingleton = makeQueryClient();
    }
    return clientQueryClientSingleton;
}

function getUrl() {
    // need to change for deploy url
    return "http://localhost:3000/api/trpc";
}

export function TRPCProvider(props: PropsWithChildren) {
    const queryClient = getQueryClient();
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    transformer: superjson,
                    url: getUrl(),
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {props.children}
            </QueryClientProvider>
        </trpc.Provider>
    );
}
