import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";

const setVapidDetailsMock = vi.fn();
const sendNotificationMock = vi.fn();

class FakeWebPushError extends Error {
  statusCode: number;
  constructor(statusCode: number) {
    super("fake push error");
    this.statusCode = statusCode;
  }
}

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => setVapidDetailsMock(...args),
    sendNotification: (...args: unknown[]) => sendNotificationMock(...args),
  },
  WebPushError: FakeWebPushError,
}));

const getSubscriptionsForUserMock = vi.fn();
const deleteSubscriptionByEndpointMock = vi.fn();
vi.mock("./queries/pushSubscriptions", () => ({
  getSubscriptionsForUser: (...args: unknown[]) => getSubscriptionsForUserMock(...args),
  deleteSubscriptionByEndpoint: (...args: unknown[]) => deleteSubscriptionByEndpointMock(...args),
}));

const logErrorMock = vi.fn();
vi.mock("./logger", () => ({ logError: (...args: unknown[]) => logErrorMock(...args) }));

const ORIGINAL_ENV = { ...process.env };

async function importFresh() {
  vi.resetModules();
  return import("./webPush");
}

describe("sendPushToUser", () => {
  beforeEach(() => {
    setVapidDetailsMock.mockClear();
    sendNotificationMock.mockClear();
    getSubscriptionsForUserMock.mockClear();
    deleteSubscriptionByEndpointMock.mockClear();
    logErrorMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sin las 3 variables VAPID configuradas, es un no-op silencioso (nunca consulta suscripciones)", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    const { sendPushToUser } = await importFresh();

    await expect(sendPushToUser(1, { title: "T", body: "B" })).resolves.not.toThrow();
    expect(getSubscriptionsForUserMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("con solo 2 de las 3 variables, sigue siendo no-op", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    delete process.env.VAPID_SUBJECT;
    const { sendPushToUser } = await importFresh();

    await sendPushToUser(1, { title: "T", body: "B" });
    expect(getSubscriptionsForUserMock).not.toHaveBeenCalled();
  });

  it("configurado y sin suscripciones del usuario, no llama a sendNotification", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:a@b.com";
    getSubscriptionsForUserMock.mockResolvedValue([]);
    const { sendPushToUser } = await importFresh();

    await sendPushToUser(1, { title: "T", body: "B" });
    expect(setVapidDetailsMock).toHaveBeenCalledWith("mailto:a@b.com", "pub", "priv");
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("envía a cada suscripción activa del usuario con el payload en JSON", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:a@b.com";
    getSubscriptionsForUserMock.mockResolvedValue([
      { endpoint: "https://push.example.com/a", p256dh: "p1", auth: "a1" },
      { endpoint: "https://push.example.com/b", p256dh: "p2", auth: "a2" },
    ]);
    sendNotificationMock.mockResolvedValue(undefined);
    const { sendPushToUser } = await importFresh();

    await sendPushToUser(1, { title: "Título", body: "Cuerpo", link: "/dashboard/leads" });

    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    const [subscriptionArg, payloadArg] = sendNotificationMock.mock.calls[0];
    expect(subscriptionArg).toEqual({ endpoint: "https://push.example.com/a", keys: { p256dh: "p1", auth: "a1" } });
    expect(JSON.parse(payloadArg)).toEqual({ title: "Título", body: "Cuerpo", link: "/dashboard/leads" });
  });

  it("borra la suscripción cuando el envío falla con 404/410 (invalidada por el navegador)", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:a@b.com";
    getSubscriptionsForUserMock.mockResolvedValue([{ endpoint: "https://push.example.com/dead", p256dh: "p", auth: "a" }]);
    sendNotificationMock.mockRejectedValueOnce(new FakeWebPushError(410));
    const { sendPushToUser } = await importFresh();

    await sendPushToUser(1, { title: "T", body: "B" });
    expect(deleteSubscriptionByEndpointMock).toHaveBeenCalledWith("https://push.example.com/dead");
    expect(logErrorMock).not.toHaveBeenCalled();
  });

  it("un error distinto de 404/410 se loguea pero no borra la suscripción ni interrumpe otras", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:a@b.com";
    getSubscriptionsForUserMock.mockResolvedValue([
      { endpoint: "https://push.example.com/flaky", p256dh: "p", auth: "a" },
      { endpoint: "https://push.example.com/ok", p256dh: "p2", auth: "a2" },
    ]);
    sendNotificationMock.mockRejectedValueOnce(new FakeWebPushError(500)).mockResolvedValueOnce(undefined);
    const { sendPushToUser } = await importFresh();

    await sendPushToUser(1, { title: "T", body: "B" });
    expect(deleteSubscriptionByEndpointMock).not.toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
  });
});
