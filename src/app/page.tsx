import Image from "next/image";
import { Wordmark } from "@/components/ui";
import { SignInButtons } from "./sign-in-buttons";

export default function Welcome() {
  return (
    <main className="relative min-h-dvh flex flex-col md:grid md:grid-cols-[1.1fr_1fr]">
      {/* Phones: the photo fills the top and fades into the sign-in. Wider screens: photo left, sign-in right. */}
      <div className="absolute inset-x-0 top-0 h-[64dvh] md:sticky md:top-0 md:h-dvh">
        <Image src="/photos/rock-red.jpg" alt="" fill priority sizes="(min-width: 768px) 55vw, 100vw" className="object-cover object-[50%_30%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_13_11/0.55)_0%,rgb(15_13_11/0)_22%,rgb(15_13_11/0.65)_50%,#0F0D0B_78%)] md:bg-[linear-gradient(90deg,rgb(15_13_11/0)_55%,#0F0D0B_100%),linear-gradient(180deg,rgb(15_13_11/0.45)_0%,rgb(15_13_11/0)_25%)]" />
      </div>

      <div className="relative flex-1 flex flex-col md:min-h-dvh md:px-12 lg:px-20 md:py-12">
        <header className="pt-safe mt-6 flex justify-center md:mt-0 md:justify-start">
          <Wordmark size={30} />
        </header>

        <section className="mt-auto px-6 pb-safe flex flex-col gap-8 md:px-0 md:my-auto md:max-w-[420px]">
          <div className="flex flex-col gap-3.5">
            <h1 className="headline text-[40px] md:text-[52px] lg:text-[60px]">
              Where musicians
              <br />
              meet.
            </h1>
            <p className="max-w-[320px] md:max-w-[400px] text-[16px] md:text-[17px] leading-[1.45] text-smoke text-pretty">
              Show off your whole musical journey, find the people to start or fill out a band, and meet the musicians and gigs near you.
            </p>
          </div>
          <SignInButtons />
        </section>
      </div>
    </main>
  );
}
