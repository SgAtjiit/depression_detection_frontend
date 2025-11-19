import { useEffect, useState } from "react";
import { Volume2, VolumeX, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { getAvailableVoices } from "@/lib/speechUtils";
import { motion } from "framer-motion";

interface TTSControlsProps {
  selectedVoice: SpeechSynthesisVoice | null;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onStopSpeech: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  isSpeaking: boolean;
}

export function TTSControls({
  selectedVoice,
  onVoiceChange,
  isMuted,
  onMuteToggle,
  onStopSpeech,
  volume,
  onVolumeChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
  isSpeaking,
}: TTSControlsProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = getAvailableVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Voice Controls</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="sm"
          onClick={onMuteToggle}
          className="flex-1"
        >
          {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
          {isMuted ? "Unmute" : "Mute"}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onStopSpeech}
          disabled={!isSpeaking}
          className="flex-1"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="voice-select" className="text-xs">
              Voice
            </Label>
            <Select
              value={selectedVoice?.name || ""}
              onValueChange={(voiceName) => {
                const voice = voices.find((v) => v.name === voiceName);
                if (voice) onVoiceChange(voice);
              }}
            >
              <SelectTrigger id="voice-select" className="text-sm">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {englishVoices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name} className="text-sm">
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="volume-slider" className="text-xs flex justify-between">
              <span>Volume</span>
              <span className="text-muted-foreground">{Math.round(volume * 100)}%</span>
            </Label>
            <Slider
              id="volume-slider"
              value={[volume]}
              onValueChange={([v]) => onVolumeChange(v)}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-slider" className="text-xs flex justify-between">
              <span>Speed</span>
              <span className="text-muted-foreground">{rate.toFixed(1)}x</span>
            </Label>
            <Slider
              id="rate-slider"
              value={[rate]}
              onValueChange={([r]) => onRateChange(r)}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pitch-slider" className="text-xs flex justify-between">
              <span>Pitch</span>
              <span className="text-muted-foreground">{pitch.toFixed(1)}</span>
            </Label>
            <Slider
              id="pitch-slider"
              value={[pitch]}
              onValueChange={([p]) => onPitchChange(p)}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>
        </motion.div>
      )}
    </Card>
  );
}
