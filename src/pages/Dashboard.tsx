import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Leaf,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MessageSquare,
  ChevronRight,
  Info,
  Zap,
  Settings,
  History as HistoryIcon,
  PieChart,
  BarChart3,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanResult = {
  fruit: string;
  freshness: string;
  confidence: number;
  status: 'Safe' | 'Caution' | 'Unsafe' | 'Not Sure';
  consumption_window: string;
  risk_level: 'Low' | 'Medium' | 'High';
  message: string;
  error?: string;
};

type IndustryMode = 'Household' | 'Retail' | 'Warehouse' | 'Agriculture';

export default function Dashboard() {
  // State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [askingLLM, setAskingLLM] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [industryMode, setIndustryMode] = useState<IndustryMode>('Household');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isBackendReady } = useBackend();

  // Camera Management
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsLive(true);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsLive(false);
    }
  };

  const captureFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    }
    return null;
  }, []);

  // Scan Logic
  const performScan = async (imageToScan?: string) => {
    const image = imageToScan || capturedImage;
    if (!image || !user) return;

    setScanning(true);
    setExplanation(null);

    try {
      const response = await fetch(image);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'scan.jpg');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const scanResponse = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!scanResponse.ok) throw new Error("Server error");
      const data = await scanResponse.json();

      if (data.error) {
        if (!autoScan) {
          toast({ variant: 'destructive', title: 'Validation Error', description: data.error });
        }
        return null;
      }

      setScanResult(data);
      if (isLive && !imageToScan) setCapturedImage(image);
      
      // Save to Supabase
      await supabase.from('scans').insert({
        user_id: user.id,
        result: data.freshness.toLowerCase(),
        confidence: data.confidence,
        fruit_type: data.fruit,
        metadata: { mode: industryMode }
      });

      // Auto-stop live if we found something
      if (isLive && !autoScan) stopCamera();
      
      return data;
    } catch (error) {
      if (!autoScan) {
        toast({ variant: 'destructive', title: 'Scan Failed', description: 'Analysis failed.' });
      }
    } finally {
      setScanning(false);
    }
  };

  // Auto-detection loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive && autoScan && !scanning) {
      interval = setInterval(() => {
        const frame = captureFrame();
        if (frame) performScan(frame);
      }, 3000); // Scan every 3 seconds
    }
    return () => clearInterval(interval);
  }, [isLive, autoScan, scanning, captureFrame]);

  const handleManualCapture = () => {
    const frame = captureFrame();
    if (frame) {
      setCapturedImage(frame);
      stopCamera();
      performScan(frame);
    }
  };

  const getAIExplanation = async (customPrompt?: string) => {
    if (!capturedImage || !scanResult) return;
    
    setAskingLLM(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('groq_api_key');
      
      const formData = new FormData();
      formData.append('image_data', capturedImage);
      formData.append('fruit', scanResult.fruit);
      formData.append('freshness', scanResult.freshness);
      formData.append('status', scanResult.status);
      if (customPrompt) formData.append('custom_prompt', customPrompt);
      if (apiKey) formData.append('api_key', apiKey);

      const response = await fetch(`${apiUrl}/explain`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Failed', description: 'Check Groq Key.' });
    } finally {
      setAskingLLM(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setScanResult(null);
    setExplanation(null);
    setAutoScan(false);
    stopCamera();
  };

  const statusConfig = scanResult ? {
    Safe: { icon: CheckCircle, color: 'text-primary', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    Unsafe: { icon: XCircle, color: 'text-destructive', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    Caution: { icon: AlertCircle, color: 'text-warning', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    "Not Sure": { icon: Info, color: 'text-muted-foreground', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' }
  }[scanResult.status] : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        
        {/* Top Header & Mode Selector */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight gradient-text uppercase">
              FreshScanX Industry AI
            </h1>
            <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase flex items-center justify-center md:justify-start gap-2">
              <Zap className="h-3 w-3 text-primary" />
              Real-Time Inference Mode
            </p>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl border border-border/50">
            {(['Household', 'Retail', 'Warehouse'] as IndustryMode[]).map(mode => (
              <Button
                key={mode}
                variant={industryMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setIndustryMode(mode)}
                className={cn("text-[10px] font-bold uppercase tracking-widest h-8 px-4", industryMode === mode && "bg-background shadow-sm")}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Scanning Console (Left) */}
          <div className="lg:col-span-7 space-y-6">
            <Card variant="glass" className="overflow-hidden border-2 border-primary/10 rounded-3xl relative group">
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
                  
                  {/* Live Stream or Static Image */}
                  {isLive ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  ) : capturedImage ? (
                    <img src={capturedImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="h-10 w-10 text-primary/40" />
                      </div>
                      <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Awaiting Input</p>
                    </div>
                  )}

                  {/* Scanning Overlay */}
                  {(scanning || autoScan) && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-scan z-30 shadow-[0_0_15px_rgba(34,197,94,1)]" />
                      {autoScan && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold animate-pulse uppercase tracking-widest z-40">
                          <Zap className="h-3 w-3" /> Live
                        </div>
                      )}
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Control Bar */}
                <div className="p-4 bg-card/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-between gap-4">
                  {!isLive && !capturedImage ? (
                    <>
                      <Button onClick={startCamera} variant="outline" className="flex-1 h-12 rounded-xl gap-2 font-bold uppercase text-xs">
                        <Camera className="h-4 w-4 text-primary" /> Start Camera
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 h-12 rounded-xl gap-2 font-bold uppercase text-xs">
                        <Upload className="h-4 w-4 text-primary" /> Gallery
                      </Button>
                    </>
                  ) : (
                    <div className="flex w-full gap-3">
                      <Button onClick={resetScan} variant="ghost" className="h-12 rounded-xl text-muted-foreground hover:bg-destructive/10">
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                      
                      {isLive ? (
                        <>
                          <Button 
                            onClick={() => setAutoScan(!autoScan)} 
                            variant={autoScan ? 'glow' : 'outline'} 
                            className={cn("flex-1 h-12 rounded-xl gap-2 font-bold uppercase text-xs", autoScan && "bg-red-500/10 border-red-500/50 text-red-500")}
                          >
                            <Zap className={cn("h-4 w-4", autoScan && "animate-pulse")} /> {autoScan ? 'Stop Auto' : 'Auto Scan'}
                          </Button>
                          <Button onClick={handleManualCapture} variant="glow" className="h-12 w-12 rounded-xl p-0">
                            <Scan className="h-6 w-6" />
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => performScan()} disabled={scanning} className="flex-1 h-12 rounded-xl font-bold uppercase text-xs gap-2">
                          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />} Analyze Again
                        </Button>
                      )}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => {
                    handleFileUpload(e);
                    stopCamera();
                  }} className="hidden" />
                </div>
              </CardContent>
            </Card>

            {/* Smart Suggested Questions */}
            {scanResult && (
              <div className="flex flex-wrap gap-2">
                {[
                  "Why is this unsafe?",
                  "Can I still eat it?",
                  "Recipe suggestion?",
                  "How to store this?",
                  "Is it healthy?"
                ].map(q => (
                  <Button 
                    key={q} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => getAIExplanation(q)}
                    className="rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary/30 border-primary/10 hover:bg-primary/5 hover:border-primary/30"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Analysis & AI Result (Right) */}
          <div className="lg:col-span-5 space-y-6">
            {!scanResult && !scanning ? (
              <Card className="h-[300px] border-2 border-dashed border-muted flex items-center justify-center p-12 text-center bg-muted/5 rounded-3xl">
                <div className="space-y-4">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                    System Ready.<br/>Waiting for Image Input.
                  </p>
                </div>
              </Card>
            ) : scanResult && (
              <div className="space-y-6 animate-scale-in">
                {/* Result Card */}
                <Card className={cn("overflow-hidden border-2 rounded-3xl transition-all shadow-xl", 
                  scanResult.status === 'Safe' ? 'border-primary/20 bg-primary/5' : 
                  scanResult.status === 'Unsafe' ? 'border-destructive/20 bg-destructive/5' : 
                  'border-warning/20 bg-warning/5'
                )}>
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <div className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", statusConfig?.badge)}>
                        {scanResult.status}
                      </div>
                      <div className="p-2 bg-background rounded-lg shadow-sm">
                        <statusConfig.icon className={cn("h-6 w-6", statusConfig.color)} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2 space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-4xl font-display font-black tracking-tight leading-none uppercase">{scanResult.freshness}</h2>
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{scanResult.fruit} Detected</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Confidence</p>
                        <p className="text-2xl font-black">{scanResult.confidence.toFixed(1)}%</p>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all" style={{ width: `${scanResult.confidence}%` }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Risk Factor</p>
                        <p className={cn("text-2xl font-black", scanResult.risk_level === 'High' ? 'text-destructive' : 'text-primary')}>
                          {scanResult.risk_level}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-background/50 rounded-2xl border border-border/50 flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recommendation</p>
                        <p className="text-sm font-bold">{scanResult.consumption_window}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Explanation / Chat Output */}
                {explanation && (
                  <Card className="border-2 border-primary/20 bg-primary/5 rounded-3xl overflow-hidden animate-scale-in">
                    <CardHeader className="bg-primary/10 p-4 border-b border-primary/10 flex flex-row items-center gap-3">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xs font-black uppercase tracking-widest">Groq Intelligence Output</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium">
                        {explanation}
                      </div>
                      <div className="mt-6 pt-4 border-t border-primary/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-primary" /> Verified Analysis
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExplanation(null)} className="h-8 text-xs font-bold text-primary">
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {askingLLM && (
                  <div className="flex items-center justify-center p-8 bg-secondary/20 rounded-3xl border-2 border-dashed border-primary/20">
                    <div className="text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Groq is thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
