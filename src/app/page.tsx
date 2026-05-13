import { auth } from "@/auth";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const session = await auth();
  const projects = session?.user ? (session.user as any).projects : [];

  return <HomeClient projects={projects} />;
}
