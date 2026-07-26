"use client";

import { StrikeGuide } from "@/components/ui/StrikeGuide";
import { motion } from "framer-motion";

export default function HelpStrikePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="pt-24 pb-20 px-4 md:px-8">
                {/* Hero section for the help page */}
                <div className="max-w-6xl mx-auto mb-16 relative py-20 rounded-[3rem] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                    <div className="relative z-10 text-center space-y-6">
                        <motion.h1
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic"
                        >
                            Persistence <span className="text-primary">System</span>
                        </motion.h1>
                        <p className="text-muted text-lg max-w-2xl mx-auto font-medium">
                            Манай платформын "Persistence System" буюу Стрийк систем нь таныг өдөр бүр шинэ ертөнцөөр аялахад тань урамшуулах зорилготой.
                        </p>
                    </div>
                </div>

                <StrikeGuide />
            </div>
        </main>
    );
}
