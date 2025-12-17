import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Database, Download, Upload, ArrowLeft, RefreshCw, AlertTriangle, Cloud, CheckCircle2, FileUp } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function BackupRestore() {
  const navigate = useNavigate();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [lastGoogleDriveSync, setLastGoogleDriveSync] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    loadBackups();
  }, []);

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
    if (!session?.access_token) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in again to create a backup',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-database', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      const googleDriveMsg = data?.googleDriveUploaded 
        ? ' Also synced to Google Drive.' 
        : '';
      
      if (data?.googleDriveUploaded) {
        setLastGoogleDriveSync(new Date().toISOString());
      }
      
      toast({
        title: 'Backup Created',
        description: `Database backup created successfully.${googleDriveMsg}`,
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
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload a JSON backup file',
          variant: 'destructive',
        });
        return;
      }
      setUploadedFile(file);
      setShowUploadConfirm(true);
    }
  };

  const restoreFromUploadedFile = async () => {
    if (!uploadedFile) return;
    
    setRestoring(true);
    try {
      const fileContent = await uploadedFile.text();
      const backupData = JSON.parse(fileContent);
      
      // Validate backup structure
      if (!backupData.items && !backupData.categories) {
        throw new Error('Invalid backup file format');
      }
      
      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { backupData },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Restore Complete',
        description: `Database restored from uploaded file`,
      });
      
      setShowUploadConfirm(false);
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error restoring from file:', error);
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore from uploaded file',
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
            Automated daily backups are enabled. Backups are retained for 30 days and synced to Google Drive. Restoring a backup will replace all current data.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Google Drive Sync
            </CardTitle>
            <CardDescription>
              Backups are automatically synced to your Google Drive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Connected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Folder: CK Inventory Backups
              </span>
            </div>
            {lastGoogleDriveSync && (
              <p className="text-sm text-muted-foreground mt-2">
                Last sync: {new Date(lastGoogleDriveSync).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Restore from File
            </CardTitle>
            <CardDescription>
              Upload a backup file downloaded from Google Drive or local storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="max-w-xs"
              />
              <span className="text-sm text-muted-foreground">
                JSON backup files only
              </span>
            </div>
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

      <AlertDialog open={showUploadConfirm} onOpenChange={(open) => {
        setShowUploadConfirm(open);
        if (!open) {
          setUploadedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Uploaded File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current data with the backup from "{uploadedFile?.name}". This action cannot be undone. Make sure you have a recent backup before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={restoreFromUploadedFile}
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
