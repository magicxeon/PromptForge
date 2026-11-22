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

it("saves the catalog model and at most five skills on the owning project's version; cancel leaves the project untouched",async()=>{
  const client=new QueryClient();
  const project={id:"story-root",version:9,writingSettings:{modelId:null,skillIds:[]}} as unknown as CinematicProject;
  const catalog={defaultModelId:null,maxSkills:5,models:[{id:"test-model",label:"Fixture model"}],
    skills:Array.from({length:6},(_,i)=>({id:"skill"+i,label:{en:"Skill "+i,th:"ทักษะ "+i},description:{en:"Direction",th:"คำกำกับ"}}))};
  api.updateCinematicWritingSettings.mockResolvedValue({...project,version:10});
  render(<QueryClientProvider client={client}><WritingSettings project={project} catalog={catalog} disabled={false}/></QueryClientProvider>);
  const button=(name:string)=>screen.getByRole("button",{name});
  fireEvent.click(button("writingSettings"));
  fireEvent.change(screen.getByRole("combobox"),{target:{value:"test-model"}});
  fireEvent.click(button("cancel"));
  expect(api.updateCinematicWritingSettings).not.toHaveBeenCalled();
  fireEvent.click(button("writingSettings"));
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
  fireEvent.change(screen.getByRole("combobox"),{target:{value:"test-model"}});
  const skills=screen.getAllByRole("checkbox") as HTMLInputElement[];
  skills.slice(0,5).forEach(skill=>fireEvent.click(skill));
  expect(skills[5].disabled).toBe(true);
  fireEvent.click(skills[0]);
  expect(skills[5].disabled).toBe(false);
  fireEvent.click(skills[5]);
  fireEvent.click(button("saveWritingSettings"));
  await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
  expect(api.updateCinematicWritingSettings).toHaveBeenCalledWith("story-root",9,{
    modelId:"test-model",skillIds:["skill1","skill2","skill3","skill4","skill5"]
  });
  expect(client.getQueryData(["story-project","owner","story-root"])).toMatchObject({version:10});
});
