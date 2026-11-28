import Zip from "jszip";
import {expect,it} from "vitest";
import {readStorySkillFile} from "./readStorySkillFile";

it("imports a markdown skill or a collection with its own textual references",async()=>{
  const markdown="---\nname: costume-looksheet\n---\nMatch the wardrobe.";
  const file=new File([markdown],"SKILL.md");
  const [plain]=await readStorySkillFile(file);
  expect(plain).toMatchObject({name:"costume-looksheet",tasks:["looksheet"]});
  const zip=new Zip();
  zip.file("costume/SKILL.md",markdown);
  zip.file("costume/references/silks.md","Use matte silk.");
  zip.file("costume/references/details/SKILL.md","---\nname: nested-skill\n---\nSeparate instructions.");
  zip.file("costume/references/details/references/lighting.md","Nested lighting.");
  zip.file("costume/scripts/build.js","throw new Error()");
  zip.file("other/references/unused.md","Unrelated.");
  const bytes=await zip.generateAsync({type:"arraybuffer"});
  const [skill,nested]=await readStorySkillFile(new File([bytes],"skills.zip"));
  expect(skill.references).toEqual([{name:"references/silks.md",text:"Use matte silk."}]);
  expect(nested.references).toEqual([{name:"references/lighting.md",text:"Nested lighting."}]);
});

it("rejects archives without a skill",async()=>{
  const zip=new Zip().file("notes.md","Notes");
  const bytes=await zip.generateAsync({type:"arraybuffer"});
  await expect(readStorySkillFile(new File([bytes],"notes.zip"))).rejects.toThrow();
});
