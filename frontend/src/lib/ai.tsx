import { ReactNode, createContext } from "react";

export const AIContext = createContext(null);

export function AIProvider({ children }: { children: ReactNode }) {
  return <AIContext.Provider value={null}>{children}</AIContext.Provider>;
}
