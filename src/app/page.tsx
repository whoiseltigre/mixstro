import Image from "next/image";
import { Wordmark } from "@/components/ui";
import { SignInButtons } from "./sign-in-buttons";

export default function Welcome() {
  return (
    <main className="relative min-h-dvh flex flex-col">
      <div className="absolute inset-x-0 top-0 h-[64dvh]">
        <Image src="/photos/rock-red.jpg" alt="" fill priority sizes="440px" className="object-cover object-[50%_30%]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_13_11/0.55)_0%,rgb(15_13_11/0)_22%,rgb(15_13_11/0.65)_50%,#0F0D0B_78%)]" />
      </div>

      <header className="relative pt-safe mt-6 flex justify-center">
        <Wordmark size={30} />
      </header>

      <section className="relative mt-auto px-6 pb-safe flex flex-col gap-8">
        <div className="flex flex-col gap-3.5">
          <h1 className="headline text-[40px]">
            Where musicians
            <br />
            meet.
          </h1>
          <p className="max-w-[320px] text-[16px] leading-[1.45] text-smoke text-pretty">
            Show off your whole musical journey, find the people to start or fill out a band, and meet the musicians and gigs near you.
          </p>
        </div>
        <SignInButtons />
      </section>
    </main>
  );
}
