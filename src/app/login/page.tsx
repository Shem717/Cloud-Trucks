import { login, signup } from '../auth/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">
             {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none" />

            {/* Back Button / Nav */}
            <div className="absolute top-8 left-8">
                 <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tighter text-white/80 hover:text-white transition-colors">
                    <Truck className="h-5 w-5 text-blue-500" />
                    <span>CloudTrucks<span className="text-blue-500">Scout</span></span>
                </Link>
            </div>

            <Card className="w-full max-w-[400px] border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl relative z-10 m-4">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-blue-500/20">
                         <Truck className="h-6 w-6 text-blue-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">Welcome back</CardTitle>
                    <CardDescription className="text-gray-400">
                        Enter your credentials to access the scanner
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white/80">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-blue-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-white/80">Password</Label>
                                {/* <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">Forgot password?</span> */}
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="bg-white/5 border-white/10 text-white focus-visible:ring-blue-500/50"
                            />
                        </div>

                        <div className="pt-2 space-y-3">
                            <Button formAction={login} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                                Sign In
                            </Button>
                            <Button formAction={signup} variant="outline" className="w-full border-white/10 hover:bg-white/5 text-white hover:text-white bg-transparent">
                                Create Account
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-white/5 py-4">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Secure, automated loadboard monitoring
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
