"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ShieldCheck, Truck, Zap, Map, BarChart3, ChevronRight, Globe, Lock, Cpu } from "lucide-react"
import { CinematicBackground } from "@/components/landing/cinematic-background"
import { Spotlight } from "@/components/ui/spotlight"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white overflow-hidden relative font-sans selection:bg-blue-500/30">

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CinematicBackground />
        <Spotlight className="-top-40 -left-10 md:-left-32 md:-top-20 h-screen" fill="white" />
        <Spotlight className="top-10 left-full h-[80vh] w-[50vw]" fill="purple" />
        <Spotlight className="top-28 left-80 h-[80vh] w-[50vw]" fill="blue" />
      </div>

      {/* Floating Navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl">
        <div className="mx-auto flex items-center justify-between px-6 py-3 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all hover:bg-black/70 hover:border-white/20 hover:shadow-[0_0_30px_rgba(37,99,235,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
              <Truck className="h-5 w-5 text-blue-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              CloudTrucks<span className="text-blue-500">Scout</span>
            </span>
          </div>
          <nav className="flex gap-4 items-center">
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors h-8 px-4 rounded-full">
                Log In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="h-8 px-5 rounded-full bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 text-xs font-bold uppercase tracking-wide">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center relative z-10 px-4 pt-40 pb-20">

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-900/10 px-3 py-1 text-xs font-medium text-blue-300 backdrop-blur-md mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            SYSTEMS ONLINE
          </div>

          {/* Title with Text Generate Effect */}
          <div className="min-h-[120px] md:min-h-[160px] flex items-center justify-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-neutral-50 to-neutral-400">
              <TextGenerateEffect words="Command The Open Road" titleClassName="text-center" />
            </h1>
          </div>

          {/* Subtitle */}
          <div className="max-w-2xl mx-auto p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <p className="text-lg md:text-xl text-neutral-400 leading-relaxed font-light">
              Transform market chaos into calculated profit. The ultimate mission control for modern logistics carriers.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-5 w-full justify-center pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] transition-all duration-300 border border-blue-400/20 group">
                Initialize System
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/public/dashboard">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                Live Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento Grid Features */}
        <div className="mt-32 w-full max-w-6xl px-4 animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-700">
          <h2 className="text-center text-3xl font-bold mb-12 text-white/80">Operational Capabilities</h2>
          <BentoGrid>
            <BentoGridItem
              title="Real-Time Recon"
              description="Live scanning of load boards with sub-second latency."
              header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-white/5 relative overflow-hidden group-hover/bento:border-blue-500/30 transition-colors">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 bg-center [mask-image:linear-gradient(black,transparent)]"></div>
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                <ActivityGraph />
              </div>}
              icon={<Zap className="h-4 w-4 text-neutral-500" />}
              className="md:col-span-2"
            />
            <BentoGridItem
              title="Global Reach"
              description="Analyze lanes across the entire continental US network."
              header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-neutral-900 border border-white/5 relative overflow-hidden group-hover/bento:border-purple-500/30 transition-colors">
                <GlobeWireframe />
              </div>}
              icon={<Globe className="h-4 w-4 text-neutral-500" />}
              className="md:col-span-1"
            />
            <BentoGridItem
              title="Profit Algorithms"
              description="AI-driven RPM calculation for maximum margin."
              header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center group-hover/bento:border-green-500/30 transition-colors">
                <BarChart3 className="h-20 w-20 text-neutral-800 group-hover/bento:text-green-500/20 transition-colors" />
              </div>}
              icon={<BarChart3 className="h-4 w-4 text-neutral-500" />}
              className="md:col-span-1"
            />
            <BentoGridItem
              title="Secure Integration"
              description="Enterprise-grade security with direct CloudTrucks sync."
              header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center group-hover/bento:border-orange-500/30 transition-colors">
                <Lock className="h-20 w-20 text-neutral-800 group-hover/bento:text-orange-500/20 transition-colors" />
              </div>}
              icon={<ShieldCheck className="h-4 w-4 text-neutral-500" />}
              className="md:col-span-2"
            />
          </BentoGrid>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 relative z-10 border-t border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-neutral-500">
          <p>© 2026 CloudTrucks Scout. Engineered for Supremacy.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <div className="flex items-center gap-1.5 text-green-500/80">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              All Systems Nominal
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ActivityGraph() {
  return (
    <div className="absolute bottom-4 left-4 right-4 h-24 flex items-end gap-1">
      {[40, 70, 35, 60, 80, 50, 90, 65, 45, 75, 55, 85, 95, 60].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500/40 rounded-t-sm animate-pulse"
          style={{
            height: `${h}%`,
            animationDelay: `${i * 0.1}s`,
            opacity: 0.3 + (i / 14) * 0.7
          }}
        />
      ))}
    </div>
  )
}

function GlobeWireframe() {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-30">
      <div className="w-40 h-40 border border-white/30 rounded-full flex items-center justify-center relative animate-[spin_10s_linear_infinite]">
        <div className="w-full h-full border border-white/10 rounded-full absolute rotate-45"></div>
        <div className="w-full h-full border border-white/10 rounded-full absolute -rotate-45"></div>
        <div className="w-28 h-28 border border-white/30 rounded-full"></div>
      </div>
    </div>
  )
}
