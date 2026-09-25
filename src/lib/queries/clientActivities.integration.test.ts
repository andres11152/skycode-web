import { beforeEach, describe, expect, it } from "vitest";
import { getClientActivities, addClientActivity } from "./clientActivities";
import { query } from "../db";
import { createTestClient, createTestUser, resetTestDb } from "../testHelpers/db";

beforeEach(async () => {
  await resetTestDb();
});

describe("addClientActivity / getClientActivities", () => {
  it("registra una nota y la devuelve con autor y fecha", async () => {
    const client = await createTestClient();
    const user = await createTestUser({ name: "Vendedor Uno" });

    const activity = await addClientActivity({
      clientId: client.id,
      actorId: user.id,
      actorName: user.name,
      body: "Llamada de seguimiento, interesado en el módulo de facturación.",
    });

    expect(activity).not.toBeNull();
    expect(activity!.actor_name).toBe("Vendedor Uno");
    expect(activity!.body).toContain("facturación");

    const activities = await getClientActivities(client.id);
    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe(activity!.id);
  });

  it("devuelve null si el cliente no existe", async () => {
    const activity = await addClientActivity({ clientId: 999999, actorName: "X", body: "Nota" });
    expect(activity).toBeNull();
  });

  it("devuelve null si el cliente ya fue anonimizado (derecho al olvido, migración 0029)", async () => {
    const client = await createTestClient();
    await query(`UPDATE clients SET anonymized_at = now() WHERE id = $1;`, [client.id]);

    const activity = await addClientActivity({ clientId: client.id, actorName: "X", body: "Nota" });
    expect(activity).toBeNull();
  });

  it("ordena las notas más recientes primero", async () => {
    const client = await createTestClient();
    await addClientActivity({ clientId: client.id, actorName: "A", body: "Primera nota" });
    await query(`UPDATE client_activities SET created_at = now() - interval '1 day' WHERE body = 'Primera nota';`);
    await addClientActivity({ clientId: client.id, actorName: "B", body: "Segunda nota" });

    const activities = await getClientActivities(client.id);
    expect(activities.map((a) => a.body)).toEqual(["Segunda nota", "Primera nota"]);
  });

  it("no mezcla notas de distintos clientes", async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    await addClientActivity({ clientId: clientA.id, actorName: "A", body: "Nota de A" });
    await addClientActivity({ clientId: clientB.id, actorName: "B", body: "Nota de B" });

    const activitiesA = await getClientActivities(clientA.id);
    expect(activitiesA).toHaveLength(1);
    expect(activitiesA[0].body).toBe("Nota de A");
  });

  it("borrar el cliente borra sus notas (ON DELETE CASCADE)", async () => {
    const client = await createTestClient();
    await addClientActivity({ clientId: client.id, actorName: "A", body: "Nota" });

    await query(`DELETE FROM clients WHERE id = $1;`, [client.id]);
    const res = await query(`SELECT id FROM client_activities WHERE client_id = $1;`, [client.id]);
    expect(res.rows).toEqual([]);
  });
});
