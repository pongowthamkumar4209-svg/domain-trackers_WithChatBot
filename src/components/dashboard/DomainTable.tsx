import { Domain } from '@/types/domain';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ExternalLink, RefreshCw } from 'lucide-react';

interface DomainTableProps {
  domains: Domain[];
  onEdit?: (domain: Domain) => void;
  onDelete?: (domain: Domain) => void;
}

const statusStyles = {
  active: 'bg-success/10 text-success border-success/30 hover:bg-success/20',
  expiring: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20',
  expired: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
};

const statusLabels = {
  active: 'Active',
  expiring: 'Expiring Soon',
  expired: 'Expired',
};

const DomainTable = ({ domains, onEdit, onDelete }: DomainTableProps) => {
  const getDaysUntilRenewal = (date: Date) => {
    const days = differenceInDays(date, new Date());
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days === 0) return 'Today';
    return `${days} days`;
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-display text-sm tracking-wider">Domain Name</TableHead>
            <TableHead className="font-display text-sm tracking-wider">Registrar</TableHead>
            <TableHead className="font-display text-sm tracking-wider">Owner</TableHead>
            <TableHead className="font-display text-sm tracking-wider">Renewal Date</TableHead>
            <TableHead className="font-display text-sm tracking-wider">Status</TableHead>
            <TableHead className="font-display text-sm tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain, index) => (
            <TableRow
              key={domain.id}
              className="group transition-colors hover:bg-muted/30 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{domain.name}</span>
                  <a
                    href={`https://${domain.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </a>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{domain.registrar}</TableCell>
              <TableCell className="text-muted-foreground">{domain.owner}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-foreground">
                    {format(domain.renewalDate, 'MMM dd, yyyy')}
                  </span>
                  <span className={cn(
                    'text-xs',
                    domain.status === 'expired' ? 'text-destructive' :
                    domain.status === 'expiring' ? 'text-warning' : 'text-muted-foreground'
                  )}>
                    {getDaysUntilRenewal(domain.renewalDate)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn('font-medium', statusStyles[domain.status])}
                >
                  {statusLabels[domain.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(domain)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Renew
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete?.(domain)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DomainTable;
