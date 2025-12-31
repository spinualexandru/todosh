import { existsSync, unlinkSync } from "node:fs";
import { getSocketPath } from "@utils/paths";
import { handleRequest } from "./handlers";
import { error, formatResponse, parseRequest } from "./protocol";

let server: ReturnType<typeof Bun.listen> | null = null;

export function startSocketServer(): void {
	const socketPath = getSocketPath();

	if (existsSync(socketPath)) {
		try {
			unlinkSync(socketPath);
		} catch {
			// Ignore errors removing stale socket
		}
	}

	server = Bun.listen({
		unix: socketPath,
		socket: {
			open(_socket) {
				// Connection opened
			},
			data(socket, data) {
				const raw = data.toString().trim();
				if (!raw) return;

				const lines = raw.split("\n");
				for (const line of lines) {
					const request = parseRequest(line);
					if (!request) {
						socket.write(formatResponse(error("Invalid JSON request")));
						continue;
					}

					try {
						const response = handleRequest(request);
						socket.write(formatResponse(response));
					} catch (err) {
						const message =
							err instanceof Error ? err.message : "Unknown error";
						socket.write(formatResponse(error(message)));
					}
				}
			},
			close(_socket) {
				// Connection closed
			},
			error(_socket, err) {
				console.error("Socket error:", err);
			},
		},
	});

	process.on("exit", stopSocketServer);
	process.on("SIGINT", () => {
		stopSocketServer();
		process.exit(0);
	});
	process.on("SIGTERM", () => {
		stopSocketServer();
		process.exit(0);
	});
}

export function stopSocketServer(): void {
	if (server) {
		server.stop();
		server = null;
	}

	const socketPath = getSocketPath();
	if (existsSync(socketPath)) {
		try {
			unlinkSync(socketPath);
		} catch {
			// Ignore errors
		}
	}
}

export function isServerRunning(): boolean {
	return server !== null;
}
