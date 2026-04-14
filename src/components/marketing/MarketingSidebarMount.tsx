"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Question,
  Envelope,
  Bug,
  Newspaper,
  ShieldCheck,
  FileText,
  Handshake,
} from "@phosphor-icons/react";
import { useSecondarySidebarSafe } from "@/components/layout/SecondarySidebarContext";
import type { SecondarySidebarItem } from "@/components/layout/SecondarySidebar";

/**
 * Mounts the Letterboxd-style marketing sidebar.
 *
 * This component renders nothing — it just pushes sidebar items into
 * SecondarySidebarContext so the desktop SecondarySidebar and the mobile
 * floating-nav submenu both pick them up.
 *
 * Mount it on every page that should show the marketing sidebar.
 */
export function MarketingSidebarMount() {
  const ctx = useSecondarySidebarSafe();
  const lastSetRef = useRef(false);

  const items = useMemo((): SecondarySidebarItem[] => {
    return [
      {
        label: "FAQ",
        href: "/faq",
        icon: <Question className="h-4 w-4" />,
      },
      {
        label: "Contact",
        href: "/contact",
        icon: <Envelope className="h-4 w-4" />,
      },
      {
        label: "Feedback",
        href: "/feedback",
        icon: <Bug className="h-4 w-4" />,
      },
      {
        label: "Blog",
        href: "/blog",
        icon: <Newspaper className="h-4 w-4" />,
      },
      {
        label: "Privacy Policy",
        href: "/privacy-policy",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        label: "Terms of Use",
        href: "/terms-of-use",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: "User Agreement",
        href: "/user-agreement",
        icon: <Handshake className="h-4 w-4" />,
      },
    ];
  }, []);

  useEffect(() => {
    if (!ctx) return;
    if (lastSetRef.current) return;
    lastSetRef.current = true;
    ctx.setItems(items);
    ctx.setParentBreadcrumb(undefined);
  }, [ctx, items]);

  return null;
}
