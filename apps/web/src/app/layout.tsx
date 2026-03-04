"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Auth0Provider, useUser } from "@auth0/nextjs-auth0/client";
import { useState } from "react";
import "./globals.css";

// Desktop sidebar items with sections
const desktopNavSections = [
  {
    title: "Planning",
    items: [
      { href: "/meal-plan", label: "Meal Plan", icon: MealPlanIcon },
      { href: "/recurring-meals", label: "Recurring", icon: RecurringIcon },
    ],
  },
  {
    title: "Shopping",
    items: [
      { href: "/grocery-list", label: "Grocery", icon: GroceryIcon },
      { href: "/products", label: "Products", icon: ProductsIcon },
      { href: "/inventory", label: "Inventory", icon: InventoryIcon },
    ],
  },
  {
    title: "Me",
    items: [
      { href: "/preferences", label: "Preferences", icon: PreferencesIcon },
      { href: "/history", label: "History", icon: HistoryIcon },
      { href: "/quick-suggestions", label: "Quick Cook", icon: QuickCookIcon },
    ],
  },
] as const;

// Mobile bottom nav (5 items)
const mobileNavItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/meal-plan", label: "Meal Plan", icon: MealPlanIcon },
  { href: "/grocery-list", label: "Grocery", icon: GroceryIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "__more__", label: "More", icon: MoreIcon },
] as const;

// Mobile "More" menu items
const moreMenuItems = [
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/preferences", label: "Preferences", icon: PreferencesIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/quick-suggestions", label: "Quick Cook", icon: QuickCookIcon },
  { href: "/recurring-meals", label: "Recurring", icon: RecurringIcon },
] as const;

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function InventoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function MealPlanIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function GroceryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PreferencesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function QuickCookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function RecurringIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function ProductsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function DesktopSidebar() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 lg:border-r lg:border-gray-200 lg:bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-6">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Meal Planner
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {desktopNavSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </h3>
            {section.items.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-l-4 border-blue-600 bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-200 px-3 py-4">
        {!isLoading &&
          (user ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.name ?? user.email}
                </p>
              </div>
              <a
                href="/api/auth/logout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Log out
              </a>
            </div>
          ) : (
            <a
              href="/api/auth/login"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Log in
            </a>
          ))}
      </div>
    </aside>
  );
}

function Header() {
  const { user, isLoading } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white lg:hidden">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Meal Planner
        </Link>
        <div>
          {isLoading ? null : user ? (
            <a
              href="/api/auth/logout"
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Log out
            </a>
          ) : (
            <a
              href="/api/auth/login"
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-around">
          {mobileNavItems.map(({ href, label, icon: Icon }) => {
            if (href === "__more__") {
              return (
                <button
                  key={href}
                  onClick={() => setShowMore(true)}
                  className="flex min-h-[56px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </button>
              );
            }
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[56px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span>{label}</span>
                {isActive && (
                  <div className="mt-0.5 h-1 w-8 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {showMore && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
              <h2 className="text-lg font-semibold text-gray-900">More</h2>
              <button
                onClick={() => setShowMore(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-2 py-2">
              {moreMenuItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Meal Planner</title>
        <meta
          name="description"
          content="AI-powered meal planning with inventory tracking"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover"
        />
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
      </head>
      <body className="min-w-[375px] bg-gray-50">
        <Auth0Provider>
          <DesktopSidebar />
          <div className="lg:pl-64">
            <Header />
            <div className="pb-20 lg:pb-0">{children}</div>
            <BottomNav />
          </div>
        </Auth0Provider>
      </body>
    </html>
  );
}
