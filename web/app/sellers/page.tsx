import type { Metadata } from "next";
import { SellersView } from "@/components/sellers/sellers-view";

export const metadata: Metadata = {
  title: "Sellers",
  description: "Create your MonkeVault on Arc and gate any API behind per-request USDC payments over x402.",
};

export default function SellersPage() {
  return <SellersView />;
}
