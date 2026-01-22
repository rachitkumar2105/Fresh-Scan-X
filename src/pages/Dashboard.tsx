import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { useBackend } from '@/App';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Leaf
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanResult = {
  result: 'fresh' | 'rotten' | 'unknown';
  confidence: number;
  fruitType: string;
};

export default function Dashboard() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isBackendReady } = useBackend();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Please upload an image file.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setScanResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const performScan = async () => {
    if (!capturedImage || !user) return;

    setScanning(true);

    try {
      // Convert base64 capturedImage to Blob
      let blob;
      if (capturedImage.startsWith('data:')) {
        const response = await fetch(capturedImage);
        blob = await response.blob();
      } else {
        // Should not happen with current logic as capturedImage is always data URL
        throw new Error("Invalid image data");
      }

      const formData = new FormData();
      formData.append('file', blob, 'scan.jpg');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Check if backend is actually reachable before sending the payload
      try {
        const healthCheck = await fetch(`${apiUrl}/health`);
        if (!healthCheck.ok) throw new Error("Backend not healthy");
      } catch (err) {
        throw new Error("Backend connection failed. Please wait a moment for services to start.");
      }

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      const result: ScanResult = {
        result: data.result,
        confidence: data.confidence,
        fruitType: data.fruitType
      };

      setScanResult(result);

      // Save to database
      try {
        await supabase.from('scans').insert({
          user_id: user.id,
          result: result.result,
          confidence: result.confidence,
          fruit_type: result.fruitType,
        });
      } catch (error) {
        console.error('Failed to save scan:', error);
      }

    } catch (error: any) {
      console.error("Scan failed:", error);
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: error.message || 'Could not connect to analysis server. Is the backend running?',
      });
      setScanResult(null);
    } finally {
      setScanning(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (nativeInputRef.current) nativeInputRef.current.value = '';
  };

  const getResultIcon = () => {
    if (!scanResult) return null;
    switch (scanResult.result) {
      case 'fresh':
        return <CheckCircle className="h-16 w-16 text-primary" />;
      case 'rotten':
        return <XCircle className="h-16 w-16 text-destructive" />;
      default:
        return <AlertCircle className="h-16 w-16 text-warning" />;
    }
  };

  const getResultColor = () => {
    if (!scanResult) return '';
    switch (scanResult.result) {
      case 'fresh':
        return 'text-primary border-primary/30 bg-primary/5';
      case 'rotten':
        return 'text-destructive border-destructive/30 bg-destructive/5';
      default:
        return 'text-warning border-warning/30 bg-warning/5';
    }
  };

  const getSafetyMessage = () => {
    if (!scanResult) return null;
    switch (scanResult.result) {
      case 'fresh':
        return { text: "Safe for consumption", color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" };
      case 'rotten':
        return { text: "Unsafe for consumption", color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400" };
      default:
        return { text: "Analysis Inconclusive", color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400" };
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-3">
            <Leaf className="h-8 w-8 text-primary" />
            Fruit Freshness Scanner
          </h1>
          <p className="text-muted-foreground">
            Capture or upload an image to analyze produce freshness
          </p>
        </div>

        {/* Backend Status Indicator */}
        {!isBackendReady && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-center text-sm font-medium animate-pulse">
            Connecting to AI Analysis Engine... Please wait a moment.
          </div>
        )}

        {/* Scan Area */}
        <Card variant="glass" className="animate-scale-in overflow-hidden">
          <CardContent className="p-6">
            <div className="relative aspect-video bg-secondary/50 rounded-xl overflow-hidden flex items-center justify-center">

              {/* Captured Image */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}

              {/* Scanning Animation */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-primary/30 rounded-full animate-ping absolute inset-0" />
                      <div className="w-24 h-24 border-4 border-primary rounded-full flex items-center justify-center">
                        <Scan className="h-10 w-10 text-primary animate-pulse" />
                      </div>
                    </div>
                    <p className="text-primary font-medium animate-pulse">Analyzing...</p>
                  </div>
                </div>
              )}

              {/* Placeholder */}
              {!capturedImage && !scanning && (
                <div className="text-center space-y-4 text-muted-foreground">
                  <div className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center">
                    <Camera className="h-10 w-10" />
                  </div>
                  <p>Upload a photo to start scanning</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => nativeInputRef.current?.click()}
            disabled={scanning}
            className="flex-col h-auto py-4 gap-2"
          >
            <Camera className="h-6 w-6" />
            <span>Take Photo</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="flex-col h-auto py-4 gap-2"
          >
            <Upload className="h-6 w-6" />
            <span>Upload</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={nativeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {capturedImage && !scanResult && (
            <div className="col-span-2 flex gap-4">
              <Button
                variant="glow"
                size="lg"
                onClick={performScan}
                disabled={scanning || !isBackendReady}
                className="flex-1 flex-col h-auto py-4 gap-2"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-6 w-6" />
                    <span>Scan Now</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={resetScan}
                disabled={scanning}
                className="flex-col h-auto py-4 gap-2"
              >
                <RotateCcw className="h-6 w-6" />
                <span>Reset</span>
              </Button>
            </div>
          )}

          {capturedImage && scanResult && (
            <div className="col-span-2">
              <Button
                variant="ghost"
                size="lg"
                onClick={resetScan}
                disabled={scanning}
                className="w-full flex-col h-auto py-4 gap-2"
              >
                <RotateCcw className="h-6 w-6" />
                <span>Scan Another</span>
              </Button>
            </div>
          )}
        </div>

        {/* Result Section */}
        {scanResult && !scanning && (
          <Card className={cn("animate-scale-in border-2 overflow-hidden", getResultColor())}>
            <CardContent className="p-8 text-center space-y-6">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-background shadow-lg animate-float">
                  {getResultIcon()}
                </div>

                <div className="space-y-2">
                  <h3 className="text-4xl font-display font-bold uppercase tracking-wider">
                    {scanResult.result}
                  </h3>
                  <p className="text-xl text-muted-foreground font-medium">
                    Detected: {scanResult.fruitType}
                  </p>
                </div>

                <div className={cn(
                  "px-6 py-2 rounded-full font-bold text-lg tracking-wide shadow-sm",
                  getSafetyMessage()?.color
                )}>
                  {getSafetyMessage()?.text}
                </div>

                <div className="grid grid-cols-2 gap-8 w-full max-w-xs mt-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground uppercase tracking-widest text-xs">Confidence</p>
                    <p className="text-2xl font-bold">{scanResult.confidence.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground uppercase tracking-widest text-xs">Quality</p>
                    <p className="text-2xl font-bold capitalize">{scanResult.result}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card variant="default" className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="text-lg">Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Ensure good lighting for accurate detection
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Center the fruit/vegetable in the frame
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Avoid blurry images for better accuracy
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Capture multiple angles for complex produce
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
