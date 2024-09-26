// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type {NextApiRequest, NextApiResponse} from "next"
import {getServerSession} from "next-auth"
import {authOptions} from "@/pages/api/auth/[...nextauth]"

type Data = {
    message: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>,
) {
    const session = await getServerSession(req, res, authOptions)
    if (!session)
        return res.status(401).json({message: "Unauthorized"})
    if (!req.query.uid || !req.query.code || typeof req.query.uid !== "string" || typeof req.query.code !== "string")
        return res.status(400).json({message: "Bad Request"})
    if (session.id !== req.query.uid)
        return res.status(403).json({message: "Forbidden"})
    try {
        const response = await fetch(`${process.env.BACKEND_URL}/remove_account?` + new URLSearchParams({
            uid: req.query.uid,
            code: req.query.code,
        }).toString(), {
            method: "POST",
            headers: {
                "x-api-key": process.env.BACKEND_SECRET!,
            },
        })
        if (!response.ok)
            throw new Error(await response.json().then(data => data.message, error => response.statusText))
        res.status(200).json({message: "Success"})
    } catch (e) {
        res.status(400).json({message: e instanceof Error ? e.message : "Unknown error"})
    }
}
