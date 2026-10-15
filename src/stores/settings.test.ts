import { describe, test, expect, afterEach } from "vitest";
import { useSettingsStore } from "./settings";
import { renderHook, act } from "@testing-library/react";
import _ from "lodash";

afterEach(() => {
  const { result } = renderHook(() => useSettingsStore());
  act(() => {
    result.current.reset();
  });
});

describe("useSettingsStore", () => {
  test("setFilterKeywords", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setFilterKeywords({ index: 0, keyword: "one" });
      result.current.setFilterKeywords({ index: 1, keyword: "two" });
      result.current.setFilterKeywords({ index: 2, keyword: "three" });
    });

    expect(result.current.filterKeywords).toEqual(["one", "two", "three"]);
  });

  test("pruneFilterKeywords", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setFilterKeywords({ index: 0, keyword: "one" });
      result.current.setFilterKeywords({ index: 1, keyword: "two" });
      result.current.setFilterKeywords({ index: 2, keyword: "three" });
      result.current.setFilterKeywords({ index: 3, keyword: "" });
    });

    expect(result.current.filterKeywords).toHaveLength(4);

    act(() => {
      result.current.pruneFiltersKeywords();
    });

    expect(result.current.filterKeywords).toHaveLength(3);
  });
});

describe("merging state persisted by older builds", () => {
  const merge = (persisted: object) =>
    useSettingsStore.persist.getOptions().merge!(
      persisted,
      useSettingsStore.getState(),
    ) as ReturnType<typeof useSettingsStore.getState>;

  test.each([
    [{ hideRead: false }, "account"],
    [{ hideRead: true }, true],
    [{}, "account"],
  ])("hideRead %o becomes hideReadSetting %s", (persisted, expected) => {
    const merged = merge(persisted);
    expect(merged.hideReadSetting).toBe(expected);
    expect(merged).not.toHaveProperty("hideRead");
  });

  test.each([
    [{ paginationMode: "pages" }, "pages"],
    [{ paginationMode: "infinite" }, "infinite"],
    [{}, "infinite"],
  ])(
    "paginationMode %o becomes paginationSetting %s",
    (persisted, expected) => {
      const merged = merge(persisted);
      expect(merged.paginationSetting).toBe(expected);
      expect(merged).not.toHaveProperty("paginationMode");
    },
  );

  test("a newer setting wins over the legacy key", () => {
    expect(
      merge({ hideRead: true, hideReadSetting: false }).hideReadSetting,
    ).toBe(false);
  });
});

describe("persisted state snapshot", () => {
  test("settings store initial shape", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.reset();
    });

    expect(_.omitBy(result.current, _.isFunction)).toMatchSnapshot();
  });
});
