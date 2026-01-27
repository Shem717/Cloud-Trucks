import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Truck, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <Truck className="h-6 w-6 text-blue-500" />
          <span>CloudTrucks<span className="text-blue-500">Scout</span></span>
        </div>
        <nav className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium hover:text-blue-400">
              Log In
            </Button>
          </Link>
          <Link href="/login">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="w-full py-24 md:py-32 lg:py-40 flex items-center justify-center border-b border-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black">
          <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-400 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
              v1.0 Production Ready
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 max-w-3xl">
              Automate Your Load Hunting
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl leading-relaxed">
              Stop refreshing. Start booking. The intelligent automated scanner that finds the best CloudTrucks loads before anyone else.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 min-w-[200px]">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-white text-black hover:bg-gray-200">
                  Start Scanning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/public/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base border-white/20 text-white hover:bg-white/10">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-24 bg-black">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Lightning Fast Scanning</h3>
                <p className="text-gray-400 leading-relaxed">
                  Automated scraping engine checks for high-paying loads every 15 minutes via Playwright integration.
                </p>
              </div>
              <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Bank-Grade Security</h3>
                <p className="text-gray-400 leading-relaxed">
                  Your credentials are encrypted with AES-256-GCM. We never store raw passwords and use strict RLS policies.
                </p>
              </div>
              <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Smart Filtering</h3>
                <p className="text-gray-400 leading-relaxed">
                  Define your exact criteria: rate per mile, equipment type, weight, and lanes. We filter the noise.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 border-t border-white/10 bg-black">
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© 2026 CloudTrucks Scout. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
