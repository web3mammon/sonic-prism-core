import { createContext, useContext } from "react";

interface BusinessContextType {
  businessName: string;
  setBusinessName: (name: string) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  // In production, this would come from your backend/database
  const businessName = "Acme Corp"; // This will be dynamic from your backend
  const setBusinessName = (name: string) => {
    // Update business name logic
    console.log("Setting business name:", name);
  };

  return (
    <BusinessContext.Provider value={{ businessName, setBusinessName }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}