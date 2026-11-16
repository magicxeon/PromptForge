import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceEventToolbar } from "./VoiceEventToolbar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);
const policy = {
  maxRows: 100,
  maxTextLength: 2000,
  maxStyleLength: 400,
  inlineTags: ["<gasp>", "<sigh>", "<short pause>"],
  eventToolbarTags: ["<sigh>", "<unsupported>"],
  eventGroups: [
    { id: "pauses", labelKey: "eventGroup.pauses", tags: ["<short pause>"] },
  ],
};
describe("Voice event toolbar", () => {
  it("inserts a configured frequent event with one click and hides unsupported entries", () => {
    const insert = vi.fn();
    render(<VoiceEventToolbar policy={policy} onInsert={insert} />);
    fireEvent.click(screen.getByRole("button", { name: "events.sigh" }));
    expect(insert).toHaveBeenCalledExactlyOnceWith("<sigh>");
    expect(
      screen.queryByRole("button", { name: "events.unsupported" }),
    ).toBeNull();
  });
  it("filters configured groups and inserts once from the chooser", async () => {
    const insert = vi.fn();
    render(<VoiceEventToolbar policy={policy} onInsert={insert} />);
    fireEvent.click(screen.getByRole("button", { name: "moreEvents" }));
    fireEvent.change(screen.getByLabelText("eventCategory"), {
      target: { value: "pauses" },
    });
    expect(screen.queryByRole("button", { name: /events.gasp/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /events.shortpause/ }));
    await waitFor(() =>
      expect(insert).toHaveBeenCalledExactlyOnceWith("<short pause>"),
    );
  });
  it("Escape restores focus without editing dialogue", async () => {
    const insert = vi.fn(),
      restore = vi.fn();
    render(
      <VoiceEventToolbar
        policy={policy}
        onInsert={insert}
        onRestoreFocus={restore}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "moreEvents" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(restore).toHaveBeenCalled());
    expect(insert).not.toHaveBeenCalled();
  });
});
