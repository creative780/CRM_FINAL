import React from "react";

export function Textarea({ placeholder, ...props }: any) {
  return (
    <textarea
      placeholder={placeholder}
      className={`w-full p-3 text-sm rounded-lg border 
        border-gray-300 bg-white hover:shadow-sm 
        focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 h-28 resize-none`}
      {...props}
    />
  );
}
