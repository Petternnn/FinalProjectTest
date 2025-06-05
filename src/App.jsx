// src/App.jsx
import { Outlet } from 'react-router-dom';
// move side bar here later rather than in the routes

// Component: App
// Description: Main application layout component. Renders child routes via Outlet.
export default function App() {
  console.log('[App] Rendering main application layout with Outlet.');
  return (
    <>
      {/* <GlobalNavbar /> */}
      <Outlet /> {/* Child routes defined in the router will render here */}
      {/*  <GlobalFooter /> */}
    </>
  );
}
