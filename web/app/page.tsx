import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { HandshakeDemo } from "@/components/landing/handshake-demo";
import { TryIt } from "@/components/landing/try-it";
import { Features } from "@/components/landing/features";
import { Contracts } from "@/components/landing/contracts";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <TryIt />
      <HandshakeDemo />
      <Features />
      <Contracts />
    </>
  );
}
