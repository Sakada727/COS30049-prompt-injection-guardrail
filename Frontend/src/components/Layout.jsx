import { MotionConfig } from "motion/react";
import { Outlet } from "react-router-dom";
import Footer from "./Footer.jsx";
import Header from "./Header.jsx";

export default function Layout() {
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="app">
        <Header />
        <Outlet />
        <Footer />
      </div>
    </MotionConfig>
  );
}
