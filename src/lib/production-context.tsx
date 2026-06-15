import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';
import type { Production } from './types';

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
  const [productions, setProductions] = useState<Production[]>([]);
  const [selectedId, setSelectedId] = useState<string>(ALL);

  async function reload() {
    const { data } = await supabase
      .from('productions')
      .select('*')
      .order('created_at', { ascending: true });
    setProductions((data as Production[]) ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

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
