export const dynamic = "force-dynamic";

import { PageTitle } from "@/components/workspace/page-title";
import { CallAnalyticsClient } from "./call-analytics-client";

export default function CallAnalyticsPage() {
  return (
    <>
      <PageTitle title="Call Analytics" description="Voice AI screening call metrics and performance" />
      <CallAnalyticsClient />
    </>
  );
}
