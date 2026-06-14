import React, { createContext, useContext, useState } from 'react';
import type { DataSource } from './useGarminData';

interface DataSourceContextType {
  source: DataSource;
  setSource: (s: DataSource) => void;
}

const DataSourceContext = createContext<DataSourceContextType>({
  source: 'mock',
  setSource: () => {},
});

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<DataSource>('mock');
  return (
    <DataSourceContext.Provider value={{ source, setSource }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  return useContext(DataSourceContext);
}
