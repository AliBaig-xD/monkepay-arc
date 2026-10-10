import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap pt-[140px] pb-[80px] text-center">
      <p className="eyebrow m-0 mb-[10px]">404</p>
      <h1 className="h-section m-0 mb-[12px]">Nothing to pay for here.</h1>
      <p className="lead m-0 mb-[24px]">This page doesn&apos;t exist. Unlike a 402, there&apos;s no way to unlock it.</p>
      <Link href="/" className="btn btn-primary btn-md">Back home</Link>
    </section>
  );
}
