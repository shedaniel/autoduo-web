import {signIn, signOut} from "next-auth/react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import DiscordIcon from "@/components/discord"
import {LoaderCircle, LogOut, Plus} from "lucide-react"
import {GetServerSideProps} from "next"
import {getServerSession} from "next-auth"
import {authOptions} from "@/pages/api/auth/[...nextauth]"
import {getActiveAccounts} from "@/api/data/autoduo"
import Account from "@/types/autoduo"
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import {useDropzone} from "react-dropzone"
import {useCallback, useState} from "react"
import QrScanner from "qr-scanner"
import {toast} from "sonner"
import {useRouter} from "next/router"

type Props = {
    username: string | null
    uid: string | null
    accounts: Account[] | null
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
    let session = await getServerSession(
        context.req,
        context.res,
        authOptions,
    )

    if (session) {
        return {
            props: {
                username: typeof session.username === "string" ? session.username : null,
                uid: typeof session.id === "string" ? session.id : null,
                accounts: (session?.id && typeof session?.id === "string") ? await getActiveAccounts(session.id) : [],
            },
        }
    } else {
        return {
            props: {
                username: null,
                uid: null,
                accounts: null,
            },
        }
    }
}

export default function Home({username, uid, accounts}: Props) {
    if (accounts !== null) {
        return <Page uid={uid ?? ""} username={username ?? ""} accounts={accounts}/>
    } else {
        return <SignIn/>
    }
}

function SignIn() {
    return (
        <div className="flex h-screen items-center justify-center bg-zinc-100">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                    <CardDescription>Login or register with Discord.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pt-6 pb-12">
                    <Button variant="outline" className="bg-[#5865F2] text-white" onClick={() => signIn("discord")}>
                        Sign in with Discord
                        <DiscordIcon className="w-4 h-4 ml-2"/>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

function Page({username, uid, accounts}: {
    username: string,
    uid: string,
    accounts: Account[],
}) {
    const router = useRouter()

    return (
        <div className="flex flex-col h-screen bg-zinc-100">
            <nav className="container mx-auto px-4 py-2 flex justify-end">
                <Button variant="ghost" className="hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4"/>
                    Logout of {username}
                </Button>
            </nav>
            <div className="flex-1 flex flex-col items-center justify-center pb-20">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            AutoDuo
                            <AddDialog uid={uid}/>
                        </CardTitle>
                        <CardDescription>
                            {!!accounts.length && (<>
                                You have {accounts.length} account{accounts.length > 1 ? "s" : ""} active.<br/>
                                AutoDuo will keep approving your Duo requests.
                            </>)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border border-zinc-200 rounded-md shadow-sm bg-zinc-50 divide-y divide-zinc-200 overflow-clip">
                            {!!accounts.length ? (<>
                                {accounts.map(account => (<>
                                    <div key={account.code + account.host} className="flex items-center">
                                        {!!account.customer_logo && (
                                            <img className="w-16 h-16 border-r border-zinc-200 mr-4" src={`data:image/jpeg;base64,${account.customer_logo}`} alt="Logo"/>
                                        )}
                                        {account.customer_name || "Unknown name"}
                                        <Button className="ml-auto mr-4" variant="destructive" size="sm" onClick={() => {
                                            fetch(`api/remove_account?` + new URLSearchParams({
                                                uid: uid,
                                                code: account.code,
                                            }).toString(), {
                                                method: "POST",
                                            }).then(response => {
                                                if (!response.ok) {
                                                    response.json().then(data => data.message, () => response.statusText)
                                                    .then(message => {
                                                        toast.error("Error removing account:\n" + message)
                                                    })
                                                } else {
                                                    toast.success("Account removed successfully.", {
                                                        duration: 4000,
                                                    })
                                                    router.replace(router.asPath)
                                                }
                                            }).catch(error => {
                                                toast.error("Error removing account:\n" + (error instanceof Error ? error.message : error))
                                            })
                                        }}>Remove</Button>
                                    </div>
                                </>))}
                            </>) : (
                                <div className="h-16 text-sm text-zinc-600 font-medium grid items-center text-center">
                                    No AutoDuo active.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function AddDialog({uid}: {
    uid: string
}) {
    const [step, setStep] = useState<"warning" | "scan" | "upload" | "error" | "success">("warning")
    const [error, setError] = useState("")

    const changeStep = useCallback((newStep: typeof step) => {
        setStep(newStep)
    }, [])

    const scan = useCallback((file: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap | SVGImageElement | File | Blob | URL | String) => {
        changeStep("upload")
        QrScanner.scanImage(file, {returnDetailedScanResult: true})
        .then(result => {
            console.log("QR code data:", result.data)
            fetch(`api/add_account?` + new URLSearchParams({
                uid: uid,
                code: result.data,
            }).toString(), {
                method: "POST",
            }).then(response => {
                if (!response.ok) {
                    response.json().then(data => data.message, () => response.statusText)
                    .then(message => {
                        changeStep("error")
                        setError("Error adding new account:\n" + message)
                    })
                } else {
                    changeStep("success")
                    toast.success("New account added successfully.", {
                        duration: 4000,
                    })
                }
            }).catch(error => {
                changeStep("error")
                setError("Error adding new account:\n" + (error instanceof Error ? error.message : error))
            })
        })
        .catch(error => {
            changeStep("error")
            setError("Error parsing QR code image:\n" + (error instanceof Error ? error.message : error))
        })
    }, [])
    const onDrop = useCallback((acceptedFiles: File[]) => {
        scan(acceptedFiles[0])
    }, [])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        maxFiles: 1,
        onDrop,
    })
    const router = useRouter()

    return (<>
        <Dialog onOpenChange={(open) => {
            if (open) {
                changeStep("warning")
                setError("")
            } else {
                router.replace(router.asPath)
            }
        }}>
            <DialogTrigger asChild>
                <Button size="sm" className="font-semibold">
                    New
                    <Plus className="w-4 h-4 ml-2 stroke-[3]"/>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    {step === "warning" ? (<>
                        <DialogTitle>Disclaimer</DialogTitle>
                        <DialogDescription>
                            Having AutoDuo always approving your requests is an <span className="text-red-500 font-bold">extremely big security risk</span>.<br/>
                            Make sure you have a sufficiently complex password, only for the service you are using AutoDuo with.<br/>
                            AutoDuo is <span className="text-red-500 font-bold">not</span> responsible for any damages caused by using this service.<br/><br/>
                            By continuing, you understand the risks.
                        </DialogDescription>
                    </>) : step === "scan" ? (<>
                        <DialogTitle>Subscribe to new account</DialogTitle>
                        <DialogDescription>
                            Import your Duo mobile QR code, you can drag it here or click to upload.<br/>
                            You can screenshot the Duo mobile QR code and upload it here.<br/><br/>
                            <div {...getRootProps()} className="mt-6 w-full h-40 bg-zinc-100 hover:bg-zinc-200 rounded-md border border-zinc-300 border-dashed grid items-center justify-center transition-colors cursor-pointer">
                                <input {...getInputProps()}/>
                                {isDragActive ? "Drop the QR code here" : "Upload QR code"}
                            </div>
                            <Button className="mt-2 w-full bg-zinc-100" variant="outline" onClick={async () => {
                                const clipboardContents = await navigator.clipboard.read()
                                for (const item of clipboardContents) {
                                    if (!item.types.includes("image/png")) {
                                        continue
                                    }
                                    const blob = await item.getType("image/png")
                                    scan(blob)
                                    return
                                }
                                toast.error("No image found in clipboard.", {
                                    duration: 4000,
                                })
                            }}>Upload from clipboard</Button>
                        </DialogDescription>
                    </>) : step === "upload" ? (<>
                        <DialogTitle>Uploading QR code...</DialogTitle>
                        <DialogDescription className="flex items-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin"/>
                            Please wait while we process the QR code image.
                        </DialogDescription>
                    </>) : (<>
                        <DialogTitle>{step === "error" ? "Error" : "Success"}</DialogTitle>
                        <DialogDescription className="flex flex-col whitespace-pre-wrap">
                            {step === "error" ? (<>
                                {error}
                            </>) : (<>
                                Your account is now added!
                            </>)}
                        </DialogDescription>
                    </>)}
                </DialogHeader>
                <DialogFooter>
                    {step === "warning" ? (<>
                        <Button className="ml-auto mt-2" onClick={() => changeStep("scan")}>I understand.</Button>
                    </>) : step === "error" || step === "success" ? (<>
                        <DialogClose asChild>
                            <Button className="ml-auto mt-2">Close</Button>
                        </DialogClose>
                    </>) : (<>
                    </>)}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>)
}
