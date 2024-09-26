import {DefaultSession} from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            /** The user's postal address. */
            address: string
        } & DefaultSession["user"]
        userToken: string | unknown
        id: string | unknown
        username: string | unknown
    }
}