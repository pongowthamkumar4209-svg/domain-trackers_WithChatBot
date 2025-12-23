import { useState, useEffect } from 'react';
import { Domain, DomainStatus } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DomainFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (domain: Partial<Domain>) => void;
  domain?: Domain | null;
}

const registrars = ['GoDaddy', 'Namecheap', 'Cloudflare', 'Google Domains', 'AWS Route 53', 'Other'];

const DomainFormModal = ({ isOpen, onClose, onSave, domain }: DomainFormModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    registrar: '',
    owner: '',
    renewalDate: new Date(),
    status: 'active' as DomainStatus,
    notes: '',
  });

  useEffect(() => {
    if (domain) {
      setFormData({
        name: domain.name,
        registrar: domain.registrar,
        owner: domain.owner,
        renewalDate: new Date(domain.renewalDate),
        status: domain.status,
        notes: domain.notes || '',
      });
    } else {
      setFormData({
        name: '',
        registrar: '',
        owner: '',
        renewalDate: new Date(),
        status: 'active',
        notes: '',
      });
    }
  }, [domain, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: domain?.id || crypto.randomUUID(),
      createdAt: domain?.createdAt || new Date(),
      updatedAt: new Date(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl tracking-wider">
                {domain ? 'EDIT DOMAIN' : 'ADD NEW DOMAIN'}
              </DialogTitle>
              <DialogDescription>
                {domain ? 'Update domain information' : 'Register a new domain to track'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Domain Name</Label>
            <Input
              id="name"
              placeholder="example.com"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrar">Registrar</Label>
              <Select
                value={formData.registrar}
                onValueChange={(value) => setFormData({ ...formData, registrar: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select registrar" />
                </SelectTrigger>
                <SelectContent>
                  {registrars.map((registrar) => (
                    <SelectItem key={registrar} value={registrar}>
                      {registrar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner / Department</Label>
              <Input
                id="owner"
                placeholder="IT Department"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Renewal Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.renewalDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.renewalDate ? format(formData.renewalDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.renewalDate}
                    onSelect={(date) => date && setFormData({ ...formData, renewalDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as DomainStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this domain..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              {domain ? 'Save Changes' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DomainFormModal;
