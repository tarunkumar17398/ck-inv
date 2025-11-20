import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Database, Download, Upload, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BackupRestore() {
  const navigate = useNavigate();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = localStorage.getItem('adminLoggedIn');
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadBackups();
  }, [navigate]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('backups').list();
      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error loading backups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load backups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-database');
      
      if (error) throw error;
      
      toast({
        title: 'Backup Created',
        description: 'Database backup created successfully',
      });
      
      await loadBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Backup Failed',
        description: 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (fileName: string) => {
    setRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { fileName },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Restore Complete',
        description: `Database restored from ${fileName}`,
      });
      
      setSelectedBackup(null);
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore backup',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('backups').download(fileName);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Download Started',
        description: `Downloading ${fileName}`,
      });
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download backup',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Backup & Restore
          </h1>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Automated daily backups are enabled. Backups are retained for 30 days. Restoring a backup will replace all current data.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Create Backup</CardTitle>
            <CardDescription>
              Create a manual backup of your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createBackup} disabled={loading}>
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create Backup Now'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Backups</CardTitle>
                <CardDescription>
                  Restore from a previous backup
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadBackups} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No backups found</p>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{backup.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(backup.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBackup(backup.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSelectedBackup(backup.name)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!selectedBackup} onOpenChange={() => setSelectedBackup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current data with the backup from {selectedBackup}. This action cannot be undone. Make sure you have a recent backup before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackup && restoreBackup(selectedBackup)}
              disabled={restoring}
            >
              {restoring ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
