import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Bell, Shield, Database, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const Settings = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    expirationWarnings: true,
    weeklyDigest: false,
    instantNotifications: true,
  });

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your preferences have been updated.',
    });
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-3xl tracking-wider text-foreground md:text-4xl">
            SETTINGS
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account and notification preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg tracking-wider">
                  PROFILE SETTINGS
                </CardTitle>
                <CardDescription>Update your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Admin User" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="admin@railroad.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Organization</Label>
              <Input id="company" defaultValue="Railroad Domain Services" />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle className="font-display text-lg tracking-wider">
                  NOTIFICATIONS
                </CardTitle>
                <CardDescription>Configure how you receive alerts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important events
                </p>
              </div>
              <Switch
                checked={notifications.emailAlerts}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, emailAlerts: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Expiration Warnings</p>
                <p className="text-sm text-muted-foreground">
                  Get notified 30 days before domain expiration
                </p>
              </div>
              <Switch
                checked={notifications.expirationWarnings}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, expirationWarnings: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Digest</p>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of domain status
                </p>
              </div>
              <Switch
                checked={notifications.weeklyDigest}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, weeklyDigest: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Instant Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Real-time alerts for expired domains
                </p>
              </div>
              <Switch
                checked={notifications.instantNotifications}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, instantNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card className="border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Database className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="font-display text-lg tracking-wider">
                  INTEGRATIONS
                </CardTitle>
                <CardDescription>Connect external services</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Service</p>
                  <p className="text-sm text-muted-foreground">Connect your email provider</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">API Access</p>
                  <p className="text-sm text-muted-foreground">Manage API keys and access</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="accent" size="lg" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
