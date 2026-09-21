import { describe, expect, mock, test } from "bun:test";

import { createActor, waitFor } from "xstate";

import {
	type ConnectionServices,
	createConnectionMachine,
} from "./connect-board";

function fixture(overrides: Partial<ConnectionServices> = {}) {
	const services = {
		hasKey: mock(async () => true),
		saveKey: mock(async (_key: string, _signal: AbortSignal) => {}),
		teams: mock(async (_signal: AbortSignal) => [{ id: "t1", name: "Team" }]),
		projects: mock(async (_teamId: string, _signal: AbortSignal) => [
			{ id: "p1", name: "Project" },
		]),
		connect: mock(
			async (
				_teamId: string,
				_projectId: string | undefined,
				_signal: AbortSignal,
			) => ({}),
		),
		...overrides,
	};
	const connected = mock(() => {}),
		canceled = mock(() => {}),
		localCreated = mock((_args: unknown, _params: { name: string }) => {});
	const actor = createActor(
		createConnectionMachine(services).provide({
			actions: { connected, canceled, localCreated },
		}),
	).start();
	return { actor, services, connected, canceled, localCreated };
}
const wait = (actor: ReturnType<typeof fixture>["actor"], value: string) =>
	waitFor(actor, (s) => s.value === value, { timeout: 1000 });

describe("board connection workflow", () => {
	test("local creation validates a name and does not access Linear", () => {
		const f = fixture();
		f.actor.send({ type: "LOCAL" });
		f.actor.send({ type: "CREATE_LOCAL", name: " " });
		expect(f.actor.getSnapshot().value).toBe("local");
		f.actor.send({ type: "CREATE_LOCAL", name: " Work " });
		expect(f.localCreated.mock.calls[0]?.[1]).toEqual({ name: "Work" });
		expect(f.services.hasKey).not.toHaveBeenCalled();
	});
	test("saved key connects to selected team/project exactly once", async () => {
		const f = fixture();
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "team");
		f.actor.send({ type: "TEAM", id: "invalid" });
		expect(f.actor.getSnapshot().value).toBe("team");
		f.actor.send({ type: "TEAM", id: "t1" });
		await wait(f.actor, "project");
		f.actor.send({ type: "PROJECT", id: "p1" });
		f.actor.send({ type: "PROJECT", id: "p1" });
		await wait(f.actor, "complete");
		expect(f.services.connect).toHaveBeenCalledTimes(1);
		expect(f.connected).toHaveBeenCalledTimes(1);
		expect(f.services.connect).toHaveBeenCalledWith(
			"t1",
			"p1",
			expect.any(AbortSignal),
		);
	});
	test("missing key and validation failure stay recoverable without keeping key in context", async () => {
		const saveKey = mock(async (): Promise<void> => {
			throw new Error("Invalid token");
		});
		const f = fixture({ hasKey: async () => false, saveKey });
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "key");
		f.actor.send({ type: "SAVE_KEY", key: "private-token" });
		await wait(f.actor, "key");
		expect(JSON.stringify(f.actor.getSnapshot().context)).not.toContain(
			"private-token",
		);
		expect(f.actor.getSnapshot().context.error).toBeDefined();
		saveKey.mockImplementation(async () => {});
		f.actor.send({ type: "SAVE_KEY", key: "replacement" });
		await wait(f.actor, "team");
		f.actor.stop();
	});
	test("keychain failure offers key entry and a way back", async () => {
		const f = fixture({
			hasKey: async () => {
				throw new Error("Linear: keychain locked");
			},
		});
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "key");
		expect(f.actor.getSnapshot().context.error).toBe("Linear: keychain locked");
		f.actor.send({ type: "BACK" });
		expect(f.actor.getSnapshot().context.error).toBeUndefined();
		f.actor.stop();
	});
	test("team loading can retry without re-entering the API key", async () => {
		const teams = mock(async (): Promise<{ id: string; name: string }[]> => {
			throw new Error("Offline");
		});
		const f = fixture({ teams });
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "teamsFailed");
		teams.mockImplementation(async () => [{ id: "t1", name: "Team" }]);
		f.actor.send({ type: "RETRY" });
		await wait(f.actor, "team");
		expect(f.services.saveKey).not.toHaveBeenCalled();
		f.actor.stop();
	});
	test("empty teams have an explicit failure state", async () => {
		const f = fixture({ teams: async () => [] });
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "teamsFailed");
		expect(f.actor.getSnapshot().context.error).toContain(
			"no accessible teams",
		);
		f.actor.stop();
	});
	test("project and import errors retain selection and allow retry", async () => {
		const projects = mock(async (): Promise<{ id: string; name: string }[]> => {
			throw new Error("Offline");
		});
		const connect = mock(async (): Promise<void> => {
			throw new Error("Offline");
		});
		const f = fixture({ projects, connect });
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "team");
		f.actor.send({ type: "TEAM", id: "t1" });
		await wait(f.actor, "projectsFailed");
		projects.mockImplementation(async () => []);
		f.actor.send({ type: "RETRY" });
		await wait(f.actor, "project");
		f.actor.send({ type: "PROJECT", id: "" });
		await wait(f.actor, "connectFailed");
		connect.mockImplementation(async () => {});
		f.actor.send({ type: "RETRY" });
		await wait(f.actor, "complete");
		expect(f.actor.getSnapshot().context.teamId).toBe("t1");
		expect(f.connected).toHaveBeenCalledTimes(1);
	});
	test("cancel aborts an import and discards its late completion", async () => {
		let finish: () => void = () => {};
		let signal: AbortSignal | undefined;
		const f = fixture({
			connect: async (_team, _project, s) => {
				signal = s;
				return new Promise<void>((resolve) => {
					finish = resolve;
				});
			},
		});
		f.actor.send({ type: "LINEAR" });
		await wait(f.actor, "team");
		f.actor.send({ type: "TEAM", id: "t1" });
		await wait(f.actor, "project");
		f.actor.send({ type: "PROJECT", id: "" });
		f.actor.send({ type: "CANCEL" });
		expect(signal?.aborted).toBe(true);
		finish();
		await Promise.resolve();
		expect(f.canceled).toHaveBeenCalledTimes(1);
		expect(f.connected).not.toHaveBeenCalled();
	});
	test("stopping an unmounted workflow discards pending work", async () => {
		let finish: (value: boolean) => void = () => {};
		const f = fixture({
			hasKey: () =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		});
		f.actor.send({ type: "LINEAR" });
		f.actor.stop();
		finish(true);
		await Promise.resolve();
		expect(f.services.teams).not.toHaveBeenCalled();
		expect(f.connected).not.toHaveBeenCalled();
	});
});
