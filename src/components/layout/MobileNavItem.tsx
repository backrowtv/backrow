"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IconProps } from "@phosphor-icons/react";

interface MobileNavItemProps {
  icon: React.ComponentType<IconProps>;
  label: string;
  href: string;
}

export function MobileNavItem({ icon: Icon, label, href }: MobileNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 h-full px-2",
        "transition-all duration-200 ease-in-out",
        "group",
        isActive
          ? "text-[var(--primary)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      )}
    >
      {/* Active indicator - top border (mobile nav style) */}
      {isActive && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--primary)] transition-all duration-200" />
      )}
      <Icon
        className={cn(
          "h-5 w-5 transition-transform duration-200",
          isActive && "scale-110",
          "group-hover:scale-110"
        )}
      />
      <span
        className={cn(
          "text-xs font-medium whitespace-nowrap transition-all duration-200",
          isActive && "font-semibold"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
