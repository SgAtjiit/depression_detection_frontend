// Dummy backend simulation for depression screening
export async function analyzeAudio(
  audioBlob: Blob | null,
  transcript: string
): Promise<{ depression_risk: string; message: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple keyword-based simulation
      const keywords = {
        sleep: "Can you tell me more about your sleep patterns? How many hours do you typically sleep?",
        sad: "I understand. How long have you been feeling this way?",
        tired: "Fatigue can be really challenging. Have you noticed any changes in your energy levels recently?",
        alone: "Feeling isolated is difficult. Do you have people you can talk to?",
        help: "I'm here to help. Can you describe what's been most difficult for you lately?",
        default: "Thank you for sharing that with me. Can you tell me more about how you've been feeling lately?",
      };

      const lowerTranscript = transcript.toLowerCase();
      let message = keywords.default;
      let risk = "low";

      // Check for keywords
      for (const [keyword, response] of Object.entries(keywords)) {
        if (keyword !== "default" && lowerTranscript.includes(keyword)) {
          message = response;
          if (["sad", "alone", "help"].includes(keyword)) {
            risk = "moderate";
          }
          break;
        }
      }

      // Simulate high risk for testing
      if (lowerTranscript.includes("hopeless") || lowerTranscript.includes("give up")) {
        risk = "high";
        message =
          "I hear that you're going through a really difficult time. It's important that you know you're not alone. Would you like to talk more about what you're experiencing?";
      }

      resolve({
        depression_risk: risk,
        message,
      });
    }, 1200);
  });
}
