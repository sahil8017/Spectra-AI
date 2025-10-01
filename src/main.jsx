import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Homepage from "./routes/homepage/Homepage";
import DashboardPage from "./routes/dashboardPage/DashboardPage";
import ChatPage from "./routes/chatPage/chatPage";
import RootLayout from "./layouts/rootLayout/RootLayout";
import DashboardLayout from "./layouts/dashboardLayout/DashboardLayout";
import SignInPage from "./routes/signInPage/SignInPage";
import SignUpPage from "./routes/signUpPage/SignUpPage";

const router = createBrowserRouter([
  // Group 1: Dashboard Routes (Protected)
  {
    element: <DashboardLayout />, // This is now a top-level layout
    path: "dashboard", // Base path for all routes inside
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
    element: <RootLayout />, // This is the layout for public pages
    children: [
      {
        path: "/",
        element: <Homepage />,
      },
      {
        path: "/sign-in",
        element: <SignInPage />,
      },
      {
        path: "/sign-up",
        element: <SignUpPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);