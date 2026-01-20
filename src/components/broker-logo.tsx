"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface BrokerLogoProps {
    name?: string;
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function BrokerLogo({ name, className, size = "md" }: BrokerLogoProps) {
    if (!name) return null;

    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const sizeClasses = {
        sm: "h-5 w-5",
        md: "h-8 w-8",
        lg: "h-12 w-12"
    };

    const logos: Record<string, React.ReactNode> = {
        // C.H. Robinson - Blue Hexagon with Arrows
        chrobinson: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M12 2L3.34 7V17L12 22L20.66 17V7L12 2Z" stroke="#00AEEF" strokeWidth="2" fill="none" />
                <path d="M12 6V12L17.2 9" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12L6.8 9" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12V18" stroke="#00AEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        // Logistic Dynamics
        logisticdynamics: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000" />
                <path d="M7 12H17" stroke="#FFD700" strokeWidth="3" />
                <path d="M12 7V17" stroke="#FFD700" strokeWidth="3" />
            </svg>
        ),
        // Uber Freight - Black Square with Box/U
        uberfreight: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="24" height="24" rx="4" fill="black" />
                <path d="M7 7V15C7 16.1046 7.89543 17 9 17H15C16.1046 17 17 16.1046 17 15V7H14V14H10V7H7Z" fill="white" />
            </svg>
        ),
        // J.B. Hunt - Yellow Scroll Icon
        jbhunt: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect x="2" y="4" width="20" height="16" rx="2" fill="#FFD200" />
                <path d="M6 8H18" stroke="black" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 12H18" stroke="black" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 16H14" stroke="black" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        // TQL - Stylized Text Icon
        tql: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="12" fill="#003366" />
                <path d="M7 7H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 7V17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        // Amazon Freight - Smile Arrow
        amazonfreight: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M4 14C7 18 17 18 20 14" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M20 14L18 11" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 14L21.5 11" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        // Echo Global - Orange Circle E
        echoglobal: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="10" stroke="#FF6600" strokeWidth="2" fill="white" />
                <path d="M8 8H16M8 12H14M8 16H16" stroke="#003366" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        // Geodis - Blue Circle with Figure
        geodis: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="12" fill="#2E2EFE" />
                <path d="M12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6Z" fill="white" />
                <path d="M17 9L14.5 9L13 14L15.5 19L18 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 9L9.5 9L11 14L8.5 19L6 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M9.5 9L14.5 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
        // Total Quality Logistics (full name match)
        totalqualitylogistics: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="12" fill="#003366" />
                <path d="M7 7H17" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 7V17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        // Geodis (full name match)
        geodistransportationsolutions: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="12" fill="#2E2EFE" />
                <path d="M12 7C13.1 7 14 6.1 14 5C14 3.9 13.1 3 12 3C10.9 3 10 3.9 10 5C10 6.1 10.9 7 12 7Z" fill="white" />
                <path d="M10 10C10 10 8 12 7 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 10C14 10 16 12 17 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 10V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        // Arrive Logistics - Stylized A/Triangle
        arrivelogistics: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="24" height="24" rx="4" fill="#000000" />
                <path d="M12 6L5 18H19L12 6Z" fill="#00FF00" />
                <path d="M12 10L9 15H15L12 10Z" fill="black" />
            </svg>
        ),
        // Spot Freight - Blue/Orange Clean
        spotfreight: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="12" fill="#0055FF" />
                <circle cx="12" cy="12" r="4" fill="#FF8800" />
            </svg>
        ),
        // GlobalTranz - Globe concept
        globaltranzenterprises: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="11" stroke="#00AAFF" strokeWidth="2" fill="white" />
                <path d="M2 12H22" stroke="#00AAFF" strokeWidth="2" />
                <ellipse cx="12" cy="12" rx="6" ry="11" stroke="#00AAFF" strokeWidth="2" />
            </svg>
        ),
        // GlobalTranz (short match)
        globaltranz: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="11" stroke="#00AAFF" strokeWidth="2" fill="white" />
                <path d="M2 12H22" stroke="#00AAFF" strokeWidth="2" />
                <ellipse cx="12" cy="12" rx="6" ry="11" stroke="#00AAFF" strokeWidth="2" />
            </svg>
        ),
        // NFI Industries
        nfi: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="24" height="24" rx="4" fill="#005596" />
                <path d="M6 17V7L12 17V7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 7V17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
        ),
        // National Consolidation Services
        nationalconsolidation: (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="12" cy="12" r="12" fill="#D32F2F" />
                <path d="M12 2V22" stroke="white" strokeWidth="2" />
                <path d="M2 12H22" stroke="white" strokeWidth="2" />
            </svg>
        )
    };

    const matchKey = Object.keys(logos).find(key => normalizedName.includes(key));

    if (!matchKey) {
        // Log unrecognized broker for future additions
        console.log(`[BrokerLogo] Unrecognized broker: "${name}"`);

        // Return generic broker icon as fallback
        return (
            <div className={cn("inline-flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 rounded", className, sizeClasses[size])}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3/4 h-3/4">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" className="text-gray-400" />
                    <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400" />
                </svg>
            </div>
        );
    }

    return (
        <div className={cn("inline-flex items-center justify-center shrink-0", className, sizeClasses[size])}>
            {logos[matchKey]}
        </div>
    );
}
