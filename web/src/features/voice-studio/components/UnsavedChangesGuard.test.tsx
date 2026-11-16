import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
afterEach(cleanup);
function setup(dirty: boolean) {
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <>
          <UnsavedChangesGuard dirty={dirty} />
          <textarea defaultValue="unsaved dialogue" />
          <Link to="/other">Other page</Link>
        </>
      ),
    },
    { path: "/other", element: <h1>Other screen</h1> },
  ]);
  render(<RouterProvider router={router} />);
  return router;
}
describe("unsaved Voice Studio navigation", () => {
  it("allows internal Voice Studio view links and browser Back while keeping dirty text", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/create/voice-studio",
          element: (
            <>
              <UnsavedChangesGuard dirty />
              <textarea defaultValue="dirty script" />
              <Link to="?view=voices">My voices</Link>
            </>
          ),
        },
      ],
      { initialEntries: ["/create/voice-studio?view=script"] },
    );
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("link", { name: "My voices" }));
    await waitFor(() =>
      expect(router.state.location.search).toBe("?view=voices"),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("dirty script");
    await router.navigate(-1);
    await waitFor(() =>
      expect(router.state.location.search).toBe("?view=script"),
    );
    expect(screen.getByRole("textbox")).toHaveValue("dirty script");
  });
  it("keeps the draft when sidebar navigation is cancelled", async () => {
    const router = setup(true);
    fireEvent.click(screen.getByRole("link", { name: "Other page" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "ui.action.cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("textbox")).toHaveValue("unsaved dialogue");
  });
  it("requires explicit leave confirmation for a dirty document", async () => {
    const router = setup(true);
    fireEvent.click(screen.getByRole("link", { name: "Other page" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "leaveWithoutSaving" }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe("/other"));
    expect(
      screen.getByRole("heading", { name: "Other screen" }),
    ).toBeInTheDocument();
  });
  it("allows navigation without prompting after the draft is saved", async () => {
    const router = setup(false);
    fireEvent.click(screen.getByRole("link", { name: "Other page" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/other"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
