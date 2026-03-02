"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Auth0Provider, useUser } from "@auth0/nextjs-auth0/client";
import "./globals.css";

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/meal-plan", label: "Meal Plan", icon: MealPlanIcon },
  { href: "/grocery-list", label: "Grocery", icon: GroceryIcon },
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
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
            </Link>
          );
        })}
      </div>
    </nav>
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
