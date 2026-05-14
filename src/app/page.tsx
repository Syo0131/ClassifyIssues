import { auth } from "@/auth";
import HomeClient from "./HomeClient";
import { getUserByUsername } from "@/lib/db";

export default async function HomePage() {
  const session = await auth();
  const username = session?.user?.name;
  const dbUser = username ? await getUserByUsername(username) : null;
  const projects = dbUser?.projects ?? [];

  return <HomeClient projects={projects} />;
}
