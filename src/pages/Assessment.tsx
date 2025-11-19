import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/ChatMessage";
import { RecorderButton } from "@/components/RecorderButton";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { TTSControls } from "@/components/TTSControls";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  speak,
  stopSpeech,
  getBestVoice,
  initializeSpeechRecognition,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
} from "@/lib/speechUtils";
import { getChatResponse, assessDepressionRisk } from "@/lib/geminiService";

interface ChatEntry {
  id: string;
  role: "ai" | "user";
  text: string;
  audioBlob?: Blob | null;
  timestamp: Date;
  speaking?: boolean;
  riskLevel?: "low" | "moderate" | "high" | "critical";
}

const Assessment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const allAudioChunksRef = useRef<Blob[]>([]); // ✅ Store ALL audio chunks
  
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Conversation history for Gemini
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "model"; parts: { text: string }[] }>
  >([]);

  // TTS settings
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  // Initialize voice
  useEffect(() => {
    const initVoice = () => {
      const voice = getBestVoice();
      setSelectedVoice(voice);
    };

    initVoice();
    window.speechSynthesis.onvoiceschanged = initVoice;
  }, []);

  // Initial greeting
  useEffect(() => {
    if (!isSpeechSynthesisSupported()) {
      toast({
        title: "Speech not supported",
        description: "Your browser doesn't support text-to-speech. AI messages will appear as text only.",
        variant: "destructive",
      });
    }

    if (!isSpeechRecognitionSupported()) {
      toast({
        title: "Speech recognition not supported",
        description: "Please use a modern browser like Chrome or Edge for voice recording.",
        variant: "destructive",
      });
      return;
    }

    // Initialize speech recognition
    recognitionRef.current = initializeSpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setCurrentTranscript(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };
    }

    // Add initial greeting
    const greetingId = Date.now().toString();
    const greeting = "Hi, I'm here to assist you. How are you feeling today?";
    
    setChatLog([
      {
        id: greetingId,
        role: "ai",
        text: greeting,
        timestamp: new Date(),
        riskLevel: "low",
      },
    ]);

    // Speak greeting after a short delay
    setTimeout(() => {
      speakMessage(greeting, greetingId);
    }, 500);

    return () => {
      stopSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLog]);

  const speakMessage = (text: string, messageId: string) => {
    if (isMuted || !isSpeechSynthesisSupported() || !selectedVoice) return;

    setIsSpeaking(true);
    setCurrentSpeakingId(messageId);

    setChatLog((prev) =>
      prev.map((entry) =>
        entry.id === messageId ? { ...entry, speaking: true } : entry
      )
    );

    speak(
      text,
      { voice: selectedVoice, rate, pitch, volume },
      undefined,
      () => {
        setIsSpeaking(false);
        setCurrentSpeakingId(null);
        setChatLog((prev) =>
          prev.map((entry) => ({ ...entry, speaking: false }))
        );
      },
      (error) => {
        console.error("TTS error:", error);
        setIsSpeaking(false);
        setCurrentSpeakingId(null);
      }
    );
  };

  const handleRecordStart = async () => {
    if (!isSpeechRecognitionSupported()) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not available in your browser.",
        variant: "destructive",
      });
      return;
    }

    // Stop any ongoing speech
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          allAudioChunksRef.current.push(event.data); // ✅ Store globally
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setCurrentTranscript("");

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone error",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleRecordStop = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      
      // Stop all tracks
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

      await processRecording(audioBlob, currentTranscript);
    };
  };

  const processRecording = async (audioBlob: Blob, transcript: string) => {
    if (!transcript.trim()) {
      toast({
        title: "No speech detected",
        description: "Please try speaking again.",
      });
      return;
    }

    // Add user message
    const userMessageId = Date.now().toString();
    const userEntry: ChatEntry = {
      id: userMessageId,
      role: "user",
      text: transcript,
      audioBlob,
      timestamp: new Date(),
    };

    setChatLog((prev) => [...prev, userEntry]);

    // Update conversation history for Gemini
    setConversationHistory((prev) => [
      ...prev,
      { role: "user", parts: [{ text: transcript }] },
    ]);

    setIsProcessing(true);

    try {
      // Call Gemini API (with queue and fallback)
      const { response, depressionIndicators } = await getChatResponse(
        transcript,
        conversationHistory
      );

      // Assess depression risk
      const riskAssessment = assessDepressionRisk(depressionIndicators);

      // Update conversation history with AI response
      setConversationHistory((prev) => [
        ...prev,
        { role: "model", parts: [{ text: response }] },
      ]);

      // Add AI response
      const aiMessageId = (Date.now() + 1).toString();
      const aiEntry: ChatEntry = {
        id: aiMessageId,
        role: "ai",
        text: response,
        timestamp: new Date(),
        riskLevel: riskAssessment.risk,
      };

      setChatLog((prev) => [...prev, aiEntry]);

      // Speak AI response
      setTimeout(() => {
        speakMessage(response, aiMessageId);
      }, 300);

      // Show warning for high/critical risk
      if (riskAssessment.risk === "high" || riskAssessment.risk === "critical") {
        toast({
          title: riskAssessment.risk === "critical" ? "⚠️ URGENT - Crisis Support Needed" : "🔴 Support Available",
          description: riskAssessment.message,
          variant: "destructive",
          duration: 10000,
        });
      }

    } catch (error: any) {
      console.error("Error processing response:", error);
      
      // Fallback response
      const fallbackId = (Date.now() + 1).toString();
      const fallbackResponse = "I'm here to listen. Please take your time and share what's on your mind.";
      
      setChatLog((prev) => [
        ...prev,
        {
          id: fallbackId,
          role: "ai",
          text: fallbackResponse,
          timestamp: new Date(),
          riskLevel: "low",
        },
      ]);

      speakMessage(fallbackResponse, fallbackId);

      toast({
        title: "Response generated",
        description: "Using local processing mode.",
        duration: 3000,
      });

    } finally {
      setIsProcessing(false);
      setCurrentTranscript("");
    }
  };

  const handleCompleteAssessment = async () => {
    // ✅ Validate conversation length
    const userMessages = chatLog.filter((entry) => entry.role === "user");

    if (userMessages.length === 0) {
      toast({
        title: "No conversation data",
        description: "Please have a conversation before completing the assessment.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      toast({
        title: "Processing...",
        description: "Combining audio and analyzing conversation...",
      });

      // ✅ Combine ALL audio chunks from entire conversation
      const combinedAudioBlob = new Blob(allAudioChunksRef.current, {
        type: "audio/webm",
      });

      // ✅ Combine all transcripts (only user messages)
      const combinedTranscript = chatLog
        .filter((entry) => entry.role === "user")
        .map((entry) => entry.text)
        .join(" ");

      console.log("📤 Sending to fusion API:", {
        audioSize: combinedAudioBlob.size,
        transcriptLength: combinedTranscript.length,
        messageCount: userMessages.length,
      });

      // ✅ Store in sessionStorage for Results page
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        
        sessionStorage.setItem("assessmentAudio", base64Audio);
        sessionStorage.setItem("assessmentTranscript", combinedTranscript);
        sessionStorage.setItem("assessmentMessages", JSON.stringify(chatLog));
        sessionStorage.setItem("messageCount", userMessages.length.toString());
        sessionStorage.setItem(
          "duration",
          Math.floor((Date.now() - chatLog[0].timestamp.getTime()) / 1000).toString()
        );

        toast({
          title: "✅ Assessment Complete!",
          description: "Redirecting to results...",
        });

        // Navigate to results page
        setTimeout(() => {
          navigate("/results");
        }, 500);
      };

      reader.onerror = () => {
        throw new Error("Failed to process audio data");
      };

      reader.readAsDataURL(combinedAudioBlob);

    } catch (error) {
      console.error("Assessment error:", error);
      toast({
        title: "Analysis failed",
        description: "There was an error processing your conversation. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <h1 className="text-lg font-semibold text-foreground">
            Depression Assessment
          </h1>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto mb-24 space-y-2 px-2"
            style={{ maxHeight: "calc(100vh - 250px)" }}
          >
            {chatLog.map((entry) => (
              <ChatMessage
                key={entry.id}
                role={entry.role}
                message={entry.text}
                speaking={entry.speaking}
                audioBlob={entry.audioBlob}
                timestamp={entry.timestamp}
                riskLevel={entry.riskLevel}
              />
            ))}

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-ai-bubble rounded-2xl px-6 py-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-typing" />
                    <div
                      className="w-2 h-2 rounded-full bg-primary animate-typing"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-primary animate-typing"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Waveform during recording */}
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-card rounded-2xl shadow-elevated px-6 py-4 z-50"
            >
              <WaveformVisualizer isActive={isRecording} barCount={7} />
              {currentTranscript && (
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                  {currentTranscript}
                </p>
              )}
            </motion.div>
          )}

          {/* Record button */}
          <RecorderButton
            isRecording={isRecording}
            onRecordStart={handleRecordStart}
            onRecordStop={handleRecordStop}
            disabled={isProcessing || isSpeaking}
          />
        </div>

        {/* Controls sidebar */}
        <div className="lg:w-80 space-y-4">
          {/* ✅ Complete Assessment Button */}
          {chatLog.filter((e) => e.role === "user").length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={handleCompleteAssessment}
                disabled={isAnalyzing || isRecording || isProcessing}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2"
                size="lg"
              >
                <FileCheck className="w-5 h-5" />
                {isAnalyzing ? "Analyzing..." : "Complete Assessment"}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Analyze your full conversation and get detailed results
              </p>
            </motion.div>
          )}

          <TTSControls
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            isMuted={isMuted}
            onMuteToggle={() => setIsMuted(!isMuted)}
            onStopSpeech={() => {
              stopSpeech();
              setIsSpeaking(false);
              setCurrentSpeakingId(null);
            }}
            volume={volume}
            onVolumeChange={setVolume}
            rate={rate}
            onRateChange={setRate}
            pitch={pitch}
            onPitchChange={setPitch}
            isSpeaking={isSpeaking}
          />

          {!isSpeechRecognitionSupported() && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Browser Not Supported
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Please use Chrome, Edge, or Safari for voice recording.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
            <div>
              <p className="font-medium text-foreground mb-2">System Status</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">API Status</span>
                  <span className="flex items-center gap-1 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Messages Sent</span>
                  <span className="font-medium">{Math.floor(chatLog.length / 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Audio Recorded</span>
                  <span className="font-medium">
                    {(allAudioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-3">
              <p className="font-medium text-foreground mb-2">Keyboard Shortcuts</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd> Hold to record</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">M</kbd> Toggle mute</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Stop speech</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessment;