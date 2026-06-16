// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  getStoredSidebarOpen,
  persistSidebarOpen,
  SIDEBAR_LOCAL_STORAGE_KEY,
} from "@/components/ui/sidebar-persistence";

describe("sidebar persistence", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.cookie = "sidebar:state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("persists the sidebar open state to localStorage", () => {
    persistSidebarOpen(false);

    expect(window.localStorage.getItem(SIDEBAR_LOCAL_STORAGE_KEY)).toBe("false");
  });

  it("restores the sidebar state from localStorage before defaults", () => {
    window.localStorage.setItem(SIDEBAR_LOCAL_STORAGE_KEY, "false");

    expect(getStoredSidebarOpen(true)).toBe(false);
  });
});
