import React from 'react';
import { Link } from 'wouter';

export default function Landing() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#2D2D2D] px-6 py-12 text-center text-light-text md:h-[90vh] md:max-h-[900px] md:max-w-[430px] md:mx-auto md:my-auto md:rounded-[40px] md:border-8 md:border-[#1a1a1a] shadow-2xl relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[40%] rounded-full bg-terracotta blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[50%] rounded-full bg-ochre blur-[120px]" />
      </div>

      <div className="z-10 flex flex-1 flex-col items-center justify-center w-full max-w-sm gap-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-charcoal shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-[#3A3A3A]">
            <span className="font-serif text-5xl font-bold text-terracotta">F</span>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-4xl font-bold tracking-wide">FRUI</h1>
            <p className="text-lg text-muted-text max-w-[260px] mx-auto">
              Train like a hybrid athlete.
            </p>
          </div>
        </div>
      </div>

      <div className="z-10 flex w-full max-w-sm flex-col gap-4 mt-auto">
        <Link 
          href="/sign-up"
          className="flex h-14 w-full items-center justify-center rounded-xl bg-terracotta text-lg font-medium text-white transition-colors hover:bg-rust active:scale-[0.98]"
        >
          Get started
        </Link>
        <Link 
          href="/sign-in"
          className="flex h-14 w-full items-center justify-center rounded-xl border-2 border-[#3A3A3A] bg-transparent text-lg font-medium text-light-text transition-colors hover:border-camel hover:text-camel active:scale-[0.98]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}