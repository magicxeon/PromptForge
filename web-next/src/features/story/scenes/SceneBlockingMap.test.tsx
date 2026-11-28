// @vitest-environment jsdom
import {render, screen} from "@testing-library/react";
import {expect, it, vi} from "vitest";
import {SceneBlockingMap} from "./SceneBlockingMap";

vi.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string) => key})}));

it("draws explicit world positions and leaves free-form geography as text", () => {
  const {rerender} = render(<SceneBlockingMap value="Light from the window."/>);
  expect(screen.queryByRole("figure")).toBeNull();
  rerender(<SceneBlockingMap value={"E: Window\ne: Lamp\nC: แขกหันตะวันออก\nCamera on the south side"}/>);
  const grid = screen.getByRole("figure");
  const occupied = Array.from(grid.querySelectorAll('[data-used="true"]')).map(cell => cell.textContent);
  expect(occupied).toEqual(["Cแขกหันตะวันออก", "EWindow · Lamp"]);
});
