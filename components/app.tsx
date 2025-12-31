import { DatabaseProvider } from "@contexts/database";
import { RouterProvider } from "@contexts/router";
import { SettingsProvider } from "@contexts/settings";
import type { ReactNode } from "react";

interface AppProvidersProps {
	children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
	return (
		<SettingsProvider>
			<DatabaseProvider>
				<RouterProvider>{children}</RouterProvider>
			</DatabaseProvider>
		</SettingsProvider>
	);
}
