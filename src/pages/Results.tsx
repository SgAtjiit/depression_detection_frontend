import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Mic, 
  MessageSquare,
  Download,
  Home,
  TrendingUp,
  Activity,
  Brain
} from "lucide-react";
import { predictDepressionFusion } from "@/lib/depressionApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface AssessmentData {
  transcript: string;
  messageCount: string;
  duration: string;
  audioSize?: number;
  messages?: Array<{
    role: string;
    text: string;
    timestamp: string;
  }>;
}

interface PredictionResult {
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
      probability: {
        not_depressed: number;
        depressed: number;
      };
      confidence: number;
      audio_duration?: number;
      analyzed_duration?: number;
    };
    text: {
      prediction: number;
      label: string;
      probability: {
        not_depressed: number;
        depressed: number;
      };
      confidence: number;
      linguistic_features?: {
        [key: string]: number | string;
      };
    };
  };
  message: string;
}

const Results = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);

  useEffect(() => {
    const analyzeResults = async () => {
      try {
        // ✅ Get data from sessionStorage
        const audioBase64 = sessionStorage.getItem("assessmentAudio");
        const transcript = sessionStorage.getItem("assessmentTranscript");
        const messageCount = sessionStorage.getItem("messageCount");
        const duration = sessionStorage.getItem("duration");
        const messagesStr = sessionStorage.getItem("assessmentMessages");

        if (!audioBase64 || !transcript) {
          toast({
            title: "No Assessment Data",
            description: "Please complete an assessment first.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // ✅ Parse messages if available
        let messages = [];
        try {
          messages = messagesStr ? JSON.parse(messagesStr) : [];
        } catch (e) {
          console.warn("Failed to parse messages:", e);
        }

        // ✅ Store for display
        setAssessmentData({
          transcript,
          messageCount: messageCount || "0",
          duration: duration || "0",
          audioSize: audioBase64.length,
          messages,
        });

        // ✅ Convert base64 to Blob
        const base64Data = audioBase64.includes(",") 
          ? audioBase64.split(",")[1] 
          : audioBase64;
        
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: "audio/wav" });

        console.log("📊 Sending to API:", {
          audioSize: audioBlob.size,
          transcriptLength: transcript.length,
          messageCount,
          duration,
        });

        // ✅ Call fusion API
        const predictionResult = await predictDepressionFusion(
          audioBlob,
          transcript,
          "weighted_average"
        );

        setResult(predictionResult);

        toast({
          title: "✅ Analysis Complete",
          description: `Prediction: ${predictionResult.label}`,
        });

      } catch (err) {
        console.error("❌ Analysis error:", err);
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
        
        toast({
          title: "Analysis Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    analyzeResults();
  }, [navigate]);

  const getRiskLevel = (confidence: number, label: string): "low" | "moderate" | "high" => {
    if (label === "Not Depressed") return "low";
    if (confidence >= 0.8) return "high";
    if (confidence >= 0.6) return "moderate";
    return "low";
  };

  const riskColors = {
    low: "text-green-700 bg-green-50 border-green-200",
    moderate: "text-yellow-700 bg-yellow-50 border-yellow-200",
    high: "text-red-700 bg-red-50 border-red-200",
  };

  const riskIcons = {
    low: <CheckCircle2 className="h-6 w-6 text-green-600" />,
    moderate: <AlertCircle className="h-6 w-6 text-yellow-600" />,
    high: <AlertCircle className="h-6 w-6 text-red-600" />,
  };

  const downloadReport = () => {
    if (!result || !assessmentData) return;

    const reportContent = `
DEPRESSION DETECTION ASSESSMENT REPORT
======================================

Date: ${new Date().toLocaleString()}

OVERALL RESULT
--------------
Prediction: ${result.label}
Confidence: ${(result.confidence * 100).toFixed(1)}%
Risk Level: ${getRiskLevel(result.confidence, result.label).toUpperCase()}
Fusion Method: ${result.fusion_method}

PROBABILITIES
-------------
Not Depressed: ${(result.ensemble_probability.not_depressed * 100).toFixed(1)}%
Depressed: ${(result.ensemble_probability.depressed * 100).toFixed(1)}%

INDIVIDUAL PREDICTIONS
----------------------

Audio Analysis:
- Prediction: ${result.individual_predictions.audio.label}
- Confidence: ${(result.individual_predictions.audio.confidence * 100).toFixed(1)}%
- Not Depressed: ${(result.individual_predictions.audio.probability.not_depressed * 100).toFixed(1)}%
- Depressed: ${(result.individual_predictions.audio.probability.depressed * 100).toFixed(1)}%
- Audio Duration: ${result.individual_predictions.audio.audio_duration?.toFixed(1)}s
- Analyzed Duration: ${result.individual_predictions.audio.analyzed_duration?.toFixed(1)}s

Text Analysis:
- Prediction: ${result.individual_predictions.text.label}
- Confidence: ${(result.individual_predictions.text.confidence * 100).toFixed(1)}%
- Not Depressed: ${(result.individual_predictions.text.probability.not_depressed * 100).toFixed(1)}%
- Depressed: ${(result.individual_predictions.text.probability.depressed * 100).toFixed(1)}%

ASSESSMENT STATISTICS
---------------------
Duration: ${Math.floor(parseInt(assessmentData.duration) / 60)}m ${parseInt(assessmentData.duration) % 60}s
Messages Exchanged: ${assessmentData.messageCount}
Audio Size: ${((assessmentData.audioSize || 0) / 1024).toFixed(0)} KB
Transcript Length: ${assessmentData.transcript.length} characters
Word Count: ${assessmentData.transcript.split(" ").length} words

COMBINED TRANSCRIPT
-------------------
${assessmentData.transcript}

RECOMMENDATION
--------------
${result.message}

======================================
This report is for informational purposes only and should not be used as a 
substitute for professional medical advice, diagnosis, or treatment.
======================================
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depression-assessment-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Assessment report saved successfully.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                <Brain className="h-8 w-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Analyzing Results...</h2>
              <p className="text-gray-600">Processing your assessment data with AI</p>
              <div className="space-y-2">
                <Progress value={33} className="h-2" />
                <p className="text-xs text-gray-500">This may take a few moments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/")} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result || !assessmentData) return null;

  const riskLevel = getRiskLevel(result.confidence, result.label);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  {riskIcons[riskLevel]}
                  Depression Assessment Results
                </CardTitle>
                <CardDescription>
                  Multi-modal AI analysis (Audio + Text) • {new Date().toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge 
                variant={riskLevel === "high" ? "destructive" : riskLevel === "moderate" ? "default" : "secondary"}
                className="text-sm px-3 py-1"
              >
                {riskLevel.toUpperCase()} RISK
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Main Result Alert */}
        <Alert className={`${riskColors[riskLevel]} border-2 shadow-md`}>
          <AlertTitle className="text-xl font-bold flex items-center gap-2">
            {result.label}
            <Badge variant="outline" className="ml-auto">
              {(result.confidence * 100).toFixed(1)}% Confidence
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-3">
            <p className="text-base leading-relaxed">{result.message}</p>
          </AlertDescription>
        </Alert>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">
                {Math.floor(parseInt(assessmentData.duration) / 60)}m{" "}
                {parseInt(assessmentData.duration) % 60}s
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
                <MessageSquare className="h-4 w-4" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">
                {assessmentData.messageCount}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
                <Mic className="h-4 w-4" />
                Audio Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">
                {((assessmentData.audioSize || 0) / 1024).toFixed(0)} KB
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
                <FileText className="h-4 w-4" />
                Words
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">
                {assessmentData.transcript.split(" ").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Tabs */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detailed Analysis
            </CardTitle>
            <CardDescription>
              Individual model predictions and confidence scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="combined" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="combined">
                  <Activity className="h-4 w-4 mr-2" />
                  Combined
                </TabsTrigger>
                <TabsTrigger value="audio">
                  <Mic className="h-4 w-4 mr-2" />
                  Audio Only
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Text Only
                </TabsTrigger>
              </TabsList>

              <TabsContent value="combined" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Prediction</p>
                    <Badge
                      variant={result.label === "Depressed" ? "destructive" : "default"}
                      className="text-base px-3 py-1"
                    >
                      {result.label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Confidence</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-indigo-600">
                        {(result.confidence * 100).toFixed(1)}%
                      </p>
                      <Progress value={result.confidence * 100} className="h-2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Not Depressed Probability</p>
                    <div className="space-y-1">
                      <p className="text-xl font-semibold text-green-600">
                        {(result.ensemble_probability.not_depressed * 100).toFixed(1)}%
                      </p>
                      <Progress 
                        value={result.ensemble_probability.not_depressed * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Depressed Probability</p>
                    <div className="space-y-1">
                      <p className="text-xl font-semibold text-red-600">
                        {(result.ensemble_probability.depressed * 100).toFixed(1)}%
                      </p>
                      <Progress 
                        value={result.ensemble_probability.depressed * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Fusion Method</p>
                  <p className="font-semibold text-blue-900">
                    {result.fusion_method.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Combines audio acoustic features with text linguistic patterns
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="audio" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Prediction</p>
                    <Badge
                      variant={
                        result.individual_predictions.audio.label === "Depressed"
                          ? "destructive"
                          : "default"
                      }
                      className="text-base px-3 py-1"
                    >
                      {result.individual_predictions.audio.label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Confidence</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-indigo-600">
                        {(result.individual_predictions.audio.confidence * 100).toFixed(1)}%
                      </p>
                      <Progress 
                        value={result.individual_predictions.audio.confidence * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Audio Duration</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {result.individual_predictions.audio.audio_duration?.toFixed(1) || "N/A"}s
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Analyzed Duration</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {result.individual_predictions.audio.analyzed_duration?.toFixed(1) || "N/A"}s
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 mb-2">Audio Features Analyzed:</p>
                  <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                    <li>Pitch variability and prosody</li>
                    <li>Vocal energy and intensity</li>
                    <li>Speech rate and pauses</li>
                    <li>MFCC and spectral features</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Prediction</p>
                    <Badge
                      variant={
                        result.individual_predictions.text.label === "Depressed"
                          ? "destructive"
                          : "default"
                      }
                      className="text-base px-3 py-1"
                    >
                      {result.individual_predictions.text.label}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Confidence</p>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-indigo-600">
                        {(result.individual_predictions.text.confidence * 100).toFixed(1)}%
                      </p>
                      <Progress 
                        value={result.individual_predictions.text.confidence * 100} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">Text Features Analyzed:</p>
                  <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                    <li>Sentiment and emotional tone</li>
                    <li>Linguistic patterns and style</li>
                    <li>Word choice and complexity</li>
                    <li>Semantic content analysis</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Combined Transcript */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Complete Conversation Transcript
            </CardTitle>
            <CardDescription>
              All your responses during the assessment session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px] w-full rounded-lg border-2 border-gray-200 p-4 bg-white">
              <div className="space-y-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {assessmentData.transcript || "No transcript available"}
                </p>
              </div>
            </ScrollArea>
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-600 mb-1">Total Words</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assessmentData.transcript.split(" ").length}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-600 mb-1">Total Characters</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assessmentData.transcript.length}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-600 mb-1">Avg Words/Message</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    assessmentData.transcript.split(" ").length /
                      parseInt(assessmentData.messageCount)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => navigate("/")} 
            variant="outline" 
            className="flex-1 h-12 text-base"
          >
            <Home className="mr-2 h-5 w-5" />
            Take Another Assessment
          </Button>
          <Button
            onClick={downloadReport}
            variant="default"
            className="flex-1 h-12 text-base bg-indigo-600 hover:bg-indigo-700"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Full Report
          </Button>
        </div>

        {/* Disclaimer */}
        <Card className="bg-amber-50 border-amber-200 shadow-md">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Important Disclaimer:</strong> This assessment is for informational purposes only 
              and should not be used as a substitute for professional medical advice, diagnosis, or treatment. 
              If you're experiencing symptoms of depression, please consult with a qualified mental health 
              professional.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Results;