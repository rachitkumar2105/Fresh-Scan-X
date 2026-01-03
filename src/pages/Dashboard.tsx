import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
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
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setScanResult(null);
        setCapturedImage(null);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

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

      const response = await fetch('http://localhost:8000/predict', {
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

    } catch (error) {
      console.error("Scan failed:", error);
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: 'Could not connect to analysis server. Is the backend running?',
      });
      setScanResult(null);
    } finally {
      setScanning(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setScanResult(null);
    stopCamera();
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-3">
            <Leaf className="h-8 w-8 text-primary" />
            Freshness Scanner
          </h1>
          <p className="text-muted-foreground">
            Capture or upload an image to analyze produce freshness
          </p>
        </div>

        {/* Scan Area */}
        <Card variant="glass" className="animate-scale-in overflow-hidden">
          <CardContent className="p-6">
            <div className="relative aspect-video bg-secondary/50 rounded-xl overflow-hidden flex items-center justify-center">
              {/* Camera View */}
              {cameraActive && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Captured Image */}
              {capturedImage && !cameraActive && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}

              {/* Scanning Animation */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
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

              {/* Scan Result Overlay */}
              {scanResult && !scanning && (
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-all duration-500",
                  scanResult.result === 'fresh' ? 'bg-primary/10' : 'bg-destructive/10'
                )}>
                  <div className={cn(
                    "text-center p-8 rounded-2xl border-2 animate-scale-in",
                    getResultColor()
                  )}>
                    <div className="flex justify-center mb-4 animate-float">
                      {getResultIcon()}
                    </div>
                    <h3 className="text-2xl font-display font-bold uppercase mb-2">
                      {scanResult.result}
                    </h3>
                    <p className="text-lg font-medium mb-1">{scanResult.fruitType}</p>
                    <p className="text-sm opacity-80">
                      Confidence: {scanResult.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* Placeholder */}
              {!cameraActive && !capturedImage && !scanning && (
                <div className="text-center space-y-4 text-muted-foreground">
                  <div className="w-20 h-20 mx-auto rounded-full bg-secondary flex items-center justify-center">
                    <Camera className="h-10 w-10" />
                  </div>
                  <p>Start camera or upload an image to scan</p>
                </div>
              )}

              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <Button
            variant={cameraActive ? 'destructive' : 'outline'}
            size="lg"
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={scanning}
            className="flex-col h-auto py-4 gap-2"
          >
            <Camera className="h-6 w-6" />
            <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
          </Button>

          <Button
            variant="glow"
            size="lg"
            onClick={captureImage}
            disabled={!cameraActive || scanning}
            className="flex-col h-auto py-4 gap-2"
          >
            <Scan className="h-6 w-6" />
            <span>Capture</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={cameraActive || scanning}
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

          {capturedImage && !scanResult ? (
            <Button
              variant="glow"
              size="lg"
              onClick={performScan}
              disabled={scanning}
              className="flex-col h-auto py-4 gap-2"
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
          ) : (
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
          )}
        </div>

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
