/**
 * LiveLock — "Clinical Trust" Design System
 * App root: routing, theme, and global providers
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LiveLockProvider } from "./contexts/LiveLockContext";
import Home from "./pages/Home";
import Demo from "./pages/Demo";
import Threats from "./pages/Threats";
import Incidents from "./pages/Incidents";
import HowItWorks from "./pages/HowItWorks";
import EarlyAccess from "./pages/EarlyAccess";
import Admin from "./pages/Admin";
import Register from "./pages/Register";
import Login from "./pages/Login";
import JoinTeam from "./pages/JoinTeam";
import AppLayout from "./components/AppLayout";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import Dashboard from "./pages/app/Dashboard";
import Verify from "./pages/app/Verify";
import Team from "./pages/app/Team";
import AuditLog from "./pages/app/AuditLog";
import Settings from "./pages/app/Settings";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/demo"} component={Demo} />
      <Route path={"/threats"} component={Threats} />
      <Route path={"/incidents"} component={Incidents} />
      <Route path={"/how-it-works"} component={HowItWorks} />
      <Route path={"/early-access"} component={EarlyAccess} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/register"} component={Register} />
      <Route path={"/login"} component={Login} />
      <Route path={"/join"} component={JoinTeam} />
      <Route path={"/app/dashboard"}>
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path={"/app/verify"}>
        <AppLayout><Verify /></AppLayout>
      </Route>
      <Route path={"/app/team"}>
        <AppLayout><Team /></AppLayout>
      </Route>
      <Route path={"/app/audit"}>
        <AppLayout><AuditLog /></AppLayout>
      </Route>
      <Route path={"/app/settings"}>
        <AppLayout><Settings /></AppLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LiveLockProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <PwaInstallPrompt />
          </TooltipProvider>
        </LiveLockProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
