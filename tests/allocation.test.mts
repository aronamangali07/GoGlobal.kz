// Тесты честного распределения: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { allocate, ticketFor, type Candidate, type OfferForAllocation } from "../src/features/allocation/allocate.ts";

const offer: OfferForAllocation = {
  seats: 2, minEnglish: "B2", minAge: 18, maxAge: 30, country: "us", workTypes: ["restaurant"], at: new Date("2026-12-01T00:00:00Z"),
};
const base = (id: string, extra: Partial<Candidate> = {}): Candidate => ({
  applicationId: `app-${id}`, userId: `user-${id}`, englishLevel: "B2", birthDate: "2004-01-01",
  preferences: { countries: ["us"], workTypes: ["restaurant"] }, enrolled: true, hasPlaceElsewhere: false, ...extra,
});

test("неподходящие по требованиям не получают место, даже если их мало", async () => {
  const r = await allocate(offer, [base("a", { englishLevel: "B1" }), base("b", { birthDate: "1990-01-01" }), base("c")], "seed");
  const byId = Object.fromEntries(r.map((x) => [x.user_id, x]));
  assert.equal(byId["user-a"].outcome, "ineligible");
  assert.deepEqual(byId["user-a"].failed, ["english"]);
  assert.equal(byId["user-b"].outcome, "ineligible");
  assert.deepEqual(byId["user-b"].failed, ["age"]);
  assert.equal(byId["user-c"].outcome, "selected");
});

test("совпадение с пожеланиями важнее жребия", async () => {
  const r = await allocate(offer, [
    base("a", { preferences: { countries: ["de"], workTypes: ["office"] } }),
    base("b"),
    base("c"),
  ], "any-seed");
  assert.equal(r.find((x) => x.user_id === "user-a")!.outcome, "waitlisted");
});

test("при равных пожеланиях приоритет тем, у кого ещё нет места", async () => {
  const r = await allocate({ ...offer, seats: 1 }, [base("a", { hasPlaceElsewhere: true }), base("b")], "s");
  assert.equal(r[0].user_id, "user-b");
});

test("жребий воспроизводим: то же зерно — тот же результат, порядок подачи не важен", async () => {
  const cands = Array.from({ length: 8 }, (_, i) => base(String(i)));
  const r1 = await allocate(offer, cands, "9f3a");
  const r2 = await allocate(offer, [...cands].reverse(), "9f3a");
  assert.deepEqual(r1.map((x) => x.user_id), r2.map((x) => x.user_id));
  assert.equal(r1.filter((x) => x.outcome === "selected").length, 2);
  // Билет можно пересчитать независимо
  assert.equal(r1[0].ticket, await ticketFor("9f3a", r1[0].user_id));
});

test("разные зёрна дают разный порядок (жребий реально работает)", async () => {
  const cands = Array.from({ length: 8 }, (_, i) => base(String(i)));
  const orders = new Set<string>();
  for (const seed of ["a", "b", "c", "d", "e"]) orders.add((await allocate(offer, cands, seed)).map((x) => x.user_id).join());
  assert.ok(orders.size > 1);
});
