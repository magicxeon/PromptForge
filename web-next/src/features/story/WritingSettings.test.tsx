// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { CinematicProject } from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import { WritingSettings } from "./WritingSettings";

const api=vi.hoisted(()=>({getCinematicProject:vi.fn(),updateCinematicWritingSettings:vi.fn()}));
vi.mock("../../../../web/src/features/cinematic/api/cinematicApi",()=>api);
vi.mock("../../lib/canonical",()=>({useActor:()=>({identityScope:"owner"}),ProcessingSpinner:()=>null}));
vi.mock("react-i18next",()=>({useTranslation:()=>({t:(key:string)=>key,i18n:{language:"en"}})}));
vi.mock("../dub-sub/Dialog",()=>({Dialog:({children}:{children:ReactNode})=><div role="dialog">{children}</div>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

it("adds a private skill with its own task and instructions to the project's saved settings",async()=>{
  const client=new QueryClient();
  const project={id:"project",version:3,setup:{},durationTargetMs:60000,fullStoryVersions:[],writingSettings:{modelId:null,skillIds:[]}} as unknown as CinematicProject;
  const catalog={defaultModelId:null,models:[],skills:[],taskSkills:{looksheet:[]}};
  api.updateCinematicWritingSettings.mockResolvedValue({...project,version:4});
  render(<QueryClientProvider client={client}><WritingSettings project={project} catalog={catalog} disabled={false}/></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button",{name:"brief.settings"}));
  fireEvent.click(screen.getByRole("button",{name:"projectSkills.add"}));
  fireEvent.change(screen.getByLabelText("projectSkills.name"),{target:{value:"Wardrobe"}});
  fireEvent.change(screen.getByLabelText("projectSkills.instruction"),{target:{value:"Match the collar."}});
  fireEvent.click(screen.getByLabelText("projectSkills.looksheet"));
  fireEvent.click(screen.getByRole("button",{name:"projectSkills.apply"}));
  fireEvent.click(screen.getByRole("button",{name:"saveWritingSettings"}));
  await waitFor(()=>expect(api.updateCinematicWritingSettings).toHaveBeenCalled());
  const saved=api.updateCinematicWritingSettings.mock.calls[0][2];
  expect(saved.customSkills[0]).toMatchObject({name:"Wardrobe",instruction:"Match the collar.",tasks:["looksheet"],version:1});
  expect(saved.skillIds).toEqual([saved.customSkills[0].id]);
});

it("saves the catalog model and six enabled skills on the owning project's version; cancel leaves the project untouched",async()=>{
  const client=new QueryClient();
  const project={id:"story-root",version:9,setup:{storyPeriod:"contemporary",genre:"drama",audienceFeeling:"moved",aspectRatio:"9:16"},durationTargetMs:60000,fullStoryVersions:[],writingSettings:{modelId:null,skillIds:[]}} as unknown as CinematicProject;
  const catalog={defaultModelId:null,maxSkills:5,models:[{id:"test-model",label:"Fixture model"}],
    skills:Array.from({length:6},(_,i)=>({id:"skill"+i,label:{en:"Skill "+i,th:"ทักษะ "+i},description:{en:"Direction",th:"คำกำกับ"}}))};
  api.updateCinematicWritingSettings.mockResolvedValue({...project,version:10});
  render(<QueryClientProvider client={client}><WritingSettings project={project} catalog={catalog} disabled={false}/></QueryClientProvider>);
  const button=(name:string)=>screen.getByRole("button",{name});
  fireEvent.click(button("brief.settings"));
  fireEvent.change(screen.getByRole("combobox",{name:"writingModel"}),{target:{value:"test-model"}});
  fireEvent.click(button("cancel"));
  expect(api.updateCinematicWritingSettings).not.toHaveBeenCalled();
  fireEvent.click(button("brief.settings"));
  expect((screen.getByRole("combobox",{name:"writingModel"}) as HTMLSelectElement).value).toBe("");
  fireEvent.change(screen.getByRole("combobox",{name:"writingModel"}),{target:{value:"test-model"}});
  const skills=screen.getAllByRole("checkbox") as HTMLInputElement[];
  skills.slice(0,5).forEach(skill=>fireEvent.click(skill));
  expect(skills[5].disabled).toBe(false);
  fireEvent.click(skills[5]);
  fireEvent.click(button("saveWritingSettings"));
  await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
  expect(api.updateCinematicWritingSettings).toHaveBeenCalledWith("story-root",9,{
    modelId:"test-model",skillIds:["skill0","skill1","skill2","skill3","skill4","skill5"]
  });
  expect(client.getQueryData(["story-project","owner","story-root"])).toMatchObject({version:10});
});
