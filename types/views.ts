export type ViewName = "dashboard" | "board" | "table" | "detail";

export type Route =
	| { view: "dashboard" }
	| { view: "board"; boardId: number }
	| { view: "table"; boardId: number }
	| { view: "detail"; boardId: number; taskId: number };

export interface RouterState {
	current: Route;
	history: Route[];
}

export interface RouterContextValue {
	route: Route;
	navigate: (route: Route) => void;
	goBack: () => void;
	canGoBack: boolean;
}
