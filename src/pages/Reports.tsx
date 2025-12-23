import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockDomains, calculateStats } from '@/data/mockDomains';
import { FileText, Download, Calendar, PieChart, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Reports = () => {
  const { toast } = useToast();
  const stats = calculateStats(mockDomains);

  const handleExportCSV = () => {
    const headers = ['Domain Name', 'Registrar', 'Owner', 'Renewal Date', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...mockDomains.map((d) => [
        d.name,
        d.registrar,
        d.owner,
        d.renewalDate.toISOString().split('T')[0],
        d.status,
        `"${d.notes || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domain-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Report Generated',
      description: 'Your domain report has been downloaded.',
    });
  };

  const upcomingRenewals = mockDomains
    .filter(d => d.status === 'expiring')
    .sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());

  const expiredDomains = mockDomains.filter(d => d.status === 'expired');

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl tracking-wider text-foreground md:text-4xl">
              REPORTS
            </h1>
            <p className="mt-1 text-muted-foreground">
              Domain analytics and exportable reports
            </p>
          </div>
          <Button variant="accent" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export Full Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-border shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                <CardTitle className="font-display text-lg tracking-wider">
                  PORTFOLIO SUMMARY
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Domains</span>
                  <span className="font-display text-xl">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active</span>
                  <Badge className="bg-success/10 text-success">{stats.active}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiring</span>
                  <Badge className="bg-warning/10 text-warning">{stats.expiringSoon}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expired</span>
                  <Badge className="bg-destructive/10 text-destructive">{stats.expired}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-warning" />
                <CardTitle className="font-display text-lg tracking-wider">
                  UPCOMING RENEWALS
                </CardTitle>
              </div>
              <CardDescription>Domains expiring within 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingRenewals.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRenewals.slice(0, 3).map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{domain.name}</span>
                      <span className="text-xs text-warning">
                        {format(domain.renewalDate, 'MMM dd')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming renewals</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-destructive" />
                <CardTitle className="font-display text-lg tracking-wider">
                  NEEDS ATTENTION
                </CardTitle>
              </div>
              <CardDescription>Expired domains requiring action</CardDescription>
            </CardHeader>
            <CardContent>
              {expiredDomains.length > 0 ? (
                <div className="space-y-3">
                  {expiredDomains.slice(0, 3).map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{domain.name}</span>
                      <span className="text-xs text-destructive">
                        Expired {format(domain.renewalDate, 'MMM dd')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All domains are active</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="mb-4 font-display text-xl tracking-wider text-foreground">
            AVAILABLE REPORTS
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg tracking-wider">Domain Registry</h3>
                  <p className="text-sm text-muted-foreground">Complete list of all domains</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleExportCSV}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg tracking-wider">Renewal Schedule</h3>
                  <p className="text-sm text-muted-foreground">Upcoming renewal dates</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleExportCSV}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card hover:shadow-card-hover transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg tracking-wider">Status Report</h3>
                  <p className="text-sm text-muted-foreground">Domains by status</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleExportCSV}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
