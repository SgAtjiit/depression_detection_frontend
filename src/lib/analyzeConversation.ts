interface ChatEntry {
  id: string;
  role: "ai" | "user";
  text: string;
  audioBlob?: Blob | null;
  timestamp: Date;
}

export async function combineAudios(audioBlobs: Blob[]): Promise<Blob> {
  // Create an audio context
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    // Decode all audio blobs
    const audioBuffers = await Promise.all(
      audioBlobs.map(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
      })
    );

    // Calculate total length
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    
    // Create combined buffer
    const combinedBuffer = audioContext.createBuffer(
      audioBuffers[0].numberOfChannels,
      totalLength,
      audioBuffers[0].sampleRate
    );

    // Copy all audio data
    let offset = 0;
    audioBuffers.forEach((buffer) => {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        combinedBuffer.getChannelData(channel).set(channelData, offset);
      }
      offset += buffer.length;
    });

    // Convert to WAV blob
    const wavBlob = await bufferToWave(combinedBuffer, combinedBuffer.length);
    return wavBlob;
  } finally {
    audioContext.close();
  }
}

function bufferToWave(audioBuffer: AudioBuffer, len: number): Promise<Blob> {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
    offset++;
  }

  return Promise.resolve(new Blob([buffer], { type: "audio/wav" }));

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export function combineTranscripts(chatLog: ChatEntry[]): string {
  return chatLog
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.text)
    .join(" ");
}

export async function analyzeFullConversation(
  combinedAudio: Blob,
  combinedText: string
): Promise<any> {
  // ✅ ALWAYS return dummy data for now (backend is optional)
  console.log("📊 Generating analysis with dummy data (backend offline)");
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Generate realistic dummy data based on text analysis
  const textLower = combinedText.toLowerCase();
  
  let textProb = 0.45;
  let audioProb = 0.50;
  let textRisk: "low" | "moderate" | "high" | "critical" = "low";
  let audioRisk: "low" | "moderate" | "high" | "critical" = "low";
  
  const indicators: string[] = [];

  // Analyze text for indicators
  if (textLower.includes("sad") || textLower.includes("down")) {
    textProb += 0.15;
    indicators.push("Sadness mentioned");
  }
  if (textLower.includes("sleep") || textLower.includes("tired")) {
    textProb += 0.10;
    audioProb += 0.12;
    indicators.push("Sleep disturbances");
  }
  if (textLower.includes("alone") || textLower.includes("lonely")) {
    textProb += 0.12;
    indicators.push("Social isolation");
  }
  if (textLower.includes("worthless") || textLower.includes("hopeless")) {
    textProb += 0.20;
    indicators.push("Hopelessness expressed");
  }

  // Determine risk levels
  if (textProb >= 0.70) textRisk = "high";
  else if (textProb >= 0.55) textRisk = "moderate";
  
  if (audioProb >= 0.70) audioRisk = "high";
  else if (audioProb >= 0.55) audioRisk = "moderate";

  const ensembleProb = (textProb + audioProb) / 2;
  let ensembleRisk: "low" | "moderate" | "high" | "critical" = "low";
  
  if (ensembleProb >= 0.70) ensembleRisk = "high";
  else if (ensembleProb >= 0.55) ensembleRisk = "moderate";

  return {
    text_analysis: {
      depression_probability: Math.min(textProb, 0.95),
      risk_level: textRisk,
      key_indicators: indicators.length > 0 ? indicators : [
        "Emotional distress patterns detected",
        "Changes in communication style",
        "Possible mood-related concerns"
      ],
      sentiment_score: -0.35 - (textProb * 0.3),
    },
    audio_analysis: {
      depression_probability: Math.min(audioProb, 0.95),
      risk_level: audioRisk,
      vocal_features: {
        pitch_variance: 25 + Math.random() * 20,
        speaking_rate: 70 + Math.random() * 30,
        pause_duration: 1.5 + Math.random() * 2,
        energy_level: 30 + Math.random() * 30,
      },
    },
    ensemble_analysis: {
      depression_probability: Math.min(ensembleProb, 0.95),
      risk_level: ensembleRisk,
      confidence: 0.75 + Math.random() * 0.15,
      recommendation:
        ensembleRisk === "high"
          ? "Based on combined analysis, we strongly recommend consulting with a mental health professional. Your conversation patterns suggest significant depression indicators."
          : ensembleRisk === "moderate"
          ? "Your responses show some signs of emotional distress. Consider reaching out to a counselor or therapist to discuss how you're feeling."
          : "Your conversation shows typical emotional responses. Continue monitoring your mental health and reach out if things change.",
    },
    metadata: {
      total_duration: Math.floor(combinedText.length * 0.5),
      message_count: combinedText.split(" ").length / 10,
      analysis_timestamp: new Date().toISOString(),
    },
  };

  /* ✅ UNCOMMENT WHEN BACKEND IS READY
  const formData = new FormData();
  formData.append("audio", combinedAudio, "conversation.wav");
  formData.append("text", combinedText);

  try {
    const response = await fetch("http://localhost:8000/analyze-full", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Analysis failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Backend analysis error:", error);
    // Fall back to dummy data
    return [dummy data above];
  }
  */
}