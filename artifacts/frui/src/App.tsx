import React from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { ChevronLeft } from 'lucide-react';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import Onboarding from '@/pages/Onboarding';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import Shell from '@/components/layout/Shell';
import Home from '@/pages/Home';
import Landing from '@/pages/Landing';
import ToDo from '@/pages/ToDo';
import CreatePlan from '@/pages/CreatePlan';
import PlanDetail from '@/pages/PlanDetail';
import Account from '@/pages/Account';
import Settings from '@/pages/Settings';
import Help from '@/pages/Help';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#5A7D9A',
    colorBackground: '#363636',
    colorForeground: '#F1EFEA',
    colorMutedForeground: '#B8BEC4',
    colorDanger: '#F4B4B4',
    colorInput: '#2B2B2B',
    colorInputForeground: '#F1EFEA',
    colorNeutral: '#9C7A63',
    fontFamily: 'Figtree, sans-serif',
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#363636] rounded-2xl w-[400px] max-w-[90vw] overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#F1EFEA] font-serif',
    headerSubtitle: 'text-[#B8BEC4]',
    socialButtonsBlockButtonText: 'text-[#F1EFEA]',
    formFieldLabel: 'text-[#F1EFEA]',
    footerActionLink: 'text-[#A9C3D8] underline',
    footerActionText: 'text-[#B8BEC4]',
    dividerText: 'text-[#B8BEC4]',
    identityPreviewEditButton: 'text-[#A9C3D8]',
    formFieldSuccessText: 'text-[#A9C3D8]',
    alertText: 'text-[#F1EFEA]',
    logoBox: 'mx-auto',
    logoImage: 'h-12 w-12',
    socialButtonsBlockButton: 'bg-[#2B2B2B] hover:bg-[#2A2A2A] border-[#9C7A63]',
    formButtonPrimary: 'bg-[#3F5C77] hover:bg-[#2F465A] text-white',
    formFieldInput: 'bg-[#2B2B2B] border-[#9C7A63] text-[#F1EFEA]',
    footerAction: 'border-t border-[#9C7A63] pt-4',
    dividerLine: 'bg-[#9C7A63]',
    alert: 'bg-[#2F465A]/20 border border-[#2F465A]',
    otpCodeFieldInput: 'bg-[#2B2B2B] border-[#9C7A63] text-[#F1EFEA]',
    formFieldRow: '',
    main: '',
  },
};

function AuthBack() {
  return (
    <Link href="/" data-testid="link-auth-back" className="absolute left-3 top-3 flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-[#F1EFEA] hover:bg-[#363636]">
      <ChevronLeft className="h-5 w-5" /> Back to Frui
    </Link>
  );
}

function SignInPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#2B2B2B] px-4 pt-14">
      <AuthBack />
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#2B2B2B] px-4 pt-14">
      <AuthBack />
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/onboarding`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = React.useRef<string | null | undefined>(undefined);

  React.useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Shell>
          <Home />
        </Shell>
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Shell>
          <Component />
        </Shell>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function UserScope({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  return <OnboardingProvider key={user?.id ?? 'anon'}>{children}</OnboardingProvider>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <UserScope>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
            <Route path="/todo" component={() => <ProtectedRoute component={ToDo} />} />
            <Route path="/create-plan" component={() => <ProtectedRoute component={CreatePlan} />} />
            <Route path="/plan/:id" component={() => <ProtectedRoute component={PlanDetail} />} />
            <Route path="/account" component={() => <ProtectedRoute component={Account} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
            <Route path="/help" component={() => <ProtectedRoute component={Help} />} />
            
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
        </UserScope>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;