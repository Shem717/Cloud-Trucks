import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Truck, Zap, Map, BarChart3, ChevronRight } from "lucide-react"
import { CinematicBackground } from "@/components/landing/cinematic-background"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white overflow-hidden relative font-sans">
      {/* Background Video */}
      {/* Custom Cinematic Background (Digital Highway) */}
      <CinematicBackground />

      {/* Header */}
      <header className="px-6 h-20 flex items-center justify-between z-50 sticky top-0 transition-all duration-300">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 group-hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white drop-shadow-md">
            CloudTrucks<span className="text-blue-400">Scout</span>
          </span>
        </div>
        <nav className="flex gap-4 items-center">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              Log In
            </Button>
          </Link>
          <Link href="/login">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-6 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all duration-300 backdrop-blur-sm border border-blue-400/30">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 text-center pb-20">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-900/30 px-4 py-1.5 text-sm text-blue-200 backdrop-blur-md mb-8 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="font-medium tracking-wide text-xs uppercase">Live Market Intelligence</span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-6 drop-shadow-2xl max-w-5xl leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          Command The <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-400 animate-gradient-x bg-[length:200%_auto]">
            Open Road
          </span>
        </h1>

        {/* Subtitle */}
        {/* Subtitle */}
        <div className="max-w-2xl mx-auto mb-10 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-light mix-blend-plus-lighter">
            Stop hunting in the dark. Use our automated mission control to scan, filter, and secure high-value loads before they hit the general boards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-5 w-full justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <Link href="/login">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-white text-black hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              Start Scanning
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/public/dashboard">
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-white/20 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 hover:border-white/40 transition-all duration-300">
              Live Demo
            </Button>
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap gap-6 mt-20 md:mt-28 max-w-3xl mx-auto justify-center text-center animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Zap className="h-4 w-4 text-blue-400" />
            <span>Real-Time Load Scanning</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Map className="h-4 w-4 text-blue-400" />
            <span>Route Optimization</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <span>Profit Analytics</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>Broker Vetting</span>
          </div>
        </div>

      </main>

      {/* Footer Overlay */}
      <footer className="w-full py-8 px-6 relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium tracking-wider uppercase">
          <p>© 2026 CloudTrucks Scout. Engineered for Logistics.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
