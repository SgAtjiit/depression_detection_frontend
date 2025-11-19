import { motion } from "framer-motion";
import { Volume2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  role: "ai" | "user";
  message: string;
  speaking?: boolean;
  audioBlob?: Blob | null;
  timestamp?: Date;
  riskLevel?: "low" | "moderate" | "high" | "critical";
}

export const ChatMessage = ({
  role,
  message,
  speaking,
  audioBlob,
  timestamp,
  riskLevel,
}: ChatMessageProps) => {
  const isAI = role === "ai";

  // ✅ FIX: Only create URL if audioBlob exists and is a valid Blob
  const audioUrl = audioBlob instanceof Blob ? URL.createObjectURL(audioBlob) : null;

  // Risk indicator colors
  const riskColors = {
    low: "bg-green-500/10 text-green-600",
    moderate: "bg-yellow-500/10 text-yellow-600",
    high: "bg-orange-500/10 text-orange-600",
    critical: "bg-red-500/10 text-red-600 animate-pulse",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isAI ? "justify-start" : "justify-end"} mb-3`}
    >
      <div className={`max-w-[75%] ${isAI ? "mr-auto" : "ml-auto"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isAI
              ? "bg-ai-bubble text-foreground"
              : "bg-user-bubble text-primary-foreground"
          } shadow-soft`}
        >
          <div className="flex items-start gap-2">
            {speaking && (
              <Volume2 className="w-4 h-4 text-primary animate-pulse flex-shrink-0 mt-1" />
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>

          {/* ✅ Show audio player only if audioUrl exists (user messages) */}
          {audioUrl && !isAI && (
            <div className="mt-2">
              <audio controls className="w-full h-8">
                <source src={audioUrl} type="audio/webm" />
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* ✅ Show risk indicator for AI messages */}
          {isAI && riskLevel && riskLevel !== "low" && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
              <AlertTriangle className="w-3 h-3" />
              <Badge
                variant="outline"
                className={`text-xs ${riskColors[riskLevel]}`}
              >
                {riskLevel === "critical"
                  ? "⚠️ Crisis Detected"
                  : riskLevel === "high"
                  ? "🔴 High Risk"
                  : "🟡 Moderate Risk"}
              </Badge>
            </div>
          )}
        </div>

        {timestamp && (
          <p className="text-xs text-muted-foreground mt-1 px-2">
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </motion.div>
  );
};