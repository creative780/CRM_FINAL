import React from "react";

export function Button({ children, variant = "default", className = "", ...props }: any) {
  const baseStyle = "px-4 py-2 rounded text-sm font-medium";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
