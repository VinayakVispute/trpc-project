import { auth } from '@clerk/nextjs/server'
import prisma from '../prisma'

export const createContext = async () => {
    return {
        auth: await auth(),
        db: prisma,
    }
}
export type Context = Awaited<ReturnType<typeof createContext>>


/*
Things I have to understand as per order : 
1. TRPCError
2. Context 
3. Middleware
4. Router
5. UseUtils
6. Client Side use of tRPC
*/