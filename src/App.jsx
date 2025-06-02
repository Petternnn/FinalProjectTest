// src/App.jsx
import { Outlet } from 'react-router-dom';
// If you had a global Navbar or Footer, you'd import and use them here.

// Component: App
// Description: Main application layout component. Renders child routes via Outlet.
export default function App() {
  console.log('[App] Rendering main application layout with Outlet.');
  return (
    <>
      {/* Example: <GlobalNavbar /> */}
      <Outlet /> {/* Child routes defined in the router will render here */}
      {/* Example: <GlobalFooter /> */}
    </>
  );
}
