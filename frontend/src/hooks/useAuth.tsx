"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, User } from "@/lib/api";
import { useRouter } from "next/navigation";

type AuthCtx = {
  user: User | null | undefined;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email:string,password:string)=>Promise<void>;
  logout: ()=>Promise<void>;
  fetchMe: ()=>Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true, isLoading: true, isAuthenticated: false, login: async ()=>{}, logout: async ()=>{}, fetchMe: async ()=>{} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User|null|undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data as User);
    } catch { setUser(null); } finally { setLoading(false); }
  };

  useEffect(()=>{ fetchMe(); }, []);

  const login = async (email:string,password:string) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.data.user as User);
    await fetchMe();
    const role = (res.data.data.user as User).role;
    if (role === 'coach') router.push("/coach/tournaments");
    else router.push("/student/tournaments");
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    router.push("/login");
  };

  return <Ctx.Provider value={{ user, loading, isLoading: loading, isAuthenticated: !!user, login, logout, fetchMe }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
