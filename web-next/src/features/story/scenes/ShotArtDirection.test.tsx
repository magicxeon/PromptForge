// @vitest-environment jsdom
import {fireEvent,render,screen,waitFor,cleanup} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {ShotArtDirection} from "./ShotArtDirection";
import type {CinematicProject,CinematicScene,CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";

const api=vi.hoisted(()=>({proposeShotArt:vi.fn(),updateCinematicShotDocument:vi.fn()}));
vi.mock("../../../../../web/src/features/cinematic/api/cinematicSeriesApi",()=>api);
vi.mock("../../../lib/canonical",()=>({ProcessingSpinner:()=>null}));
vi.mock("./promptTranslations",()=>({}));
vi.mock("react-i18next",()=>({useTranslation:()=>({t:(key:string)=>key,i18n:{language:"en"}})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

it("keeps a manual draft after a failed or discarded suggestion and saves only the accepted direction",async()=>{
  const project={id:"project",version:5} as CinematicProject;
  const scene={id:"scene",artDirection:"Window light"} as CinematicScene;
  const shot={id:"shot",version:2,artDirection:"Keep the shadow"} as CinematicShot;
  const onSaved=vi.fn();
  render(<ShotArtDirection project={project} scene={scene} shot={shot} onSaved={onSaved} run={async job=>{await job();}}/>);
  const click=(name:string)=>fireEvent.click(screen.getByRole("button",{name}));
  click("art.edit");
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"Soft rim light"}});
  api.proposeShotArt.mockRejectedValueOnce(new Error("Try again")).mockResolvedValue({artDirection:"Gold edge light"});
  click("art.suggest");
  expect((await screen.findByRole("alert")).textContent).toContain("Try again");
  click("art.suggest");
  await screen.findByText("Gold edge light");
  click("art.keep");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toEqual("Soft rim light");
  expect(api.updateCinematicShotDocument).not.toHaveBeenCalled();
  click("art.suggest");
  await screen.findByText("Gold edge light");
  api.updateCinematicShotDocument.mockResolvedValue({project:{...project,version:6}});
  click("art.accept");
  await waitFor(()=>expect(onSaved).toHaveBeenCalledWith(6));
  expect(api.updateCinematicShotDocument).toHaveBeenCalledWith("project","scene","shot",{
    expectedVersion:5,expectedShotVersion:2,artDirection:"Gold edge light"});
});
