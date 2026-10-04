import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import AdminRoute from "./components/layout/AdminRoute";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AuthProvider from "./context/AuthContext";
import ToastProvider from "./context/ToastContext";
import Home from "./pages/jsx_files/Home";
import Courses from "./pages/jsx_files/Courses";
import CourseDetail from "./pages/jsx_files/CourseDetail";
import Login from "./pages/jsx_files/Login";
import Register from "./pages/jsx_files/Register";
import ForgotPassword from "./pages/jsx_files/ForgotPassword";
import ResetPassword from "./pages/jsx_files/ResetPassword";
import Dashboard from "./pages/jsx_files/Dashboard";
import MyCourses from "./pages/jsx_files/MyCourses";
import TrackYourGoals from "./pages/jsx_files/TrackYourGoals";
import Profile from "./pages/jsx_files/Profile";
import AdminOverview from "./pages/jsx_files/AdminOverview";
import AdminCourses from "./pages/jsx_files/AdminCourses";
import AdminUsers from "./pages/jsx_files/AdminUsers";
import AdminCourseEditor from "./pages/jsx_files/AdminCourseEditor";
import NotFound from "./pages/jsx_files/NotFound";
import "./polish.css";

function App() {
  // First visit follows the system setting; after the visitor chooses, their choice wins.
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("trackly-theme");

    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const isRevealing = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#171615" : "#faf8f5");
  }, [theme]);

  // The new theme grows as a circle from the switch (View Transitions API). Browsers without it, and people who
  // prefer reduced motion, just get the quick colour fade. The switch is ignored while a reveal is running.
  function toggleTheme(origin) {
    if (isRevealing.current) return;

    const next = theme === "light" ? "dark" : "light";

    localStorage.setItem("trackly-theme", next);

    const apply = () => {
      document.documentElement.setAttribute("data-theme", next);
      flushSync(() => setTheme(next));
    };

    const canReveal =
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canReveal) {
      apply();
      return;
    }

    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? 0;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    isRevealing.current = true;

    try {
      const transition = document.startViewTransition(apply);

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 650,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {});

      transition.finished.finally(() => {
        isRevealing.current = false;
      });
    } catch {
      isRevealing.current = false;
      apply();
    }
  }

  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route
            element={<AppLayout theme={theme} onToggleTheme={toggleTheme} />}
          >
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/goals" element={<TrackYourGoals />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/courses/new" element={<AdminCourseEditor />} />
              <Route path="/admin/courses/:id/edit" element={<AdminCourseEditor />} />
            </Route>


            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
