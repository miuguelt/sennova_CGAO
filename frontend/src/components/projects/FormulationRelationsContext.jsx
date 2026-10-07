import React, { createContext, useContext } from 'react';

const RelationsContext = createContext({});
export function FormulationRelationsProvider({ options = {}, children }) {
  return <RelationsContext.Provider value={options}>{children}</RelationsContext.Provider>;
}
export function useFormulationRelations() {
  return useContext(RelationsContext);
}
