import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { clearAllData, getUploads } from '@/services/storageService';
import { exportToCSV } from '@/services/exportService';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  Trash2, 
  Database, 
  FileSpreadsheet,
  History,
  Shield,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const handleClearData = async () => {
    await clearAllData();
    toast({
      title: 'Data cleared',
      description: 'All clarification data has been removed.',
    });
  };

  const handleExportAll = async () => {
    try {
      const { getClarifications } = await import('@/services/storageService');
      const rows = await getClarifications();
      if (rows.length === 0) {
        toast({
          title: 'No data to export',
          description: 'Upload an Excel file first.',
          variant: 'destructive',
        });
        return;
      }
      exportToCSV(rows, 'all-clarifications.csv');
      toast({
        title: 'Export successful',
        description: `Exported ${rows.length} rows to CSV.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-wide">Settings</h1>
          <p className="text-muted-foreground">Manage your portal preferences and data</p>
        </div>

        <Tabs defaultValue="data" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="data" className="gap-2">
              <Database className="h-4 w-4" />
              Data Management
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Bell className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Upload Excel File
                </CardTitle>
                <CardDescription>
                  Upload an Excel file with a "clarification" sheet. New unique rows will be added to existing data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/upload')} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Go to Upload Page
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Download all clarification data as a CSV file for backup or analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleExportAll} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export All to CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Upload History
                </CardTitle>
                <CardDescription>
                  View the history of all Excel file uploads.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate('/history')} className="gap-2">
                  <History className="h-4 w-4" />
                  View Upload History
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Clear All Data
                </CardTitle>
                <CardDescription>
                  Permanently delete all clarification data and upload history. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all clarification data and upload history.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Configuration</CardTitle>
                <CardDescription>
                  Configure how Excel files are processed during upload.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sheet-name">Required Sheet Name</Label>
                  <Input id="sheet-name" value="clarification" disabled />
                  <p className="text-sm text-muted-foreground">
                    The Excel file must contain a sheet named exactly "clarification".
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Deduplication Rules</h4>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Rows are deduplicated using a SHA256 hash of key fields</li>
                    <li>Key fields: S.no, Module, Scenario/Steps, Status, Date, Assigned To, Priority, Reason</li>
                    <li>Existing rows are never modified or deleted</li>
                    <li>Only new unique rows are appended</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure notification preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show toast notifications for actions
                    </p>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Save</CardTitle>
                <CardDescription>
                  Configure auto-save preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-save to browser storage</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save data to IndexedDB
                    </p>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Authentication settings and security information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm">
                    <strong>Current User:</strong> admin
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Default credentials are used for demo purposes. Configure via environment variables for production.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
