export type DomainStatus = 'active' | 'expiring' | 'expired';

export interface Domain {
  id: string;
  name: string;
  registrar: string;
  renewalDate: Date;
  status: DomainStatus;
  owner: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}
