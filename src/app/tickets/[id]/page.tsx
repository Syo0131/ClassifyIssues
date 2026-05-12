import { auth } from "@/auth";
import { getTicketById, getCommentsForTicket } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import TicketDetailClient from "./TicketDetailClient";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params as { id: string };
  const ticket = getTicketById(Number(id));

  if (!ticket) notFound();

  // Security
  const user = session.user as any;
  if (user.role !== 'technician' && ticket.user_id !== Number(user.id)) {
    redirect("/dashboard");
  }

  const initialComments = getCommentsForTicket(Number(id));

  return (
    <div className="page-container">
      <TicketDetailClient 
        ticket={ticket} 
        initialComments={initialComments} 
        currentUser={user} 
      />
    </div>
  );
}
