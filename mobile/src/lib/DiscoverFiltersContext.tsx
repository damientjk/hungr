import { createContext, useContext, useState, ReactNode } from "react";

export interface DiscoverFilters {
  halal: boolean;
  vegetarian: boolean;
  vegan: boolean;
}

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  halal: false,
  vegetarian: false,
  vegan: false,
};

interface DiscoverFiltersContextValue {
  filters: DiscoverFilters;
  setFilters: (filters: DiscoverFilters) => void;
}

const DiscoverFiltersContext = createContext<DiscoverFiltersContextValue | null>(null);

export function DiscoverFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_DISCOVER_FILTERS);
  return (
    <DiscoverFiltersContext.Provider value={{ filters, setFilters }}>
      {children}
    </DiscoverFiltersContext.Provider>
  );
}

export function useDiscoverFilters() {
  const ctx = useContext(DiscoverFiltersContext);
  if (!ctx) throw new Error("useDiscoverFilters must be used within DiscoverFiltersProvider");
  return ctx;
}
