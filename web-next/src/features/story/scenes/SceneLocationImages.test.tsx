// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import type {CinematicProject, CinematicScene} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {SceneLocationImages} from "./SceneLocationImages";

const api = vi.hoisted(() => ({approveCinematicSceneEnvironment: vi.fn()}));
vi.mock("../../../../../web/src/features/cinematic/api/cinematicApi", () => api);
vi.mock("../../../components/media/MediaImage", () => ({MediaImage: (props: {src: string; alt: string}) => <img {...props}/>}));
vi.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string) => key})}));
afterEach(() => {cleanup(); vi.clearAllMocks();});

const kitchen = {assetId: "kitchen-image", imageUrl: "/kitchen", location: "Kitchen", description: "Blue tiles"};
const inn = {assetId: "inn-image", imageUrl: "/inn", location: "Inn"};
function show(sceneData: object, others: object[] = []) {
  const scene = {id: "current", title: "Opening", location: "Kitchen", ...sceneData} as CinematicScene;
  const project = {id: "movie", version: 5, scenes: [scene, ...others]} as CinematicProject;
  return render(<SceneLocationImages scene={scene} project={project} disabled={false}
    run={async job => {await job();}}/>);
}

it("edits metadata on a legacy image and defaults its location from the scene", async () => {
  show({approvedEnvironmentSource: {assetId: "legacy", imageUrl: "/old"}});
  fireEvent.click(screen.getByRole("button", {name: "stage.editImageDetails"}));
  const location = screen.getByLabelText("stage.imageLocation") as HTMLInputElement;
  expect(location.value).toBe("Kitchen");
  fireEvent.change(location, {target: {value: "Back kitchen"}});
  fireEvent.change(screen.getByLabelText("stage.imageDescription"), {target: {value: "Wood stove"}});
  fireEvent.click(screen.getByRole("button", {name: "stage.saveImageDetails"}));
  await waitFor(() => expect(api.approveCinematicSceneEnvironment).toHaveBeenCalledWith("movie", "current",
    {expectedVersion: 5, editAssetId: "legacy", location: "Back kitchen", description: "Wood stove"}));
});

it("shows the active image and selects a different image by its asset ID", async () => {
  show({approvedEnvironmentSource: inn, environmentSources: [inn, kitchen]});
  expect(screen.getByRole("button", {name: /Inn/}).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", {name: /Kitchen/}));
  await waitFor(() => expect(api.approveCinematicSceneEnvironment).toHaveBeenCalledWith("movie", "current",
    {expectedVersion: 5, selectedAssetId: kitchen.assetId}));
});

it("offers an exact matching alternate from another scene first and reuses that asset", async () => {
  show({}, [{id: "other", title: "Past episode", approvedEnvironmentSource: inn, environmentSources: [inn, kitchen]}]);
  const picker = screen.getByRole("combobox") as HTMLSelectElement;
  expect(picker.options[1].textContent).toContain("stage.matchLocation");
  expect(picker.options[1].textContent).toContain("Kitchen");
  fireEvent.change(picker, {target: {value: picker.options[1].value}});
  await waitFor(() => expect(api.approveCinematicSceneEnvironment).toHaveBeenCalledWith("movie", "current",
    {expectedVersion: 5, reuseSceneId: "other", reuseAssetId: kitchen.assetId, preserveReferenceSetting: true}));
});
