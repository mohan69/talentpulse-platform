import { AnalyticsClient } from "./analytics-client";
import { PageTitle } from "@/components/workspace/page-title";

export const dynamic = "force-dynamic";

export default function AdminAnalytics() {
  return (<><PageTitle title="Analytics & KPIs" description="Key performance indicators, conversion metrics, prospect pipeline, and recruitment funnel analytics." /><AnalyticsClient /></>);
}
