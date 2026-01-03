import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  History as HistoryIcon, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trash2,
  Calendar,
  Loader2,
  Leaf
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Scan = {
  id: string;
  result: 'fresh' | 'rotten' | 'unknown';
  confidence: number | null;
  fruit_type: string | null;
  created_at: string;
};

export default function History() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchScans();
    }
  }, [user]);

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans((data || []).map(scan => ({
        ...scan,
        result: scan.result as 'fresh' | 'rotten' | 'unknown'
      })));
    } catch (error) {
      console.error('Failed to fetch scans:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load scan history.',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteScan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setScans(scans.filter(scan => scan.id !== id));
      toast({
        title: 'Deleted',
        description: 'Scan removed from history.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete scan.',
      });
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'fresh':
        return <CheckCircle className="h-6 w-6 text-primary" />;
      case 'rotten':
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <AlertCircle className="h-6 w-6 text-warning" />;
    }
  };

  const getResultStyles = (result: string) => {
    switch (result) {
      case 'fresh':
        return 'border-primary/30 bg-primary/5';
      case 'rotten':
        return 'border-destructive/30 bg-destructive/5';
      default:
        return 'border-warning/30 bg-warning/5';
    }
  };

  const freshCount = scans.filter(s => s.result === 'fresh').length;
  const rottenCount = scans.filter(s => s.result === 'rotten').length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-3">
            <HistoryIcon className="h-8 w-8 text-primary" />
            Scan History
          </h1>
          <p className="text-muted-foreground">
            View all your previous freshness scans
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-scale-in">
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{scans.length}</p>
              <p className="text-sm text-muted-foreground">Total Scans</p>
            </CardContent>
          </Card>
          <Card variant="glass" className="border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-primary">{freshCount}</p>
              <p className="text-sm text-muted-foreground">Fresh</p>
            </CardContent>
          </Card>
          <Card variant="glass" className="border-destructive/20">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-destructive">{rottenCount}</p>
              <p className="text-sm text-muted-foreground">Rotten</p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <Card variant="default" className="animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : scans.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
                  <Leaf className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No scans yet. Start scanning to see your history!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((scan, index) => (
                  <div
                    key={scan.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:shadow-lg animate-fade-in",
                      getResultStyles(scan.result)
                    )}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {getResultIcon(scan.result)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {scan.fruit_type || 'Unknown Produce'}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="capitalize font-medium">
                            {scan.result}
                          </span>
                          {scan.confidence && (
                            <span>• {scan.confidence.toFixed(1)}% confidence</span>
                          )}
                          <span>• {format(new Date(scan.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteScan(scan.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
