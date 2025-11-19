import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecorderButtonProps {
  isRecording: boolean;
  onRecordStart: () => void;
  onRecordStop: () => void;
  disabled?: boolean;
}

export function RecorderButton({
  isRecording,
  onRecordStart,
  onRecordStop,
  disabled,
}: RecorderButtonProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onMouseDown={!disabled ? onRecordStart : undefined}
        onMouseUp={!disabled ? onRecordStop : undefined}
        onTouchStart={!disabled ? onRecordStart : undefined}
        onTouchEnd={!disabled ? onRecordStop : undefined}
        disabled={disabled}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center shadow-elevated",
          "transition-all duration-300 select-none touch-none",
          isRecording
            ? "bg-destructive text-destructive-foreground animate-pulse-glow"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isRecording ? (
          <Square className="w-8 h-8 fill-current" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </motion.button>

      {isRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span className="text-sm font-medium text-foreground bg-card px-4 py-2 rounded-full shadow-soft">
            Recording... Release to stop
          </span>
        </motion.div>
      )}

      {!isRecording && !disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span className="text-xs text-muted-foreground">
            Hold to record
          </span>
        </motion.div>
      )}
    </div>
  );
}
