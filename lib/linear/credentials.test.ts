import { describe, expect, mock, test } from "bun:test";

import { LinearCredentials } from "./credentials";

function fixture(
	initial: string | null = null,
	environmentKey: () => string | undefined = () => undefined,
) {
	let saved = initial;
	const store = {
		get: mock(async (_options: { service: string; name: string }) => saved),
		set: mock(
			async (options: { service: string; name: string; value: string }) => {
				saved = options.value;
			},
		),
		delete: mock(async (_options: { service: string; name: string }) => {
			saved = null;
			return true;
		}),
	};
	return { store, credentials: new LinearCredentials(store, environmentKey) };
}

describe("Linear credentials", () => {
	test("environment key takes precedence without accessing a broken keyring", async () => {
		const { store, credentials } = fixture("saved-key", () => " env-key ");
		store.get.mockRejectedValue(new Error("Keyring unavailable"));
		expect(await credentials.get()).toBe("env-key");
		expect(store.get).not.toHaveBeenCalled();
		expect(store.set).not.toHaveBeenCalled();
	});
	test("blank environment key falls back to the saved key", async () => {
		const { store, credentials } = fixture("saved-key", () => "   ");
		expect(await credentials.get()).toBe("saved-key");
		expect(store.get).toHaveBeenCalledTimes(1);
	});
	test("removing a saved key leaves the environment override intact", async () => {
		let override: string | undefined = "env-key";
		const { credentials } = fixture("saved-key", () => override);
		await credentials.remove();
		expect(await credentials.get()).toBe("env-key");
		override = undefined;
		expect(await credentials.get()).toBeNull();
	});

	test("stopping validation prevents a subsequent keychain write", async () => {
		const { store, credentials } = fixture("old-key");
		const controller = new AbortController();
		await expect(
			credentials.save(
				"replacement",
				async () => {
					controller.abort();
				},
				controller.signal,
			),
		).rejects.toThrow();
		expect(store.set).not.toHaveBeenCalled();
		expect(await credentials.get()).toBe("old-key");
	});

	test("validates before storing and reuses the OS credential", async () => {
		const { store, credentials } = fixture();
		const validate = mock(async (key: string) => {
			expect(key).toBe("test-key");
			expect(store.set).not.toHaveBeenCalled();
		});
		await credentials.save(" test-key ", validate);
		expect(await credentials.get()).toBe("test-key");
		expect(store.set.mock.calls[0]?.[0]).toEqual({
			service: "todosh",
			name: "linear-api-key",
			value: "test-key",
		});
	});
	test("blank or invalid keys never replace a working key", async () => {
		const { store, credentials } = fixture("old-key");
		const validate = mock(async () => {
			throw new Error("request contains secret-value");
		});
		await expect(credentials.save("  ", validate)).rejects.toThrow(
			"enter an API key",
		);
		expect(validate).not.toHaveBeenCalled();
		await expect(credentials.save("bad-key", validate)).rejects.toThrow(
			"could not validate",
		);
		expect(store.set).not.toHaveBeenCalled();
		expect(await credentials.get()).toBe("old-key");
	});
	test("unavailable keychain fails with guidance and no secret in the error", async () => {
		const { store, credentials } = fixture();
		store.set.mockRejectedValue(new Error("secret-value"));
		await expect(
			credentials.save("secret-value", async () => {}),
		).rejects.toThrow("secure credential storage is unavailable");
		expect(await credentials.get()).toBeNull();
		store.get.mockRejectedValue(new Error("secret-value"));
		await expect(credentials.get()).rejects.toThrow("Unlock your OS keychain");
	});
	test("removing a credential targets only the Linear key", async () => {
		const { store, credentials } = fixture("old-key");
		await credentials.remove();
		expect(store.delete.mock.calls[0]?.[0]).toEqual({
			service: "todosh",
			name: "linear-api-key",
		});
		expect(await credentials.get()).toBeNull();
	});
});
