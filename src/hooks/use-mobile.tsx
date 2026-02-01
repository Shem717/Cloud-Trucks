'use client'

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768 // md breakpoint

export function useMobile() {
    const [isMobile, setIsMobile] = useState(false)
    const [isTablet, setIsTablet] = useState(false)
    const [isTouchDevice, setIsTouchDevice] = useState(false)

    useEffect(() => {
        // Check if touch device
        const checkTouch = () => {
            setIsTouchDevice(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0
            )
        }

        // Check screen size
        const checkScreenSize = () => {
            const width = window.innerWidth
            setIsMobile(width < MOBILE_BREAKPOINT)
            setIsTablet(width >= MOBILE_BREAKPOINT && width < 1024)
        }

        // Initial checks
        checkTouch()
        checkScreenSize()

        // Listen for resize
        const handleResize = () => {
            checkScreenSize()
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return {
        isMobile,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        isTouchDevice,
        // Convenience: true if should show mobile-optimized UI
        shouldUseMobileUI: isMobile || isTouchDevice
    }
}

// Server-safe version that defaults to desktop
export function useMobileSSR() {
    const [mounted, setMounted] = useState(false)
    const mobileState = useMobile()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return {
            isMobile: false,
            isTablet: false,
            isDesktop: true,
            isTouchDevice: false,
            shouldUseMobileUI: false
        }
    }

    return mobileState
}
