import React from "react";

export function Card({ children, className = "" }: any) {
  return (
    <div className={`bg-white rounded-lg shadow border p-4 ${className}`}>
      {children}
    </div>
  );
}
