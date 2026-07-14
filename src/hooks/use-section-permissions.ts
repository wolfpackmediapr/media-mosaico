import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type SectionKey =
  | "inicio"
  | "publiteca"
  | "tv"
  | "radio"
  | "prensa"
  | "prensa-escrita"
  | "redes-sociales"
  | "notificaciones"
  | "envio-alertas"
  | "reportes";

export const ALL_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "inicio", label: "Inicio" },
  { key: "publiteca", label: "Publiteca" },
  { key: "tv", label: "TV" },
  { key: "radio", label: "Radio" },
  { key: "prensa", label: "Prensa Digital" },
  { key: "prensa-escrita", label: "Prensa Escrita" },
  { key: "redes-sociales", label: "Redes Sociales" },
  { key: "notificaciones", label: "Notificaciones" },
  { key: "envio-alertas", label: "Alertas Enviadas" },
  { key: "reportes", label: "Reportes" },
];

export function useSectionPermissions() {
  const { user, isLoading: authLoading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [sections, setSections] = useState<Set<SectionKey>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        if (!authLoading) {
          setRole(null);
          setSections(new Set());
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const userRole = profile?.role ?? null;
      setRole(userRole);

      if (userRole === "administrator") {
        setSections(new Set(ALL_SECTIONS.map((s) => s.key)));
        setIsLoading(false);
        return;
      }

      const { data: perms } = await supabase
        .from("user_section_permissions")
        .select("section")
        .eq("user_id", user.id);
      if (cancelled) return;
      setSections(new Set((perms ?? []).map((p) => p.section as SectionKey)));
      setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const canAccess = (section?: SectionKey) => {
    if (!section) return true;
    if (role === "administrator") return true;
    // Inicio is always available for signed-in users
    if (section === "inicio") return true;
    return sections.has(section);
  };

  const canAccessAll = (keys?: SectionKey[]) => {
    if (!keys || keys.length === 0) return true;
    if (role === "administrator") return true;
    return keys.every((k) => canAccess(k));
  };

  const canAccessAny = (keys?: SectionKey[]) => {
    if (!keys || keys.length === 0) return true;
    if (role === "administrator") return true;
    return keys.some((k) => canAccess(k));
  };

  return {
    role,
    sections,
    canAccess,
    canAccessAll,
    canAccessAny,
    isLoading: isLoading || authLoading,
  };
}