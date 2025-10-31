import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { ThemeProvider } from "./context/ThemeContext";

// We don't need the bootstrap CSS import as you're using custom styles
// import "bootstrap/dist/css/bootstrap.min.css"; 

// --- Import Layouts and Pages ---
import Homepage from "./routes/homepage/Homepage";
import DashboardPage from "./routes/dashboardPage/DashboardPage";
import ChatPage from "./routes/chatPage/chatPage";
import RootLayout from "./layouts/rootLayout/RootLayout";
import DashboardLayout from "./layouts/dashboardLayout/DashboardLayout";
import SignInPage from "./routes/signInPage/SignInPage";
import SignUpPage from "./routes/signUpPage/SignUpPage";
// --- 1. IMPORT THE NEW STUDY NOTES PAGE ---

// Get the Publishable Key from your environment variables
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key from .env file");
}

// --- Define the application routes ---
const router = createBrowserRouter([
  // Group 1: Protected Dashboard Routes
  {
    path: "/dashboard",
    element: (
      <>
        {/* Clerk's SignedIn component will render children only if the user is authenticated */}
        <SignedIn>
          <DashboardLayout />
        </SignedIn>
        {/* Clerk's SignedOut component will redirect to the sign-in page if the user is not authenticated */}
        <SignedOut>
          <Navigate to="/sign-in" replace />
        </SignedOut>
      </>
    ),
    children: [
      {
        path: "", // Default route for /dashboard
        element: <DashboardPage />,
      },
      {
        path: "chats/:id", // Route for individual chats, e.g., /dashboard/chats/my-first-chat
        element: <ChatPage />,
      },
    ],
  },
  // Group 2: Public Routes (Homepage, Sign-in, Sign-up)
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Homepage />,
      },
      {
        path: "/sign-in/*",
        element: <SignInPage />,
      },
      {
        path: "/sign-up/*",
        element: <SignUpPage />,
      },
    ],
  },
]);

// Render the application
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <RouterProvider router={router} />
      </ClerkProvider>
    </ThemeProvider>
  </React.StrictMode>
);
