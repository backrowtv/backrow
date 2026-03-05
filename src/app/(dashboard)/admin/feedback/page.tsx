import { getFeedbackItems } from "@/app/actions/feedback";
import { FeedbackClient } from "./FeedbackClient";

export default async function AdminFeedbackPage() {
  const [bugResult, featureResult] = await Promise.all([
    getFeedbackItems("bug"),
    getFeedbackItems("feature"),
  ]);

  return <FeedbackClient bugs={bugResult.data || []} features={featureResult.data || []} />;
}
