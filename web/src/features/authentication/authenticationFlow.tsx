import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import type { RegistrationChallenge, SocialProvider } from './authenticationApi';

function useFlowState(returnPath: string, confirmSession: (path: string, signal: AbortSignal) => Promise<void>) {
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(false);
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);
  const [purpose, setPurpose] = useState<'registration' | 'login'>('registration');
  const [verified, setVerified] = useState(false);
  const [offered, setOffered] = useState(false);
  const [provider, setProvider] = useState<SocialProvider | null>(null);
  const [destination, setReturnPath] = useState(returnPath);
  return { email, setEmail, remember, setRemember, challenge, setChallenge, purpose, setPurpose,
    verified, setVerified, offered, setOffered, provider, setProvider, returnPath: destination, setReturnPath, confirmSession };
}
const FlowContext = createContext<ReturnType<typeof useFlowState> | null>(null);

// One route-local, bounded form flow; never an actor owner or credential store.
// The enclosing identityScope key destroys it on actor/mode change or error.
export function AuthenticationFlowProvider({ children, returnPath, confirmSession }: PropsWithChildren<{
  returnPath: string; confirmSession: (path: string, signal: AbortSignal) => Promise<void>
}>) {
  const value = useFlowState(returnPath, confirmSession);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthenticationFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error('Authentication form context is unavailable.');
  return value;
}
