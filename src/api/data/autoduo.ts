import Account from "@/types/autoduo"

async function getActiveAccounts(id: string): Promise<Account[]> {
    let req = await fetch(`${process.env.BACKEND_URL}/get_accounts/${id}`, {
        headers: {
            "x-api-key": process.env.BACKEND_SECRET!
        }
    })
    console.log(req.body)
    req = await req.json().then(data => data, err => {
        console.error(err)
        return []
    })
    return req as unknown as Account[]
}

export {getActiveAccounts}