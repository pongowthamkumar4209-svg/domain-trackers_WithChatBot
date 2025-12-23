import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import DomainTable from '@/components/dashboard/DomainTable';
import SearchFilter from '@/components/dashboard/SearchFilter';
import DomainFormModal from '@/components/domains/DomainFormModal';
import DeleteConfirmModal from '@/components/domains/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { mockDomains } from '@/data/mockDomains';
import { Domain, DomainStatus } from '@/types/domain';
import { Plus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Domains = () => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>(mockDomains);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DomainStatus | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  const filteredDomains = useMemo(() => {
    return domains.filter((domain) => {
      const matchesSearch = domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        domain.registrar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        domain.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || domain.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [domains, searchQuery, statusFilter]);

  const handleEdit = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsFormOpen(true);
  };

  const handleDelete = (domain: Domain) => {
    setSelectedDomain(domain);
    setIsDeleteOpen(true);
  };

  const handleSave = (domainData: Partial<Domain>) => {
    if (selectedDomain) {
      setDomains(domains.map((d) =>
        d.id === selectedDomain.id ? { ...d, ...domainData } as Domain : d
      ));
      toast({
        title: 'Domain Updated',
        description: `${domainData.name} has been updated successfully.`,
      });
    } else {
      setDomains([...domains, domainData as Domain]);
      toast({
        title: 'Domain Added',
        description: `${domainData.name} has been added to your tracking.`,
      });
    }
    setSelectedDomain(null);
  };

  const handleConfirmDelete = () => {
    if (selectedDomain) {
      setDomains(domains.filter((d) => d.id !== selectedDomain.id));
      toast({
        title: 'Domain Deleted',
        description: `${selectedDomain.name} has been removed.`,
        variant: 'destructive',
      });
      setSelectedDomain(null);
      setIsDeleteOpen(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Domain Name', 'Registrar', 'Owner', 'Renewal Date', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredDomains.map((d) => [
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
    a.download = 'domain-registry.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Domain data has been exported to CSV.',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl tracking-wider text-foreground md:text-4xl">
              ALL DOMAINS
            </h1>
            <p className="mt-1 text-muted-foreground">
              Complete registry of tracked domains
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="accent" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {/* Domain Table */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {filteredDomains.length} of {domains.length} domains
            </span>
          </div>
          <DomainTable
            domains={filteredDomains}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Modals */}
      <DomainFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDomain(null);
        }}
        onSave={handleSave}
        domain={selectedDomain}
      />
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedDomain(null);
        }}
        onConfirm={handleConfirmDelete}
        domain={selectedDomain}
      />
    </MainLayout>
  );
};

export default Domains;
