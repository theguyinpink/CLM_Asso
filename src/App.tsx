import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";

import BackToTopButton from "./components/BackToTopButton";
import ScrollToTop from "./components/ScrollToTop";
import AppLayout from "./components/app/AppLayout";
import ToastViewport from "./components/app/shared/ToastViewport";
import AppLoadingScreen from "./components/auth/AppLoadingScreen";
import RequireActiveSubscription from "./components/auth/RequireActiveSubscription";
import RequireAuth from "./components/auth/RequireAuth";
import RequireClub from "./components/auth/RequireClub";
import RequireCompleteProfile from "./components/auth/RequireCompleteProfile";
import { useClub } from "./hooks/useClub";
import { usePermissions } from "./hooks/usePermissions";
import AuthProvider from "./providers/AuthProvider";
import ClubProvider from "./providers/ClubProvider";
import ProfileProvider from "./providers/ProfileProvider";
import ToastProvider from "./providers/ToastProvider";
import { subscriptionAllowsAppAccess } from "./types/billing";

const HomePage = lazy(() => import("./pages/HomePage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const AudiencePage = lazy(() => import("./pages/AudiencePage"));
const BenefitsPage = lazy(() => import("./pages/BenefitsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const InterestPage = lazy(() => import("./pages/InterestPage"));

const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const CreateClubPage = lazy(() => import("./pages/auth/CreateClubPage"));
const CompleteProfilePage = lazy(
  () => import("./pages/auth/CompleteProfilePage"),
);
const ForgotPasswordPage = lazy(
  () => import("./pages/auth/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("./pages/auth/ResetPasswordPage"),
);
const AcceptInvitationPage = lazy(
  () => import("./pages/auth/AcceptInvitationPage"),
);

const AppPlaceholderPage = lazy(
  () => import("./pages/app/AppPlaceholderPage"),
);
const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));
const SubscriptionPage = lazy(
  () => import("./pages/app/SubscriptionPage"),
);
const MessagingPage = lazy(() => import("./pages/app/MessagingPage"));
const TeamsPage = lazy(() => import("./pages/app/TeamsPage"));
const TeamDetailsPage = lazy(() => import("./pages/app/TeamDetailsPage"));
const CalendarPage = lazy(() => import("./pages/app/CalendarPage"));
const MatchesPage = lazy(() => import("./pages/app/MatchesPage"));
const MatchDetailsPage = lazy(
  () => import("./pages/app/MatchDetailsPage"),
);
const ConvocationsPage = lazy(
  () => import("./pages/app/ConvocationsPage"),
);
const AnnouncementsPage = lazy(
  () => import("./pages/app/AnnouncementsPage"),
);
const TasksPage = lazy(() => import("./pages/app/TasksPage"));
const MembersPage = lazy(() => import("./pages/app/MembersPage"));
const DocumentsPage = lazy(() => import("./pages/app/DocumentsPage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));

interface RequireSectionAccessProps {
  section: "tasks" | "documents" | "messaging";
  children: ReactNode;
}

function RequireSectionAccess({
  section,
  children,
}: RequireSectionAccessProps) {
  const { canAccessTasks, canAccessDocuments, canAccessMessaging } =
    usePermissions();

  const canAccess =
    section === "tasks"
      ? canAccessTasks
      : section === "documents"
        ? canAccessDocuments
        : canAccessMessaging;

  if (!canAccess) {
    return <Navigate to="/app/tableau-de-bord" replace />;
  }

  return children;
}

function AppIndexRedirect() {
  const { activeSubscription, subscriptionLoading } = useClub();

  if (subscriptionLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <Navigate
      to={
        subscriptionAllowsAppAccess(activeSubscription?.status)
          ? "/app/tableau-de-bord"
          : "/app/abonnement"
      }
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/fonctionnalites" element={<FeaturesPage />} />
        <Route path="/pour-qui" element={<AudiencePage />} />
        <Route path="/avantages" element={<BenefitsPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/tarifs" element={<PricingPage />} />
        <Route path="/manifester-mon-interet" element={<InterestPage />} />

        <Route path="/connexion" element={<AuthPage mode="login" />} />
        <Route path="/inscription" element={<AuthPage mode="register" />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="/nouveau-mot-de-passe" element={<ResetPasswordPage />} />
        <Route path="/invitation" element={<AcceptInvitationPage />} />

        <Route
          path="/completer-profil"
          element={
            <RequireAuth>
              <CompleteProfilePage />
            </RequireAuth>
          }
        />

        <Route
          path="/creer-mon-club"
          element={
            <RequireAuth>
              <RequireCompleteProfile>
                <CreateClubPage />
              </RequireCompleteProfile>
            </RequireAuth>
          }
        />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <RequireCompleteProfile>
                <RequireClub>
                  <AppLayout />
                </RequireClub>
              </RequireCompleteProfile>
            </RequireAuth>
          }
        >
          <Route index element={<AppIndexRedirect />} />
          <Route path="abonnement" element={<SubscriptionPage />} />

          <Route element={<RequireActiveSubscription />}>
            <Route path="tableau-de-bord" element={<DashboardPage />} />
            <Route
              path="messagerie"
              element={
                <RequireSectionAccess section="messaging">
                  <MessagingPage />
                </RequireSectionAccess>
              }
            />
            <Route path="equipes" element={<TeamsPage />} />
            <Route path="equipes/:teamId" element={<TeamDetailsPage />} />
            <Route path="calendrier" element={<CalendarPage />} />
            <Route path="matchs" element={<MatchesPage />} />
            <Route path="matchs/:matchId" element={<MatchDetailsPage />} />
            <Route path="convocations" element={<ConvocationsPage />} />
            <Route path="annonces" element={<AnnouncementsPage />} />
            <Route
              path="taches"
              element={
                <RequireSectionAccess section="tasks">
                  <TasksPage />
                </RequireSectionAccess>
              }
            />
            <Route path="membres" element={<MembersPage />} />
            <Route
              path="documents"
              element={
                <RequireSectionAccess section="documents">
                  <DocumentsPage />
                </RequireSectionAccess>
              }
            />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<AppPlaceholderPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProfileProvider>
          <ClubProvider>
            <ScrollToTop />
            <AppRoutes />
            <BackToTopButton />
          </ClubProvider>
        </ProfileProvider>
      </AuthProvider>
      <ToastViewport />
    </ToastProvider>
  );
}

export default App;
