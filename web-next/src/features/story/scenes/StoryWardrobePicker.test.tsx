// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {StoryWardrobePicker} from "./StoryWardrobePicker";
import type {CinematicProject,CinematicScene,CinematicShot} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";

const api=vi.hoisted(()=>({updateCinematicSceneOutfits:vi.fn(),updateCinematicShotDocument:vi.fn()}));
vi.mock("../../../../../web/src/features/cinematic/api/cinematicSeriesApi",()=>api);
vi.mock("../../../lib/canonical",()=>({ProcessingSpinner:()=>null}));
vi.mock("../../../components/media/MediaImage",()=>({MediaImage:(props:{src:string;alt:string})=><img {...props}/>}));
vi.mock("react-i18next",()=>({useTranslation:()=>({t:(key:string,options?:{name:string})=>[key,options?.name].filter(Boolean).join(" ")})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

const member={id:"mei",displayName:"Xiaomei",storyReference:{assetId:"face",imageUrl:"/face"},
  storyOutfits:[{id:"apron",name:"Apron",imageUrl:"/apron"},{id:"cloak",name:"Cloak"}]} as CinematicProject["castAssignments"][number];
const scene={id:"snow",version:2,orderKey:2,storyOutfitIds:{other:"robe"}} as unknown as CinematicScene;
const project={id:"inn",version:7,scenes:[scene,{id:"opening",orderKey:1,storyOutfitIds:{mei:"apron"}}]} as CinematicProject;
const props={project,scene,members:[member],run:async(job:()=>Promise<unknown>)=>{await job();}};

it("offers the previous outfit without applying it until chosen and preserves other cast",async()=>{
  api.updateCinematicSceneOutfits.mockResolvedValue({project});
  render(<StoryWardrobePicker {...props}/>);
  expect(screen.getByRole("img").getAttribute("src")).toBe("/face");
  expect(api.updateCinematicSceneOutfits).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"wardrobePicker.previous Apron"}));
  await waitFor(()=>expect(api.updateCinematicSceneOutfits).toHaveBeenCalledWith("inn","snow",
    {expectedVersion:7,expectedSceneVersion:2,storyOutfitIds:{other:"robe",mei:"apron"}}));
});

it("shows a missing inherited image and can return a special shot to inheritance",async()=>{
  api.updateCinematicShotDocument.mockResolvedValue({project});
  const shot={id:"special",version:3,storyOutfitIds:{}} as CinematicShot;
  const activeScene={...scene,storyOutfitIds:{mei:"cloak"}};
  const view=render(<StoryWardrobePicker {...props} scene={activeScene} shot={shot}/>);
  expect(screen.getByText("wardrobePicker.missing Cloak")).toBeTruthy();
  expect(screen.queryByRole("img")).toBeNull();
  view.rerender(<StoryWardrobePicker {...props} scene={activeScene} shot={{...shot,storyOutfitIds:{mei:"apron"}}}/>);
  expect(screen.getByRole("img").getAttribute("src")).toBe("/apron");
  fireEvent.change(screen.getByRole("combobox"),{target:{value:"inherit"}});
  await waitFor(()=>expect(api.updateCinematicShotDocument).toHaveBeenCalledWith("inn","snow","special",
    {expectedVersion:7,expectedShotVersion:3,storyOutfitIds:{}}));
  expect(api.updateCinematicSceneOutfits).not.toHaveBeenCalled();
});
