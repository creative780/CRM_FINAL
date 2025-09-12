"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";

type UserRole = "admin" | "sales";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  isAdmin: boolean;
  isSales: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>({
    id: "1",
    name: "John Doe",
    email: "john@company.com",
    role: "admin", // Change to 'sales' to test sales role
    avatar: "/placeholder.svg?height=32&width=32",
  });

  const isAdmin = user.role === "admin";
  const isSales = user.role === "sales";

  return (
    <UserContext.Provider value={{ user, setUser, isAdmin, isSales }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
