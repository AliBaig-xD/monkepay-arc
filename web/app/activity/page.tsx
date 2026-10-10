import type { Metadata } from "next";
import { ActivityView } from "@/components/activity-view";

export const metadata: Metadata = {
  title: "Activity",
  description: "Live x402 settlements on Arc mainnet, indexed from MonkeVault Settled events.",
};

export default function ActivityPage() {
  return <ActivityView />;
}
