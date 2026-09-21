import { LinearClient } from "@linear/sdk";
import { secrets } from "bun";

const credential = { service: "todosh", name: "linear-api-key" };
const storageError =
	"Linear: secure credential storage is unavailable or locked. Unlock your OS keychain and retry. On Linux, install libsecret and run a Secret Service such as GNOME Keyring or KWallet. Alternatively, set LINEAR_API_KEY before launching Todosh.";

export class LinearCredentials {
	constructor(
		private readonly store: Pick<
			typeof secrets,
			"get" | "set" | "delete"
		> = secrets,
		private readonly environmentKey: () => string | undefined = () =>
			process.env.LINEAR_API_KEY,
	) {}
	async get(): Promise<string | null> {
		const override = this.environmentKey()?.trim();
		if (override) return override;
		try {
			return await this.store.get(credential);
		} catch {
			throw new Error(storageError);
		}
	}
	async save(
		value: string,
		validate: (key: string) => Promise<unknown> = async (key) => {
			await new LinearClient({
				apiKey: key,
				signal: signal
					? AbortSignal.any([signal, AbortSignal.timeout(30000)])
					: AbortSignal.timeout(30000),
			}).viewer;
		},
		signal?: AbortSignal,
	): Promise<void> {
		const key = value.trim();
		if (!key) throw new Error("Linear: enter an API key.");
		try {
			await validate(key);
		} catch {
			throw new Error(
				"Linear: could not validate the API key. Check the key and your connection, then retry.",
			);
		}
		signal?.throwIfAborted();
		try {
			await this.store.set({ ...credential, value: key });
		} catch {
			throw new Error(storageError);
		}
	}
	async remove(): Promise<void> {
		try {
			await this.store.delete(credential);
		} catch {
			throw new Error(storageError);
		}
	}
}
export const linearCredentials = new LinearCredentials();
