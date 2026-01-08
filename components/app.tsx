import { DatabaseProvider } from "@contexts/database";
import { RouterProvider } from "@contexts/router";
import { SettingsProvider } from "@contexts/settings";
import type { Route } from "@types";
import type { ReactNode } from "react";

interface AppProvidersProps {
	children: ReactNode;
	initialRoute?: Route;
}

export function AppProviders({ children, initialRoute }: AppProvidersProps) {
	return (
		<SettingsProvider>
			<DatabaseProvider>
				<RouterProvider initialRoute={initialRoute}>{children}</RouterProvider>
			</DatabaseProvider>
		</SettingsProvider>
	);
}
