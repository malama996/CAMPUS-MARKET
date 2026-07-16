"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, PlusCircle, User } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const withRedirect = (path) => `/login?redirect=${encodeURIComponent(path)}`;

  const profileHref = user ? `/profile/${user.id}` : withRedirect("/profile");
  const sellHref = user ? "/listing/new" : withRedirect("/listing/new");
  const chatHref = user ? "/chat" : withRedirect("/chat");

  const NAV_ITEMS = [
    { href: "/", label: "Home", icon: Home },
    { href: chatHref, label: "Chat", icon: MessageCircle },
    { href: sellHref, label: "Sell", icon: PlusCircle, isAction: true },
    { href: profileHref, label: "Profile", icon: User },
  ];

  const isActive = (href, label) => {
    if (href === "/login") return false; // avoid lighting up multiple tabs when logged out
    if (href === "/") return pathname === "/";
    if (label === "Profile") return pathname?.startsWith("/profile");
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        border-t border-border/50
        glass-panel bg-background/80 backdrop-blur-md
        sm:hidden
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isAction }) => {
          const active = isActive(href, label);

          if (isAction) {
            return (
              <li key={label} className="flex flex-1 items-center justify-center">
                <button
                  type="button"
                  onClick={() => router.push(href)}
                  aria-label={label}
                  className="
                    -mt-5 flex h-12 w-12 items-center justify-center
                    rounded-full bg-primary text-primary-foreground
                    shadow-lg shadow-primary/30
                    active:scale-95 transition-transform
                  "
                >
                  <Icon className="h-6 w-6" strokeWidth={2.25} />
                </button>
              </li>
            );
          }

          return (
            <li key={label} className="flex-1">
              <button
                type="button"
                onClick={() => router.push(href)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`
                  flex w-full flex-col items-center justify-center gap-1
                  py-2 text-[11px] font-medium transition-colors
                  ${active ? "text-primary" : "text-muted-foreground"}
                `}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.5 : 2}
                  fill={active ? "currentColor" : "none"}
                />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}