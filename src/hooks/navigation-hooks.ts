import { useCallback, useEffect, useRef } from "react";
import { RoutePath } from "@/src/routing/routes";
import { usePathname } from "./use-pathname";
import { useIonRouter } from "@ionic/react";

function normalizePath(p: string) {
  return p.replace(/\/$/, "");
}

export function useIsActiveRoute(route?: RoutePath) {
  const pathname = usePathname();
  const snapshot = useRef(pathname);
  if (route) {
    return normalizePath(route) === normalizePath(pathname);
  }
  return normalizePath(snapshot.current) === normalizePath(pathname);
}

/**
 * Returns a stable function that checks whether the route is active
 * at call time. Useful inside timeouts/callbacks where a reactive
 * boolean would be stale.
 */
export function useGetIsActiveRoute() {
  const pathname = usePathname();
  const snapshotRef = useRef(pathname);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  return useCallback(
    () =>
      normalizePath(snapshotRef.current) === normalizePath(pathnameRef.current),
    [],
  );
}

export function useHideTabBarOnMount() {
  const isActive = useIsActiveRoute();
  useEffect(() => {
    if (isActive) {
      const tabBar = () => document.querySelector("ion-tab-bar");
      // add a CSS class to the root element
      tabBar()?.classList.add("hidden");
      return () => {
        // clean up when this component unmounts
        tabBar()?.classList.remove("hidden");
      };
    }
  }, [isActive]);
}

type Root = "/home/" | "/communities/" | "/inbox/";
type RootHref = "/home" | "/communities" | "/inbox";

/**
 * `root` is the tab's path prefix (`${root}c/...`). To go to the tab itself,
 * use `rootHref`: each tab's catch-all `/home/*` route comes first and also
 * matches `/home/`, so navigating to `root` lands on the not found page.
 */
export function useLinkContext(): {
  root: Root;
  rootHref: RootHref;
} {
  try {
    const pathname = useIonRouter().routeInfo.pathname;

    let root: "/home/" | "/communities/" | "/inbox/" = "/home/";

    if (pathname.startsWith("/communities")) {
      root = "/communities/";
    } else if (pathname.startsWith("/inbox")) {
      root = "/inbox/";
    }

    return {
      root,
      rootHref: root.slice(0, -1) as RootHref,
    };
  } catch {
    return {
      root: "/home/",
      rootHref: "/home",
    };
  }
}
