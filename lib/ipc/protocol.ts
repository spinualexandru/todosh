import type { Board, Priority, Task, TaskStatus } from "@types";

export type IpcRequest =
	| { type: "boards:list" }
	| { type: "boards:get"; id: number }
	| { type: "boards:create"; name: string; description?: string }
	| { type: "boards:update"; id: number; name?: string; description?: string }
	| { type: "boards:delete"; id: number }
	| { type: "tasks:list"; boardId?: number; status?: TaskStatus }
	| { type: "tasks:get"; id: number }
	| {
			type: "tasks:create";
			boardId: number;
			title: string;
			description?: string;
			status?: TaskStatus;
			priority?: Priority;
	  }
	| {
			type: "tasks:update";
			id: number;
			title?: string;
			description?: string;
			status?: TaskStatus;
			priority?: Priority;
			dueDate?: string | null;
	  }
	| { type: "tasks:delete"; id: number }
	| { type: "tasks:move"; id: number; status: TaskStatus }
	| { type: "ping" };

export type IpcResponse =
	| { ok: true; data: unknown }
	| { ok: false; error: string };

export interface BoardListResponse {
	boards: Board[];
}

export interface BoardResponse {
	board: Board;
}

export interface TaskListResponse {
	tasks: Task[];
}

export interface TaskResponse {
	task: Task;
}

export interface PingResponse {
	pong: true;
	pid: number;
}

export function parseRequest(raw: string): IpcRequest | null {
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && "type" in parsed) {
			return parsed as IpcRequest;
		}
		return null;
	} catch {
		return null;
	}
}

export function formatResponse(response: IpcResponse): string {
	return `${JSON.stringify(response)}\n`;
}

export function success<T>(data: T): IpcResponse {
	return { ok: true, data };
}

export function error(message: string): IpcResponse {
	return { ok: false, error: message };
}
