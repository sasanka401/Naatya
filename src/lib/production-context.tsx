import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';
import type { Production } from './types';

import { useAuth } from './auth-context';

const ALL = 'all';

interface ProductionContextType {
  productions: Production[];
  selectedId: string; // production uuid or 'all'
  setSelectedId: (id: string) => void;
  isAll: boolean;
  reload: () => Promise<void>;
}

const ProductionContext = createContext<ProductionContextType>({
  productions: [],
  selectedId: ALL,
  setSelectedId: () => {},
  isAll: true,
  reload: async () => {},
});

export function ProductionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [productions, setProductions] = useState<Production[]>([]);
  const [selectedId, setSelectedId] = useState<string>(ALL);

  async function reload() {
    if (!user) {
      setProductions([]);
      return;
    }

    // Admins and Directors see all productions
    if (profile?.is_admin || profile?.detailed_role === 'Director' || profile?.role === 'Director') {
      const { data } = await supabase
        .from('productions')
        .select('*')
        .order('created_at', { ascending: true });
      setProductions((data as Production[]) ?? []);
      return;
    }

    // Regular users: fetch their allowed production IDs
    const allowedIds: string[] = [];

    // 1. Production from their linked member record
    if (profile?.member_id) {
      const { data: memberData } = await supabase
        .from('members')
        .select('production_id')
        .eq('id', profile.member_id)
        .maybeSingle();
      if (memberData?.production_id) {
        allowedIds.push(memberData.production_id);
      }
    }

    // 2. Productions unlocked via script room access (project approval)
    const { data: accessData } = await supabase
      .from('script_room_access')
      .select('production_id')
      .eq('profile_id', user.id)
      .eq('status', 'active');
    
    if (accessData) {
      accessData.forEach(row => {
        if (row.production_id && !allowedIds.includes(row.production_id)) {
          allowedIds.push(row.production_id);
        }
      });
    }

    if (allowedIds.length === 0) {
      setProductions([]);
      return;
    }

    const { data } = await supabase
      .from('productions')
      .select('*')
      .in('id', allowedIds)
      .order('created_at', { ascending: true });
      
    setProductions((data as Production[]) ?? []);
  }

  useEffect(() => {
    reload();
  }, [user, profile]);

  return (
    <ProductionContext.Provider
      value={{ productions, selectedId, setSelectedId, isAll: selectedId === ALL, reload }}
    >
      {children}
    </ProductionContext.Provider>
  );
}

export function useProduction() {
  return useContext(ProductionContext);
}

/**
 * Helper to apply the current production filter to a Supabase query.
 * Pass the query builder; returns it filtered (or untouched for 'All').
 */
export function applyProductionFilter<T>(query: T, selectedId: string): T {
  if (selectedId === ALL) return query;
  // @ts-expect-error supabase query builder is chainable
  return query.eq('production_id', selectedId);
}
