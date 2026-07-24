import { auth } from "@/auth";
import { getTicketById, getCommentsForTicket } from "@/lib/db";
import { calculateBudget } from "@/lib/budget";
import { canViewTicket } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import TicketDetailClient from "./TicketDetailClient";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user) redirect("/login");

  const { id } = await params as { id: string };
  const ticket = await getTicketById(Number(id));

  if (!ticket) notFound();

  // Security
  const user = session.user as any;
  if (!canViewTicket(user.role, Number(user.id), ticket.user_id)) {
    redirect("/dashboard");
  }

  const initialComments = await getCommentsForTicket(Number(id));

  // La tarifa vive en variables de entorno del servidor: el presupuesto se
  // calcula aquí y viaja ya resuelto al componente cliente.
  const budget = ticket.type === 'desarrollo' && ticket.spec ? calculateBudget(ticket.spec) : null;

  return (
    <div className="page-container">
      <TicketDetailClient
        ticket={ticket}
        initialComments={initialComments}
        currentUser={user}
        budget={budget}
      />
    </div>
  );
}
