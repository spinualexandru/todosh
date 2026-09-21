import { Database } from "bun:sqlite";
import { describe, expect, mock, test } from "bun:test";

import { waitFor } from "xstate";

import {
	createBoardWorkflow,
	getBoardWorkflow,
	stopBoardWorkflows,
} from "./board-sync";

describe("board operation workflow", () => {
	test("local cache changes notify views without refreshing or waiting for active work", async () => {
		const refresh = mock(async () => {});
		const flow = createBoardWorkflow(refresh);
		let finish: () => void = () => {};
		const pending = flow.run(
			async () =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		const revision = flow.actor.getSnapshot().context.revision;
		flow.actor.send({ type: "CACHE_CHANGED" });
		expect(flow.actor.getSnapshot().context.revision).toBe(revision + 1);
		expect(flow.actor.getSnapshot().matches("working")).toBe(true);
		expect(refresh).not.toHaveBeenCalled();
		finish();
		await pending;
		expect(refresh).not.toHaveBeenCalled();
		flow.stop();
	});
	test("operations run serially and continue after failure", async () => {
		const flow = createBoardWorkflow(async () => {});
		const order: string[] = [];
		let finish: () => void = () => {};
		const first = flow.run(async () => {
			order.push("first");
			await new Promise<void>((r) => {
				finish = r;
			});
			return 1;
		});
		const second = flow.run(async () => {
			order.push("second");
			throw new Error("Offline");
		});
		expect(order).toEqual(["first"]);
		finish();
		expect(await first).toBe(1);
		expect(await second).toBeNull();
		expect(flow.actor.getSnapshot().context.error).toBeDefined();
		expect(await flow.run(async () => 3)).toBe(3);
		expect(flow.actor.getSnapshot().context.error).toBeUndefined();
		flow.stop();
	});
	test("refresh requests coalesce and writes wait for the active refresh", async () => {
		let finish: () => void = () => {};
		const refresh = mock(
			async () =>
				new Promise<void>((r) => {
					finish = r;
				}),
		);
		const flow = createBoardWorkflow(refresh);
		flow.actor.send({ type: "WATCH" });
		flow.actor.send({ type: "REFRESH" });
		flow.actor.send({ type: "WATCH" });
		const work = mock(async () => true);
		const result = flow.run(work);
		expect(work).not.toHaveBeenCalled();
		finish();
		await result;
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(work).toHaveBeenCalledTimes(1);
		flow.stop();
	});
	test("polling stops when the last view leaves", async () => {
		const refresh = mock(async () => {});
		const flow = createBoardWorkflow(refresh, 20);
		flow.actor.send({ type: "WATCH" });
		await waitFor(flow.actor, (s) => s.context.revision >= 2, {
			timeout: 1000,
		});
		flow.actor.send({ type: "UNWATCH" });
		const count = refresh.mock.calls.length;
		await new Promise((resolve) => setTimeout(resolve, 65));
		expect(refresh).toHaveBeenCalledTimes(count);
		flow.stop();
	});
	test("registry shares a queue across views and isolates boards", () => {
		const db = new Database(":memory:");
		expect(getBoardWorkflow(db, 1)).toBe(getBoardWorkflow(db, 1));
		expect(getBoardWorkflow(db, 1)).not.toBe(getBoardWorkflow(db, 2));
		stopBoardWorkflows(db);
		db.close();
	});
	test("shutdown aborts active work and resolves queued callers", async () => {
		const flow = createBoardWorkflow(async () => {});
		let signal: AbortSignal | undefined;
		const active = flow.run(async (s) => {
			signal = s;
			return new Promise(() => {});
		});
		const next = mock(async () => 1);
		const queued = flow.run(next);
		flow.stop();
		expect(signal?.aborted).toBe(true);
		expect(await active).toBeNull();
		expect(await queued).toBeNull();
		expect(next).not.toHaveBeenCalled();
	});
});
