const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface DepressionPrediction {
  prediction: number;
  label: string;
  ensemble_probability: {
    not_depressed: number;
    depressed: number;
  };
  confidence: number;
  fusion_method: string;
  individual_predictions: {
    audio: {
      prediction: number;
      label: string;
      confidence: number;
      probability: {
        not_depressed: number;
        depressed: number;
      };
    };
    text: {
      prediction: number;
      label: string;
      confidence: number;
      probability: {
        not_depressed: number;
        depressed: number;
      };
      linguistic_features: {
        word_count: number;
        sentence_count: number;
        avg_word_length: number;
        negative_word_count: number;
        positive_word_count: number;
        sentiment_ratio: number;
      };
    };
  };
  message: string;
}

/**
 * Send audio + text to fusion endpoint for depression detection
 */
export async function predictDepressionFusion(
  audioBlob: Blob,
  transcriptText: string,
  fusionMethod: 'weighted_average' | 'simple_average' | 'max_confidence' | 'voting' = 'weighted_average'
): Promise<DepressionPrediction> {
  try {
    const formData = new FormData();
    
    // Add audio file
    formData.append('audio', audioBlob, 'recording.webm');
    
    // Add transcript text
    formData.append('text', transcriptText);
    
    // Add fusion method
    formData.append('fusion_method', fusionMethod);

    console.log('🚀 Sending fusion request:', {
      audioSize: audioBlob.size,
      textLength: transcriptText.length,
      fusionMethod
    });

    const response = await fetch(`${API_BASE_URL}/predict/fusion`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: DepressionPrediction = await response.json();
    console.log('✅ Fusion prediction received:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Depression prediction error:', error);
    throw error;
  }
}

/**
 * Audio-only prediction
 */
export async function predictDepressionAudio(audioBlob: Blob) {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_BASE_URL}/predict/audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Audio prediction error:', error);
    throw error;
  }
}

/**
 * Text-only prediction
 */
export async function predictDepressionText(text: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/predict/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Text prediction error:', error);
    throw error;
  }
}

/**
 * Check API health
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return await response.json();
  } catch (error) {
    console.error('❌ API health check failed:', error);
    throw error;
  }
}