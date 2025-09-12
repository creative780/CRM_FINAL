import React from "react";

export function Input({ placeholder, type = "text", disabled = false, ...props }: any) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full p-3 text-sm rounded-lg border 
        ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:shadow-sm"} 
        border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 
        text-gray-800 placeholder-gray-400 transition-all duration-200`}
      {...props}
    />
  );
}
