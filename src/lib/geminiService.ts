import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
const genAI = new GoogleGenerativeAI(API_KEY);

// System prompt for mental health counseling
const SYSTEM_PROMPT = `You are a compassionate AI mental health assistant trained to detect signs of depression. 
Your role is to:
1. Listen empathetically and validate the user's feelings
2. Ask gentle follow-up questions to understand their emotional state
3. Identify potential depression indicators (hopelessness, loss of interest, sleep issues, fatigue, etc.)
4. Provide supportive responses without diagnosing
5. Encourage professional help if severe symptoms are detected

Guidelines:
- Be warm, non-judgmental, and patient
- Use active listening techniques
- Ask ONE question at a time
- Keep responses under 3 sentences
- Never say "I'm just an AI" - act as a supportive companion
- If suicide ideation is mentioned, immediately encourage crisis resources

Example conversation:
User: "I haven't been sleeping well lately"
You: "I'm sorry to hear that. Sleep troubles can be really draining. Has this been affecting your daily activities?"

User: "I don't feel like doing anything anymore"
You: "That sounds really hard. When did you first start noticing this change in your motivation?"

Now respond to the user with empathy and care.`;

interface ConversationHistory {
  role: "user" | "model";
  parts: { text: string }[];
}

// Simple rate limiter to prevent API abuse
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

// Smart fallback responses
function generateFallbackResponse(
  message: string,
  indicators: string[]
): string {
  const lowerMessage = message.toLowerCase();

  // Critical: Suicide ideation
  if (indicators.includes("suicidal")) {
    return "I hear that you're in a lot of pain right now. Please reach out to a crisis helpline immediately - they're available 24/7 and want to help. You don't have to face this alone.";
  }

  // High risk: Multiple depression indicators
  if (indicators.length >= 4) {
    return "It sounds like you're going through a really difficult time. These feelings are important to address. Would you feel comfortable talking to a mental health professional?";
  }

  // Specific responses based on keywords
  if (lowerMessage.includes("sleep") || lowerMessage.includes("tired")) {
    return "Sleep troubles can really affect how we feel during the day. How long has this been going on?";
  }

  if (lowerMessage.includes("alone") || lowerMessage.includes("lonely")) {
    return "Feeling isolated can be so hard. Is there anyone you feel comfortable reaching out to?";
  }

  if (lowerMessage.includes("sad") || lowerMessage.includes("down")) {
    return "I'm sorry you're feeling this way. Can you tell me more about what's been happening?";
  }

  if (lowerMessage.includes("work") || lowerMessage.includes("job")) {
    return "Work stress can really weigh on us. How has this been affecting your daily life?";
  }

  if (lowerMessage.includes("family") || lowerMessage.includes("relationship")) {
    return "Relationship challenges can be really tough. Would you like to talk about what's been going on?";
  }

  // Default empathetic response
  const empathetic = [
    "I'm here to listen. Can you tell me more about how you've been feeling?",
    "That sounds really difficult. What's been on your mind lately?",
    "I appreciate you sharing that with me. How can I best support you right now?",
    "Thank you for opening up. What would help you feel better in this moment?",
  ];

  return empathetic[Math.floor(Math.random() * empathetic.length)];
}

export async function getChatResponse(
  userMessage: string,
  conversationHistory: ConversationHistory[] = []
): Promise<{ response: string; depressionIndicators: string[] }> {
  const indicators = detectDepressionIndicators(userMessage);

  try {
    // Rate limiting
    await waitForRateLimit();

    // Use the correct FREE tier model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", // ✅ Correct free tier model
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
      },
    });
   console.log(model)
    const fullHistory = [
      {
        role: "user" as const,
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: "model" as const,
        parts: [{ text: "I understand. I'm here to listen and support you. How can I help you today?" }],
      },
      ...conversationHistory,
    ];

    const chat = model.startChat({ history: fullHistory });
    
    // Add timeout protection
    const responsePromise = chat.sendMessage(userMessage);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timeout")), 10000)
    );

    const result = await Promise.race([responsePromise, timeoutPromise]) as any;
    const response = result.response.text();
   console.log(response)
    console.log("API Response:", response);

    return {
      response,
      depressionIndicators: indicators,
    };
  } catch (error: any) {
    console.error("Gemini API error:", error);
    
    // Use fallback response
    const fallbackResponse = generateFallbackResponse(userMessage, indicators);

    return {
      response: fallbackResponse,
      depressionIndicators: indicators,
    };
  }
}

function detectDepressionIndicators(message: string): string[] {
  const indicators: string[] = [];
  const lowerMessage = message.toLowerCase();

  const patterns = {
    hopelessness: /hopeless|no point|give up|worthless|no future|meaningless/i,
    suicidal: /suicide|suicidal|kill myself|end (my|it all)|want to die|better off dead|harm myself/i,
    sadness: /sad|depressed|miserable|unhappy|down|empty|numb/i,
    anhedonia: /(no|lost|don't have any) (interest|joy|pleasure|motivation)|don't (care|enjoy)|nothing (matters|feels good)/i,
    fatigue: /tired|exhausted|no energy|drained|can't get (up|out of bed)|lethargic/i,
    sleep: /can't sleep|insomnia|sleep (too much|all day)|oversleeping|nightmares/i,
    isolation: /alone|lonely|no (one|friends)|isolated|withdrawn|disconnected/i,
    appetite: /not eating|(no|lost) appetite|eating (too much|nothing)|weight (loss|gain)/i,
    concentration: /can't (focus|concentrate|think)|mind (blank|foggy)|distracted|forgetful/i,
    guilt: /guilty|fault|burden|disappointing|let (everyone|people) down|shame/i,
    anxiety: /anxious|worried|panic|scared|nervous|overwhelmed/i,
    worthlessness: /worthless|useless|failure|not good enough|nobody cares/i,
  };

  Object.entries(patterns).forEach(([key, pattern]) => {
    if (pattern.test(lowerMessage)) {
      indicators.push(key);
    }
  });

  return indicators;
}

export function assessDepressionRisk(indicators: string[]): {
  risk: "low" | "moderate" | "high" | "critical";
  message: string;
} {
  const criticalIndicators = ["suicidal"];
  const highRiskIndicators = ["hopelessness", "anhedonia", "isolation", "worthlessness"];

  const hasCritical = indicators.some((i) => criticalIndicators.includes(i));
  const highRiskCount = indicators.filter((i) => highRiskIndicators.includes(i)).length;

  if (hasCritical) {
    return {
      risk: "critical",
      message: "⚠️ URGENT: Please contact a crisis helpline immediately. You don't have to face this alone.",
    };
  }

  if (highRiskCount >= 2 || indicators.length >= 5) {
    return {
      risk: "high",
      message: "I'm concerned about what you're sharing. Please consider talking to a mental health professional soon.",
    };
  }

  if (indicators.length >= 3) {
    return {
      risk: "moderate",
      message: "It sounds like you're going through a difficult time. Talking to someone might help.",
    };
  }

  return {
    risk: "low",
    message: "I'm here to listen and support you.",
  };
}