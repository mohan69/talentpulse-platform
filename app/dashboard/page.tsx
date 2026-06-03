import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardRouter() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as string;
  if (role === "ADMIN") redirect("/admin");
  if (role === "RECRUITER") redirect("/recruiter");
  if (role === "CLIENT") redirect("/client-portal");
  if (role === "CANDIDATE") redirect("/candidate-portal");
  redirect("/login");
}
