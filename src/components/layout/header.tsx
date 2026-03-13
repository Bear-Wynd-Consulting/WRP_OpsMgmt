import { Database } from "lucide-react";
import Link from "next/link";
import { getAuthUser } from "@/services/auth";
import { logoutAction } from "@/app/login/actions";

export async function Header() {
  const user = await getAuthUser();

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          <span className="text-xl font-semibold">DataHarbor</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-medium hover:underline">
            Admin Panel
          </Link>

          {user ? (
              <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm font-medium opacity-80">
                      Welcome, {user.username}
                  </span>
                  <form action={logoutAction}>
                      <button type="submit" className="text-sm font-medium hover:underline bg-secondary/10 px-3 py-1.5 rounded-md">
                          Logout
                      </button>
                  </form>
              </div>
          ) : (
              <Link href="/login" className="text-sm font-medium hover:underline bg-secondary/10 px-3 py-1.5 rounded-md ml-4">
                  Login
              </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
