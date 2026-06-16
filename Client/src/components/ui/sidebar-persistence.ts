const SIDEBAR_LOCAL_STORAGE_KEY = "hireflow:sidebar:open";
const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const parseBooleanState = (value: string | null | undefined) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
};

export const getStoredSidebarOpen = (defaultOpen: boolean) => {
  if (typeof window === "undefined") {
    return defaultOpen;
  }

  const localStorageValue = parseBooleanState(window.localStorage.getItem(SIDEBAR_LOCAL_STORAGE_KEY));
  if (localStorageValue !== null) {
    return localStorageValue;
  }

  const cookieMatch = window.document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  const cookieValue = parseBooleanState(cookieMatch?.split("=")[1]);

  return cookieValue ?? defaultOpen;
};

export const persistSidebarOpen = (open: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SIDEBAR_LOCAL_STORAGE_KEY, String(open));
  window.document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
};

export { SIDEBAR_LOCAL_STORAGE_KEY };
