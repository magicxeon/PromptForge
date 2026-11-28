// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import type {CinematicProject} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {FullStoryPlan} from "./FullStoryPlan";
import {useState} from "react";
import {MemoryRouter} from "react-router-dom";
import {ChapterContinuityReview} from "./ChapterContinuityReview";
import {StoryRunSkillContext} from "./StoryRunSkills";
import type {CinematicSeriesWorkspace} from "../../../../web/src/features/cinematic/schemas/cinematicSeriesSchemas";
import type {CinematicWritingSettingsCatalog} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";

const api=vi.hoisted(()=>({
  confirmCinematicFullStoryRevision:vi.fn(), proposeCinematicChapterOutline:vi.fn(),
  reviewCinematicChapterOutline:vi.fn(), generateCinematicFullStoryChapters:vi.fn()
}));
const series=vi.hoisted(()=>({applyCinematicChapterProposal:vi.fn(),discardCinematicChapterProposal:vi.fn(),proposeCinematicChapters:vi.fn()}));
vi.mock("../../../../web/src/features/cinematic/api/cinematicApi",()=>api);
vi.mock("../../../../web/src/features/cinematic/api/cinematicSeriesApi",()=>series);
vi.mock("react-i18next",()=>({useTranslation:()=>({i18n:{language:"en"},t:(label:string)=>label})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

it("shows only affected chapters and consumes an explicit empty skill override without changing project settings",async()=>{
  const project={id:"ep3",version:3,chapterProposals:[],confirmedFullStoryVersionId:null} as unknown as CinematicProject;
  const workspace={chapters:[
    {projectId:"ep2",order:2,title:"Finished",continuityReviewRequired:false},
    {projectId:"ep3",order:3,title:"The lantern",continuityReviewRequired:true}
  ]} as CinematicSeriesWorkspace;
  const settings={skillIds:["continuity"],modelId:null};
  const catalog={recommendedSkillCount:3,taskSkills:{chapters:["continuity"]},
    skills:[{id:"continuity",label:{en:"Continuity",th:"Continuity"}}]} as unknown as CinematicWritingSettingsCatalog;
  function View() {
    const [overrides,set]=useState<Record<string,string[]|undefined>>({});
    return <MemoryRouter><StoryRunSkillContext.Provider value={{catalog,settings,overrides,change:(task,ids)=>set(v=>({...v,[task]:ids}))}}>
      <ChapterContinuityReview busy={false} project={project} owner={project} workspace={workspace} run={async job=>{await job();}}/>
    </StoryRunSkillContext.Provider></MemoryRouter>;
  }
  render(<View/>);
  expect(screen.queryByText(/Finished/)).toBeNull();
  expect(screen.getByRole("link",{name:/The lantern/}).getAttribute("href")).toBe("/story/ep3");
  fireEvent.click(screen.getByText("runSkills.heading"));
  fireEvent.click(screen.getByRole("checkbox",{name:"Continuity"}));
  fireEvent.click(screen.getByRole("button",{name:"continuityQueue.propose"}));
  expect(series.proposeCinematicChapters).toHaveBeenCalledWith("ep3",{expectedVersion:3,scope:"selected",intent:"continuity",skillIdsOverride:[]});
  expect((screen.getByRole("checkbox",{name:"Continuity"}) as HTMLInputElement).checked).toBe(true);
  expect(settings.skillIds).toEqual(["continuity"]);
});

it("uses the confirmed full story revision for the outline and applies only the reviewed chapter proposal",async()=>{
  const open=vi.fn();
  const base={id:"project",version:4,fullStoryVersions:[{id:"draft",version:2}],
    activeFullStoryVersionId:"draft", confirmedFullStoryVersionId:null,chapterProposals:[],
    setup:{format:"series",durationSeconds:120,seasonEnabled:false}};
  const run=async(job:()=>Promise<unknown>)=>{await job();};
  const view=(p:unknown)=><FullStoryPlan project={p as CinematicProject} goChapter={open} run={run}/>;
  const page=render(view(base));
  fireEvent.click(screen.getByText("confirmRevision"));
  expect(api.confirmCinematicFullStoryRevision).toHaveBeenCalledWith("project",4,"draft");
  const confirmed={...base,confirmedFullStoryVersionId:"draft"};
  page.rerender(view(confirmed));
  fireEvent.click(screen.getByText("proposeOutline"));
  expect(api.proposeCinematicChapterOutline).toHaveBeenCalledWith("project",4,undefined);
  const outline={id:"outline",sourceRevisionId:"draft",settings:{...base.setup,seasonCount:1},
    chapters:["Arrival","Search","Return"].map((title,index)=>({
      title,synopsis:`Part ${index+1} of the story`,seasonNumber:1,chapterNumber:index+1
    })),status:"proposed"};
  page.rerender(view({...confirmed,chapterOutline:outline}));
  expect(screen.queryByText("writeChapters")).toBeNull();
  fireEvent.click(screen.getByText("approveOutline"));
  expect(api.reviewCinematicChapterOutline).toHaveBeenCalledWith("project",{
    expectedVersion:4,outlineId:"outline",action:"approve",chapters:outline.chapters
  });
  fireEvent.click(screen.getByText("discardOutline"));
  expect(api.reviewCinematicChapterOutline).toHaveBeenLastCalledWith("project",{
    expectedVersion:4,outlineId:"outline",action:"discard"
  });
  api.generateCinematicFullStoryChapters.mockResolvedValue({project:confirmed,workspace:{chapters:[]}});
  page.rerender(view({...confirmed,chapterOutline:{...outline,status:"approved"}}));
  fireEvent.click(screen.getByText("writeChapters"));
  await waitFor(()=>expect(api.generateCinematicFullStoryChapters).toHaveBeenCalledWith("project",4,undefined,expect.any(Function)));
  const proposal={id:"proposal",scope:"all",status:"pending_review",sourceFullStoryRevisionId:"draft",warnings:[],
    chapters:[{order:1,title:"Arrival",story:"The door opens."}]};
  page.rerender(view({...confirmed,chapterProposals:[proposal]}));
  series.applyCinematicChapterProposal.mockResolvedValue({project:confirmed,workspace:{chapters:[]}});
  fireEvent.click(screen.getByText("applyChapters"));
  await waitFor(()=>expect(series.applyCinematicChapterProposal).toHaveBeenCalledWith("project","proposal"));
  page.rerender(view({...confirmed,chapterProposals:[{...proposal,sourceFullStoryRevisionId:"older"}]}));
  expect((screen.getByText("applyChapters") as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByText("discardChapters") as HTMLButtonElement).disabled).toBe(false);
  series.discardCinematicChapterProposal.mockResolvedValue({project:confirmed,workspace:{chapters:[]}});
  fireEvent.click(screen.getByText("discardChapters"));
  await waitFor(()=>expect(series.discardCinematicChapterProposal).toHaveBeenCalledWith("project","proposal"));
  page.rerender(view({...confirmed,chapterOutline:{...outline,status:"approved"},
    chapterProposals:[{...proposal,status:"applied",appliedProjectIds:["chapter-1"]}]}));
  const saved = screen.getByRole("region",{name:"savedChapters"});
  expect(within(saved).queryByRole("button",{name:"writeChapters"})).toBeNull();
  fireEvent.click(within(saved).getByRole("button",{name:"openChapter"}));
  expect(open).toHaveBeenCalledWith("chapter-1");
  expect(api.generateCinematicFullStoryChapters).toHaveBeenCalledTimes(1);
});
