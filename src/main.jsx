import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { ThemeProvider } from "./context/ThemeContext"; // Import ThemeProvider

// Import your layouts and pages
import Homepage from "./routes/homepage/Homepage";
import DashboardPage from "./routes/dashboardPage/DashboardPage";
import ChatPage from "./routes/chatPage/chatPage";
import RootLayout from "./layouts/rootLayout/RootLayout";
import DashboardLayout from "./layouts/dashboardLayout/DashboardLayout";
import SignInPage from "./routes/signInPage/SignInPage";
import SignUpPage from "./routes/signUpPage/SignUpPage";

// Get the Publishable Key from your environment variables
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const router = createBrowserRouter([
  // Group 1: Dashboard Routes (Now Protected)
  {
    path: "/dashboard",
    element: (
      <>
        {/* If the user is signed in, render the DashboardLayout. */}
        <SignedIn>
          <DashboardLayout />
        </SignedIn>
        {/* If the user is signed out, redirect them to the sign-in page. */}
        <SignedOut>
          <Navigate to="/sign-in" replace />
        </SignedOut>
      </>
    ),
    children: [
      {
        path: "", // Index route, resolves to "/dashboard"
        element: <DashboardPage />,
      },
      {
        path: "chats/:id", // Resolves to "/dashboard/chats/:id"
        element: <ChatPage />,
      },
    ],
  },
  // Group 2: Public Routes
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Homepage />,
      },
      {
        path: "/sign-in/*", // Use a wildcard to let Clerk handle fallback routes
        element: <SignInPage />,
      },
      {
        path: "/sign-up/*", // Use a wildcard to let Clerk handle fallback routes
        element: <SignUpPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Wrap the ClerkProvider with ThemeProvider */}
    <ThemeProvider>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <RouterProvider router={router} />
      </ClerkProvider>
    </ThemeProvider>
  </React.StrictMode>
);