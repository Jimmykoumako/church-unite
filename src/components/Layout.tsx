import  { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { Menu } from "lucide-react";
import {Toaster} from "sonner";
import ThemeTogglebutton from "@/components/ui/theme-togggle.tsx";

function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/members', label: 'Members' },
    { path: '/prayers', label: 'Prayer Requests' },
  ];

  const NavLinks = () => (
    <>
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
          onClick={() => setOpen(false)}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navigation */}
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900">
                ChurchUnite
              </Link>
              <div className="hidden md:flex md:items-center md:ml-6 space-x-4">
                <NavLinks />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => signOut()}
                className="hidden md:inline-flex"
              >
                Sign Out
              </Button>

              {/* Mobile menu button */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col mt-6 space-y-4">
                    <NavLinks />
                    <ThemeTogglebutton />
                    <Button
                      variant="outline"
                      onClick={() => {
                        signOut();
                        setOpen(false);
                      }}
                    >
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Toaster/>
    </div>
  );
}

export default Layout;
