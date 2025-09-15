import * as React from "react";

export function Tabs({ value, onValueChange, children }: any) {
  return <div>{children}</div>;
}

export function TabsList({ children, className }: any) {
  return <div className={`flex gap-2 ${className}`}>{children}</div>;
}

export function TabsTrigger({ value, children, onClick }: any) {
  return (
    <button
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-gray-100 hover:bg-blue-100 text-gray-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white shadow-sm`}
      onClick={onClick}
      data-state="inactive"
    >
      {children}
    </button>
  );
}



export function TabsContent({ value, children }: any) {
  return <div className="mt-4">{children}</div>;
}
