import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useCurrentClient } from './useCurrentClient';

export interface TenantInfo {
  region: string;
  industry: string;
  clientName: string;
  isValid: boolean;
  displayName: string;
}

export const useTenant = (): TenantInfo => {
  const { region, industry, clientname } = useParams();
  const location = useLocation();
  const { hasRole } = useAuth();
  const { client, loading } = useCurrentClient();

  // Check if we're on a tenant-specific route
  const isTenantRoute = /^\/[a-z]{2}\/[a-z]{3,4}\/[a-zA-Z0-9-]+/.test(location.pathname);
  
  // Valid if we have all URL params, it's a tenant route, and client exists in database
  const isValid = Boolean(
    region && 
    industry && 
    clientname && 
    isTenantRoute &&
    client && 
    !loading
  );

  // Use business name from database or fallback to client name
  const displayName = client?.business_name || clientname || '';

  return {
    region: region || '',
    industry: industry || '',
    clientName: clientname || '',
    isValid,
    displayName
  };
};