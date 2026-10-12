import { QueryClient } from "@tanstack/react-query";
import { MAX_CACHE_MS } from "../stores/config";
import { Errors } from "../apis/api-blueprint";
import { isNotFoundError } from "../apis/utils";

export function compareErrors(err: Error, key: keyof typeof Errors) {
  const target = Errors[key].message;
  return err.name === target || err.message === target;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: MAX_CACHE_MS,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      networkMode: "online",
      retry: (count, err) => {
        // Retrying won't make a missing object appear
        if (isNotFoundError(err)) {
          return false;
        }
        return count <= 3;
      },
    },
  },
});
