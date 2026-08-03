import React from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
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
    colorPrimary: '#C4622D',
    colorBackground: '#3A3A3A',
    colorForeground: '#F5F0E8',
    colorMutedForeground: '#A89B8C',
    colorDanger: '#ef4444',
    colorInput: '#2D2D2D',
    colorInputForeground: '#F5F0E8',
    colorNeutral: '#8B6344',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#3A3A3A] rounded-2xl w-[400px] max-w-[90vw] overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#F5F0E8] font-serif',
    headerSubtitle: 'text-[#A89B8C]',
    socialButtonsBlockButtonText: 'text-[#F5F0E8]',
    formFieldLabel: 'text-[#F5F0E8]',
    footerActionLink: 'text-[#C4622D]',
    footerActionText: 'text-[#A89B8C]',
    dividerText: 'text-[#A89B8C]',
    identityPreviewEditButton: 'text-[#C4622D]',
    formFieldSuccessText: 'text-[#C89B7B]',
    alertText: 'text-[#F5F0E8]',
    logoBox: 'mx-auto',
    logoImage: 'h-12 w-12',
    socialButtonsBlockButton: 'bg-[#2D2D2D] hover:bg-[#2A2A2A] border-[#8B6344]',
    formButtonPrimary: 'bg-[#C4622D] hover:bg-[#9B4C2B] text-white',
    formFieldInput: 'bg-[#2D2D2D] border-[#8B6344] text-[#F5F0E8]',
    footerAction: 'border-t border-[#8B6344] pt-4',
    dividerLine: 'bg-[#8B6344]',
    alert: 'bg-[#9B4C2B]/20 border border-[#9B4C2B]',
    otpCodeFieldInput: 'bg-[#2D2D2D] border-[#8B6344] text-[#F5F0E8]',
    formFieldRow: '',
    main: '',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#2D2D2D] px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#2D2D2D] px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
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
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
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