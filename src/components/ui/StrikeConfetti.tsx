"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function StrikeConfetti() {
    const [pieces, setPieces] = useState<any[]>([]);

    useEffect(() => {
        const newPieces = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: -20,
            rotation: Math.random() * 360,
            color: ["#e50914", "#3b1464", "#f59e0b", "#3b82f6", "#ffffff"][Math.floor(Math.random() * 5)],
            delay: Math.random() * 2,
            size: Math.random() * 10 + 5
        }));
        setPieces(newPieces);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {pieces.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ top: "-10%", left: `${p.x}%`, scale: 0, rotate: 0 }}
                    animate={{
                        top: "110%",
                        left: `${p.x + (Math.random() * 20 - 10)}%`,
                        scale: [0, 1, 1, 0.5],
                        rotate: p.rotation + 720
                    }}
                    transition={{ duration: 3, delay: p.delay, ease: "easeOut" }}
                    style={{
                        position: "absolute",
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: "2px"
                    }}
                />
            ))}
        </div>
    );
}
