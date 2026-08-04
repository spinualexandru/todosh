import { DatabaseProvider } from "@contexts/database";
import { InputFocusProvider } from "@contexts/input-focus";
import { RouterProvider } from "@contexts/router";
import { SettingsProvider } from "@contexts/settings";
import { ThemeProvider } from "@contexts/theme";
import type { Route } from "@types";
import type { ReactNode } from "react";

interface AppProvidersProps {
	children: ReactNode;
	initialRoute?: Route;
}

export function AppProviders({ children, initialRoute }: AppProvidersProps) {
	return (
		<SettingsProvider>
			<ThemeProvider>
				<DatabaseProvider>
					<InputFocusProvider>
						<RouterProvider initialRoute={initialRoute}>
							{children}
						</RouterProvider>
					</InputFocusProvider>
				</DatabaseProvider>
			</ThemeProvider>
		</SettingsProvider>
	);
}
