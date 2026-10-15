import { Outlet } from "react-router";
import { requireTheme } from "../lib/theme";

export async function loader({ params }: { params: { theme?: string } }) {
  return { theme: requireTheme(params.theme) };
}

export default function ThemeLayout() {
  return <Outlet />;
}
