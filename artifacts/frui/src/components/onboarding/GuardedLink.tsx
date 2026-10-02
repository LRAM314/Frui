import React from 'react';
import { Link } from 'wouter';
import { useOnboarding } from './OnboardingProvider';

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; 'data-testid'?: string };

export default function GuardedLink({ href, onClick, children, ...rest }: Props) {
  const ob = useOnboarding();
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
          e.preventDefault();
          ob.navigate(href);
        }
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
