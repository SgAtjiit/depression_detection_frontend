import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
}

export function WaveformVisualizer({ isActive, barCount = 5 }: WaveformVisualizerProps) {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 rounded-full transition-colors duration-300",
            isActive ? "bg-primary" : "bg-muted"
          )}
          animate={
            isActive
              ? {
                  height: ["20%", "100%", "20%"],
                }
              : {
                  height: "20%",
                }
          }
          transition={{
            duration: 0.8,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
