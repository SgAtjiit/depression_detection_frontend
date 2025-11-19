import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, MessageSquare, Activity, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Brain className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Depression Detection AI</h1>
            <p className="text-sm text-gray-600">AI-powered mental health assessment</p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-100 rounded-full">
              <Brain className="h-16 w-16 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Mental Health Assessment
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered depression detection through voice and conversation analysis
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-indigo-600 mb-2" />
              <CardTitle>Conversational AI</CardTitle>
              <CardDescription>
                Natural dialogue with our empathetic AI assistant
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Activity className="h-8 w-8 text-indigo-600 mb-2" />
              <CardTitle>Voice Analysis</CardTitle>
              <CardDescription>
                Advanced audio processing to detect emotional patterns
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-indigo-600 mb-2" />
              <CardTitle>Multi-Modal Analysis</CardTitle>
              <CardDescription>
                Combines text and audio for comprehensive assessment
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => navigate("/assessment")}
          >
            Start Assessment
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            Confidential • Secure • AI-Powered
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;