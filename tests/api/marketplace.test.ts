import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getApiConfig } from "@atlas/config";
import { InMemoryNotificationRepository } from "../../apps/api/src/repositories/in-memory-notification-repository.js";
import { MarketplaceEventBus } from "../../apps/api/src/events/marketplace-event-bus.js";
import { makeApp, inject, login, register } from "./helpers.js";
import type { FastifyInstance } from "fastify";

describe("development CORS defaults", () => {
  it("allows the active Vite dev ports used by local browsers", () => {
    const origins = Array.isArray(getApiConfig().corsOrigin)
      ? getApiConfig().corsOrigin
      : [getApiConfig().corsOrigin];

    expect(origins).toContain("http://localhost:5173");
    expect(origins).toContain("http://localhost:5174");
    expect(origins).toContain("http://127.0.0.1:5174");
  });
});

describe("authentication and listings", () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await makeApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it("registers, restores, and logs out a session", async () => {
    const cookie = await register(app, "new@example.com");
    expect(
      (await inject(app, { method: "GET", url: "/auth/me" }, cookie)).json()
        .email,
    ).toBe("new@example.com");
    expect(
      (await inject(app, { method: "POST", url: "/auth/logout" }, cookie))
        .statusCode,
    ).toBe(200);
    expect(
      (await inject(app, { method: "GET", url: "/auth/me" }, cookie))
        .statusCode,
    ).toBe(401);
  });

  it("correlates responses and separates liveness from readiness", async () => {
    const health = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "browser-check-1" },
    });
    expect(health.statusCode).toBe(200);
    expect(health.headers["x-request-id"]).toBe("browser-check-1");
    expect((await app.inject({ method: "GET", url: "/ready" })).json()).toEqual(
      { status: "ready" },
    );
    const missing = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(missing.statusCode).toBe(404);
    expect(missing.headers["x-request-id"]).toBeTruthy();
    expect(missing.json().error.requestId).toBe(
      missing.headers["x-request-id"],
    );
  });

  it("rejects invalid credentials and protects listing creation", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "buyer@example.com", password: "wrong" },
    });
    expect(invalid.statusCode).toBe(401);
    expect(
      (await app.inject({ method: "POST", url: "/listings", payload: {} }))
        .statusCode,
    ).toBe(401);
    const cookie = await login(app, "seller@example.com", "seller123");
    const created = await inject(
      app,
      {
        method: "POST",
        url: "/listings",
        payload: {
          sellerId: "demo-seller-2",
          title: "Session owned",
          description: "Valid listing",
          price: 100,
          currency: "AED",
          category: "watches",
          images: [],
        },
      },
      cookie,
    );
    expect(created.statusCode).toBe(201);
    expect(created.json().sellerId).toBe("demo-seller");
  });

  it("supports deterministic discovery, 404s, updates, and ownership checks", async () => {
    const seller = await login(app, "seller@example.com", "seller123");
    const buyer = await login(app, "buyer@example.com", "buyer123");
    const sorted = await app.inject({
      method: "GET",
      url: "/listings?category=luxury-watches&sort=price_asc",
    });
    expect(sorted.statusCode).toBe(200);
    const prices = sorted
      .json()
      .items.map((item: { price: number }) => item.price);
    expect(prices).toEqual([...prices].sort((left, right) => left - right));
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/listings?minPrice=200&maxPrice=100",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: "GET", url: "/listings/missing" }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await inject(
          app,
          {
            method: "PATCH",
            url: "/listings/listing-1",
            payload: { title: "Spoofed" },
          },
          buyer,
        )
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await inject(
          app,
          {
            method: "PATCH",
            url: "/listings/listing-1",
            payload: { title: "Updated" },
          },
          seller,
        )
      ).json().title,
    ).toBe("Updated");
    expect(
      (
        await inject(
          app,
          {
            method: "PATCH",
            url: "/listings/listing-1/status",
            payload: { status: "sold" },
          },
          seller,
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await inject(
          app,
          {
            method: "PATCH",
            url: "/listings/listing-1/status",
            payload: { status: "active" },
          },
          seller,
        )
      ).statusCode,
    ).toBe(409);
  });
});

describe("offers and transaction lifecycle", () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await makeApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it("derives buyer identity, prevents seller self-bidding, and enforces offer authorization", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/listings/listing-1/offers",
          payload: {},
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: "/offers/offer-1/status",
          payload: {},
        })
      ).statusCode,
    ).toBe(401);
    const buyer = await login(app, "buyer2@example.com", "buyer123");
    const seller = await login(app, "seller@example.com", "seller123");
    const created = await inject(
      app,
      {
        method: "POST",
        url: "/listings/listing-1/offers",
        payload: { buyerId: "demo-seller", amount: 24000, currency: "AED" },
      },
      buyer,
    );
    expect(created.statusCode).toBe(201);
    expect(created.json().buyerId).toBe("demo-buyer-2");
    expect(
      (
        await inject(
          app,
          {
            method: "PATCH",
            url: `/offers/${created.json().id}/status`,
            payload: { status: "withdrawn" },
          },
          seller,
        )
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: "/listings/listing-1/offers",
            payload: { amount: 24000, currency: "AED" },
          },
          seller,
        )
      ).statusCode,
    ).toBe(403);
  });

  it("accepts one offer, rejects competing offers, and creates one transaction", async () => {
    const seller = await login(app, "seller@example.com", "seller123");
    const response = await inject(
      app,
      {
        method: "PATCH",
        url: "/offers/offer-1/status",
        payload: { status: "accepted" },
      },
      seller,
    );
    expect(response.statusCode).toBe(200);
    expect(response.json().transaction.status).toBe("pending_payment");
    expect(
      (await app.inject({ method: "GET", url: "/listings/listing-1/offers" }))
        .statusCode,
    ).toBe(401);
    const buyer = await login(app, "buyer@example.com", "buyer123");
    const transaction = response.json().transaction;
    expect(
      (
        await inject(
          app,
          { method: "POST", url: `/transactions/${transaction.id}/ship` },
          buyer,
        )
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: `/transactions/${transaction.id}/payment`,
            headers: { "idempotency-key": "payment-1" },
            payload: { outcome: "failure" },
          },
          buyer,
        )
      ).json().paymentStatus,
    ).toBe("failed");
    const retry = await inject(
      app,
      {
        method: "POST",
        url: `/transactions/${transaction.id}/payment`,
        headers: { "idempotency-key": "payment-2" },
        payload: { outcome: "success" },
      },
      buyer,
    );
    expect(retry.json().status).toBe("paid");
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: `/transactions/${transaction.id}/payment`,
            headers: { "idempotency-key": "payment-2" },
            payload: { outcome: "success" },
          },
          buyer,
        )
      ).json().version,
    ).toBe(retry.json().version);
    expect(
      (
        await inject(
          app,
          { method: "POST", url: `/transactions/${transaction.id}/ship` },
          seller,
        )
      ).json().fulfilmentStatus,
    ).toBe("shipped");
    expect(
      (
        await inject(
          app,
          { method: "POST", url: `/transactions/${transaction.id}/complete` },
          buyer,
        )
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await inject(
          app,
          { method: "POST", url: `/transactions/${transaction.id}/deliver` },
          buyer,
        )
      ).json().fulfilmentStatus,
    ).toBe("delivered");
    expect(
      (
        await inject(
          app,
          { method: "POST", url: `/transactions/${transaction.id}/complete` },
          buyer,
        )
      ).json().status,
    ).toBe("completed");
  });
});

describe("messaging and notifications", () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await makeApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it("prevents unrelated conversation access and derives sender identity", async () => {
    const buyer = await login(app, "buyer@example.com", "buyer123");
    const other = await login(app, "buyer2@example.com", "buyer123");
    const created = await inject(
      app,
      {
        method: "POST",
        url: "/conversations",
        payload: { listingId: "listing-1" },
      },
      buyer,
    );
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: `/conversations/${id}/messages`,
            payload: { senderId: "demo-seller", body: "hello" },
          },
          buyer,
        )
      ).json().senderId,
    ).toBe("demo-buyer");
    expect(
      (await inject(app, { method: "GET", url: `/conversations/${id}` }, other))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: `/conversations/${id}/messages`,
            payload: { body: "" },
          },
          buyer,
        )
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await inject(
          app,
          {
            method: "POST",
            url: "/conversations",
            payload: { listingId: "listing-1" },
          },
          buyer,
        )
      ).statusCode,
    ).toBe(200);
  });

  it("scopes notifications and supports idempotent projection/read state", async () => {
    const seller = await login(app, "seller@example.com", "seller123");
    const buyer = await login(app, "buyer@example.com", "buyer123");
    const repository = new InMemoryNotificationRepository();
    const event = {
      type: "offer.created" as const,
      listingId: "listing-1",
      actorUserId: "demo-buyer",
      payload: {
        offer: {
          id: "offer-x",
          listingId: "listing-1",
          buyerId: "demo-buyer",
          sellerId: "demo-seller",
          amount: 100,
          currency: "AED",
          status: "pending" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        },
      },
    };
    const bus = new MarketplaceEventBus();
    const published = bus.publish(event, ["demo-seller"]);
    const first = await repository.create({
      userId: "demo-seller",
      type: "offer_received",
      title: "Offer",
      body: "Offer",
      resourceType: "offer",
      resourceId: "offer-x",
      sourceEventId: published.id,
    });
    expect(
      await repository.create({
        userId: "demo-seller",
        type: "offer_received",
        title: "Offer",
        body: "Offer",
        resourceType: "offer",
        resourceId: "offer-x",
        sourceEventId: published.id,
      }),
    ).toBeUndefined();
    expect(first).toBeDefined();
    const list = await inject(
      app,
      { method: "GET", url: "/notifications" },
      seller,
    );
    expect(list.statusCode).toBe(200);
    expect(
      (
        await inject(app, { method: "GET", url: "/notifications" }, buyer)
      ).json().items,
    ).toEqual([]);
    bus.close();
  });
});
