import type {AuthOptions, Profile} from "next-auth"
import NextAuth, {CallbacksOptions} from "next-auth"
import Discord, {DiscordProfile} from "next-auth/providers/discord"

export const authOptions: AuthOptions = {
    providers: [
        Discord({
            clientId: process.env.DISCORD_ID!,
            clientSecret: process.env.DISCORD_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({token, account, profile}: Parameters<CallbacksOptions["jwt"]>[0]) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token.userToken = account.userToken
            }

            if (profile) {
                token.id = (profile as DiscordProfile).id
                token.username = (profile as DiscordProfile).username
            }
            return token
        },
        async session({session, token}: Parameters<CallbacksOptions["session"]>[0]) {
            // Send properties to the client, like an access_token from a provider.
            session.userToken = token.userToken
            session.id = token.id
            session.username = token.username
            return session
        },
    },
}
export default NextAuth(authOptions)