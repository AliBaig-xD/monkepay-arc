import type { Metadata } from "next";
import { DocsView } from "@/components/docs-view";

export const metadata: Metadata = {
  title: "Docs",
  description: "Quickstarts for agents and sellers, the public x402 facilitator API, and the MonkeVault contract reference.",
};

export default function DocsPage() {
  return <DocsView />;
}
