"use client";

import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * CinematicBackground
 * 
 * A procedurally generated "Digital Highway" animation.
 * Creates a sense of forward motion (trucking/logistics) using
 * perspective grids and moving particles (data/loads).
 */
export function CinematicBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parallax effect for the container
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 1000], [0, 200]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        // Animation state
        let frame = 0;
        const speed = 2.5; // Slightly faster for more energy

        // Road Lines
        const lines: { x: number; y: number; length: number; speed: number }[] = [];
        for (let i = 0; i < 25; i++) {
            lines.push({
                x: (Math.random() - 0.5) * width * 2, // Spread wide
                y: Math.random() * height,
                length: 50 + Math.random() * 100,
                speed: 15 + Math.random() * 20
            });
        }

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", resize);

        const draw = () => {
            // Dark cinematic background clear
            ctx.fillStyle = "#020617"; // Slate-950
            ctx.fillRect(0, 0, width, height);

            // 1. The Grid (The Road)
            // We create a perspective grid effect
            const horizonY = height * 0.4;
            const bottomW = width * 2;
            const topW = width * 0.1;

            // Draw vertical perspective lines
            ctx.strokeStyle = "rgba(59, 130, 246, 0.5)"; // Bright Blue-500
            ctx.lineWidth = 1.5;

            const numLines = 12;
            for (let i = 0; i <= numLines; i++) {
                const p = i / numLines;
                // Bottom point
                const x1 = (width / 2) - (bottomW / 2) + (p * bottomW);
                const y1 = height;

                // Top point (vanishing)
                const x2 = (width / 2) - (topW / 2) + (p * topW);
                const y2 = horizonY;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // Draw moving horizontal lines (road markers)
            // Moving from horizon down
            const time = frame * speed;
            const loopH = height - horizonY;

            for (let i = 0; i < 8; i++) {
                const rawY = (time + i * (loopH / 8)) % loopH;
                // Exponential fade for perspective (closer = faster/larger gaps)
                // Simple linear for now to keep it "steady"
                const yDisplay = horizonY + rawY;

                // Scale opacity by proximity to bottom
                const opacity = Math.min(1, Math.max(0, (rawY / loopH)));

                ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.9})`; // Very Bright Blue
                ctx.lineWidth = 2 + opacity * 2.5;

                // Current width at this Y
                // Interpolate between topW and bottomW based on Y
                const progress = rawY / loopH;
                const currentW = topW + (bottomW - topW) * progress;

                const startX = (width / 2) - (currentW / 2);
                const endX = (width / 2) + (currentW / 2);

                ctx.beginPath();
                ctx.moveTo(startX, yDisplay);
                ctx.lineTo(endX, yDisplay);
                ctx.stroke();
            }


            // 2. Streaks (Speed lines)
            lines.forEach(line => {
                // Update
                line.y += line.speed * (line.y / height + 0.5); // Accel downwards
                if (line.y > height) {
                    line.y = horizonY;
                    line.x = (Math.random() - 0.5) * width * 3; // Randomize x spread
                }

                const distFromCenter = Math.abs(line.x - width / 2);
                const opacity = Math.min(0.9, distFromCenter / width); // Very clear streaks

                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(line.x, line.y);
                ctx.lineTo(line.x, line.y + line.length);
                ctx.stroke();
            });

            // 3. Vignette / Overlay (Lighter to see grid)
            const grad = ctx.createRadialGradient(width / 2, height / 2, height / 3, width / 2, height / 2, height);
            grad.addColorStop(0, "transparent");
            grad.addColorStop(0.7, "rgba(2, 6, 23, 0.4)");
            grad.addColorStop(1, "rgba(2, 6, 23, 0.9)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);


            frame++;
            requestAnimationFrame(draw);
        };

        const animId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <motion.div
            ref={containerRef}
            style={{ y }}
            className="absolute inset-0 z-0 bg-[#020617]"
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full opacity-100" // Increased from 60 to 100
            />

            {/* Overlay Gradients for Depth (Reduced opacity) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05)_0%,transparent_70%)]" />
        </motion.div>
    );
}
