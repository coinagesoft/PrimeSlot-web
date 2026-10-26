'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import Sidebar from '../Sidebar/page';
import Navbar from '../Navbar/page';

const HTML_CLASSES = ['light-style', 'layout-navbar-fixed', 'layout-menu-fixed', 'layout-compact'];

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const [popperReady, setPopperReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);

  // classes the theme CSS expects on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(...HTML_CLASSES);
    return () => root.classList.remove(...HTML_CLASSES, 'layout-menu-collapsed', 'layout-menu-expanded');
  }, []);

  // React state -> theme classes
  useEffect(() => {
    document.documentElement.classList.toggle('layout-menu-collapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.documentElement.classList.toggle('layout-menu-expanded', mobileSidebarVisible);
  }, [mobileSidebarVisible]);

  // navbar hamburger + dark overlay (the sidebar arrow handles itself)
  useEffect(() => {
    const onClick = (e) => {
      const toggle = e.target.closest?.('.layout-menu-toggle');
      if (!toggle || toggle.closest('#layout-menu')) return;
      e.preventDefault();
      setMobileSidebarVisible((v) => !v);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // close the mobile drawer after navigating
  useEffect(() => {
    setMobileSidebarVisible(false);
  }, [pathname]);

  return (
    <>
      {/* keep the theme arrow visible when collapsed (>> via the "collapsed" class) */}


      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <Sidebar
            mobileSidebarVisible={mobileSidebarVisible}
            setMobileSidebarVisible={setMobileSidebarVisible}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />

          <div className="layout-page">
            <Navbar />

            <div className="content-wrapper">
              {children}

              <footer className="content-footer footer bg-footer-theme">
                <div className="container-xxl">
                  <div className="footer-container d-flex align-items-center justify-content-between py-4">
                    <div className="mb-2 mb-md-0">© {new Date().getFullYear()} PrimeSlot</div>
                  </div>
                </div>
              </footer>
              <div className="content-backdrop fade"></div>
            </div>
          </div>
        </div>

        <div className="layout-overlay layout-menu-toggle"></div>
      </div>

      <Script src="/assets/vendor/libs/popper/popper.js" strategy="afterInteractive" onLoad={() => setPopperReady(true)} />
      {popperReady && <Script src="/assets/vendor/js/bootstrap.js" strategy="afterInteractive" />}
    </>
  );
}