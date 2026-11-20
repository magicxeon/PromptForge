# FE24-VID — Video workspace

วันที่: 2026-11-20 · สถานะ: Requirement พร้อมสำหรับทบทวน; **รอคำสั่ง implement**.
Owner: Frontend experience / Video presentation; Product Requirement Architect primary.
UX/QA ทบทวนเอกสารตามลำดับโดยผู้เขียนเดียวกัน ไม่อ้าง independent runtime review.
อ้างอิง [001](001-ux-and-screen-components.md), [002](002-image-video-workflows.md),
[003](003-source-architecture-and-contracts.md) และ [006 Comparison](006-comparison-workspace.md).

## 1. เป้าหมายและขอบเขต

สร้าง Video workspace ที่พิมพ์ Prompt เลือกโมเดล/เวลา/ภาพอ้างอิง แล้วดูคลิปได้ง่าย
ใช้ภาษาไทย/อังกฤษและpaletteเดียวกับImage. อยู่ลำดับที่3ของเมนู **Image → Comparison → Video**.
Video เป็นงานเดี่ยวตาม durable task contractเดิม; ไม่รวม Video Comparison, timeline,
shot/story authoring, lip-sync, voice editor หรือการเพิ่มprovider/modelจากหน้านี้.

Flow: เปิดVideo→คืนdraft→เลือกprovider/modelและmodeที่รองรับ→เขียนPrompt/เพิ่มsource
→ตั้งduration/ratio/resolution/audio→ดูestimate→Generate→ติดตามtask→เล่น/ดาวน์โหลดคลิป
→นำค่ากลับมาแก้เพื่อสร้างครั้งถัดไป. ทุกการสร้างต้องเกิดจากปุ่ม explicit.
ไม่มี autoGenerate ตอนเปลี่ยนmode, uploadเสร็จ,โหลดhistoryหรือกลับมาที่หน้า.

## 2. Layout และ navigation

ใช้ shell/เมนู/provider-model picker/Prompt modalตามFE24-U1.
Desktop ซ้าย: Model → Mode → Prompt → References → duration/ratio/resolution/audio
→ advancedเฉพาะที่รองรับ → estimate/Generate/status. ขวา: playerใหญ่ → metadata/actions
→ Recent successful videos. Activityเปิดดูtaskที่ค้าง/ล้มเหลวได้จากตำแหน่งเดียวกับImage.
โมเดลกับmodeเป็นcontrolsกะทัดรัด ไม่แสดงcatalogเต็มแผงเหนือPrompt.

Tabletลดคอลัมน์ตามพื้นที่; Mobileใช้ `สร้าง / ผลลัพธ์` เก็บdraft/task/selectedclipชุดเดิม.
ไม่มีcarouselที่ต้องเลื่อนหน้าทั้งเว็บแนวนอน. Toolbar/footerไม่ทับPromptหรือplayer.
งานเสร็จไม่ย้ายแท็บ/scroll/focusหรือเริ่มเล่นเสียง; แจ้งว่ามีผลใหม่ให้เลือกเอง.
Prompt modalแก้draftเดียวกันและแสดงจำนวนอักขระ/limitจากcatalog; ไม่hard-code8000/10000.

## 3. Model, mode และ controls

รายการจาก `getVideoCapabilityCatalog`; เปลี่ยนprovider/modelแล้วเก็บค่าที่ใช้ร่วมกันได้.
ค่าที่ขัดกันยังมองเห็นและแก้ได้ใกล้field; ไม่ล้างPrompt/referenceหรือลดdurationเงียบ ๆ.
ไม่เพิ่มwarningขวางหน้าตลอดเวลาเมื่อไม่มีactionที่ผู้ใช้ต้องแก้; เหตุผล unavailable
แสดงที่control/Generateตามresponseจริง ไม่เดาว่าทุกโมเดลยังไม่approved.

| Control | กติกา |
|---|---|
| Mode | แสดงเฉพาะที่ผ่านทั้งcatalogและtyped submit/source contract; text-to-video/image-to-videoก่อน; first-last/multimodalตามreadiness§7 |
| Duration | exact + durationsจำนวนเต็มเรียงติดกัน ใช้sliderและnumberinputที่syncกัน เช่น4–30เมื่อcatalogให้จริง; step1ตามownerปัจจุบัน |
| Discrete duration | ถ้าค่าไม่ต่อเนื่องหรือprompted ใช้ตัวเลือกเฉพาะค่าที่รองรับ ไม่สร้างrangeระหว่างช่องว่าง |
| Duration metadata | แยกเวลาที่ขอ/เวลาที่render/เวลาคลิปจริง; แสดงreconciliationจากquote/taskเมื่อมี ไม่สัญญาความยาวเป๊ะในpromptedmode |
| Ratio/resolution | จากmodel; ตรวจcombinationกับmode/duration/reference/audio ไม่ใช่แค่แต่ละfield |
| Audio | none/generatedเมื่อรองรับ;ไม่แสดงสวิตช์ที่ส่งค่าไม่ได้ ไม่เพิ่มTTS/เลือกvoiceในflowนี้ |
| Advanced | seed/FPS/optionsอื่นเฉพาะมีtyped APIรองรับ; ไม่สร้างplaceholderเพื่อรอbackend |

ขณะลากsliderตัวเลขและdraftเปลี่ยนทันที; quoteใช้debounce/normalized request ownerเดิม
เพื่อไม่ยิงทุกpixelและไม่รับquoteเก่าทับค่าใหม่. Number inputพิมพ์ค่าชั่วคราวได้; out-of-range
แจ้งใกล้ช่องและไม่ส่งงานจนแก้ ไม่เปลี่ยนเป็นค่าอื่นโดยไม่บอก.

## 4. References และ Image → Video

- แยก opening/first frame, last frameและreference imageตามroleจริง ไม่รวมเป็นarray
  ที่เปลี่ยนความหมายตามตำแหน่งโดยไม่มีmapping. ลำดับreferenceต้องคงจนถึงsubmission.
- แหล่งภาพ: Upload, ภาพสำเร็จเดิม และtrusted character/look sourcesที่ownerอนุญาต;
  ใช้asset/generation/version IDsและsource planเดิม ไม่ส่งprivateURLตรงไปproviderจากbrowser.
- N/maxตามmodel/source policy;9รูปใช้ได้เฉพาะcatalog/source contractที่เปิด9จริง.
  policyบางmodelอาจจำกัดtrusted/generatedsource; UIแสดงตัวเลือกตามนั้น ไม่เลี่ยงด้วยupload.
- Thumbnailแต่ละรายการดูใหญ่/ตั้งชื่อถ้าcontractรองรับ/เปลี่ยน/ลบได้ แม้มีerror.
  upload/processing/failed/reselectแยกต่อไฟล์; retryเฉพาะไฟล์เสียและปฏิเสธlate response
  ของรายการที่ลบ/แทน. ใช้same reference processing/authority ไม่สร้างlocalmedia store.
- Providerระบุหลายภาพผิด ต้องhighlightทุกรายการตามstructured mapping; ข้อความ
  content indexใช้mappingของadapterเดิม ไม่เดาหัก1ในUI. ถ้าไม่มีmappingแสดงระดับtask.

Image result “ใช้ใน Video” เปิด `/video` ด้วยauthorized sourceตามhandoff owner.
คงImage draftและselectedresult. หากVideoมีsource/Prompt/modeที่จะถูกแทน แสดงรายการ
fieldที่จะเปลี่ยนก่อนยืนยัน; CancelคืนVideo draftครบ. Confirmเปลี่ยนเฉพาะfieldนั้น
แล้วre-quote ไม่มีautoGenerate. ห้ามเลือกmodeที่ไม่รองรับsourceเพียงเพื่อให้handoffสำเร็จ.
การนำผลก่อนหน้ามาใช้คืนค่าจาก submitted snapshot ไม่อ้างcurrentdraftเป็นค่าของคลิปเก่า.

## 5. Quote, durable task และสถานะ

Quoteและsubmitใช้VideoGenerationApplicationServiceผ่านAPIเดิม; `requestFingerprint`,
estimateIdและinputต้องตรงกัน. เครดิต/charge mode/ยอดสูงสุดเมื่อactual_usageมาจากowner
ไม่hard-codeadmin1creditหรือfixedrateที่frontend. ไม่เพิ่มconfirmทั่วไปนอกpolicyเดิม.

Persist stable idempotency key + safe request intentก่อนPOST; แยกจากdraftที่จะเขียนต่อ.
เมื่อรับtask IDให้ติดตามtaskเดิมผ่านcanonical polling policyและjob center; ไม่ซ้อนpoller
ในทุกcard. Terminalหยุดpoll, recoveryตามautomaticMonitoring/recheckAllowed/deadline
และnext-check contract. Check statusเป็นการตรวจtask ไม่ใช่submitใหม่.

Responseหายก่อนID: unknown/reconciliation, คืนintentหลังreload, owner lookupหางานเดิม
โดยไม่คิดเงินหรือdispatchเพิ่ม. APIปัจจุบันยังไม่มีclient lookup-by-key ต้องทำV01ก่อน
รับรองrecovery; ไม่คำนวณdeterministic task IDในbrowserและไม่ใช้Recent absenceตัดสิน.
Network retryไม่ออกkeyใหม่; ผู้ใช้ตั้งใจสร้างครั้งใหม่หลังทราบสถานะแล้วจึงใช้keyใหม่.

| สถานะ | การแสดงผล/การทำต่อ |
|---|---|
| queued/running | สถานะจริงพร้อมProcessingSpinnerและtaskreference; คลิปสำเร็จเดิมยังใช้ได้ |
| unknown/checking/recovery | ข้อความพร้อมCheckตามowner/cooldown; ไม่ค้างspinnerเกินสถานะจริงหรือแสดงว่าล้มเหลวเพียงเพราะtimeout |
| failed/cancelled | หยุดspinner,ข้อความerrorและtaskreferenceในActivity/status; ไม่มีplayerหรือpreviewการ์ดดำ |
| completed + authorized video | แสดงในRecentและเปิดเล่นเมื่อผู้ใช้เลือก; metadataตามtask |
| completed แต่ยังไม่มีasset | แสดงสถานะdelivery/recoveryตามowner; ไม่ขึ้นการ์ดว่างและไม่ส่งงานใหม่ |
| playable URL แต่โหลด/เล่นไม่ได้ | media errorพร้อมretryโหลดเดิม;ยังเก็บtaskสำเร็จ ไม่คิดcredit/Generateใหม่ |

เก็บfailed task,provider code/request referenceและsanitized logsที่serverตามownerเดิม.
UIซ่อนfailed previewเท่านั้น ไม่ลบประวัติ. ไม่lograwPrompt/privateURL/referencepayload
เพิ่มเพื่อdebug. Cancelมีเมื่อownerมีcommandจริง; ไม่มีปุ่มที่ทำเพียงซ่อนtaskแล้วอ้างcancel.

## 6. Player และรายการผลงาน

- ใช้พื้นที่viewerจริงหลังหักtoolbarเพื่อcontainทั้งportrait/landscape/square.
  ขยาย–หดหรือresizeแล้วคงสัดส่วน ไม่cropและไม่ใช้duration sliderของinputเป็นseekbar.
- Controls: play/pause, seek, elapsed/total, mute/volume, expand/fullscreen,
  downloadoriginal; loopเป็นlocalplaybackoptionได้เมื่อplayerรองรับ.
- เริ่มด้วยposter/metadata ไม่autoplayเสียง. เล่นคลิปใหม่แล้วpauseคลิปก่อนหน้า;
  ปิด/เปลี่ยนworkspaceหรือlogoutหยุดเล่นและcleanup resources.
- Expanded/collapseของคลิปเดิมรักษาcurrentTime,volumeและpausedstateเท่าที่browserรองรับ;
  หากbrowserไม่อนุญาตresumeให้แสดงPlay ไม่เล่นเสียงเอง. คงfocusreturn/Escape.
- ไม่ทำframezoom/frame-accurateeditหรือAIupscaleในรุ่นนี้.
- Privateposter/video/download/seek-rangeใช้authorized same-origin delivery;
  ไม่โหลดไฟล์videoทั้งหมดเป็นBase64หรือสร้างpublicURLแก้ปัญหาauth.
  ทดสอบexpiry/actorchangeรวมnativevideoelement; APIJSON gateอย่างเดียวไม่พิสูจน์media isolation.
- Recentมีเฉพาะcompletedที่มีassetจริง; จำกัดรายการตามAPI limit. APIปัจจุบันไม่มีcursor
  จึงระบุ“วิดีโอล่าสุด”กับทางไปประวัติเดิม ไม่เพิ่มLoad moreที่เพิ่มlimitไม่จำกัด.
  Activityยังเข้าถึงงานไม่สำเร็จ/unknownได้ ไม่ใช้successgalleryแทนlog.

## 7. Source readiness และ data ownership

| Source / owner | สิ่งที่ reuse / prerequisite |
|---|---|
| `web/src/features/generation/api/videoGenerationApi.ts`, `schemas/videoGenerationSchemas.ts` | catalog/quote/submit/gettask/recent, typedcapabilities/errors/recovery; เพิ่มrequestlookupผ่านownerก่อนreloadunknown |
| `web/src/features/playground/components/PlaygroundVideoWorkspace.tsx` | อ้างอิงsourceplan/task/quote/readiness; submission keyอยู่Reactrefจึงยังไม่ใช่durablereloadintent |
| `web/src/components/generation/VideoEngineTargetPanel.tsx` | durationrange/discrete logicและcapability-driven controls; reusebehaviorไม่copyhard-codedlimits |
| `web/src/components/media/VideoMediaPlayer.tsx` | contain/metadata/stop-other-player; wrapperต้องgateassetก่อนrenderเพราะcomponentมีemptyplaceholderเมื่อไม่มีURL |
| `web/src/features/playground/api/trustedVideoSources.ts`, generation trusted source API | sources/authorityและhandoffตามowner;ตรวจtypedDTOก่อนเพิ่มตัวเลือก |
| `server/domain/generation/VideoGenerationApplicationService.js`, `VideoProviderTaskService.js` | quote/submit/idempotency/durabletask/providerpolling; browserห้ามเรียกproviderหรือrepositoryเอง |
| `server/app/routes/videoGenerationRoutes.js` | capabilities/quote/tasks/get/recheck; ไม่มีpubliclookup-by-keyหรือrecentcursorในroutesที่ตรวจ |

**Mode readiness:** capabilityschemaมี `supportsLastFrame`/`inputModes` แต่
`VideoGenerationInput.references` ปัจจุบันรองรับroleเพียง `first_frame`/`reference_image`.
การแสดงfirst-lastหรือaudio/video-referenceinputต้องตรวจpublicDTO/sourceplan/quote/submit
ครบทั้งทางก่อน. ไม่ถือว่าflagtrueแปลว่าหน้าใหม่ส่งlastframeได้แล้ว; V01บันทึกmodeที่เปิด
ได้จริงกับownerdependencyของmodeที่ยังไม่ครบ. ห้ามลดmodeที่ใช้งานได้จริงเดิมโดยไม่มีparity evidence.

Presentationอยู่ `web-next/src/features/playground/`: `routes/VideoWorkspace.tsx`,
componentsเฉพาะVideo, hooksประสานVideo usecase, state typed/versionedVideo draftและintent.
playerอยู่ `web-next/src/components/media/`; explicitreuseผ่าน `lib/canonical.ts`.
แยกstate input/operation/selectedclip; ไม่รวมImage/Video orchestrationไว้ในhookยักษ์.
Persistเฉพาะform/IDsที่ปลอดภัยต่อactor ไม่เก็บBlob/Base64/sessiontoken/privatepayload.
Server task/repository/output pathsไม่ย้าย. SharedIdentityใช้FE24-U1: focusเดิมคงหน้า,
explicitinvalid/actorchangeหยุดprivateworkและถอดสื่อเก่า.

## 8. งานย่อยและ acceptance

งานทั้งหมด **ยังไม่เริ่ม implementation**. วางหลังComparison previewตามลำดับชุด004;
ข้อจำกัดVideoไม่ขวางการส่งมอบComparisonภาพ.

| Task / owner | Dependency | ผลที่ส่งมอบและตรวจจบได้ |
|---|---|---|
| V01 — Contract/source readiness / Backend | commonM1/U1 | ยืนยันmode/role/limit, durablekey+read-onlylookup, boundedrecent,playerprivate/range;ระบุgapก่อนทำcontrol;reviewตามinvariantที่เปลี่ยน |
| V02 — Video editor/draft / Frontend | V01,sharednavigation | `/video`,picker/mode/Promptmodal,durationrangeหรือdiscrete,ratio/audio,TH/EN;Image/Comparisondraftไม่หาย |
| V03 — Sources/handoff / Frontend | V01,V02 | upload/เลือกsource/role/cap,แก้errorหลายภาพ,Image→Videoconfirm/cancel,lateuploadguard |
| V04 — Quote/submit/recovery / Frontend | V01–V03 | stableintent,estimateตรง,canonicalsubmit/poll/check,reloadunknownไม่มีduplicate |
| V05 — Player/results/activity / Frontend | V04 taskcontract | fit/seek/expand/download,success-onlyRecent,failedlogยังอยู่,authcleanupและmediaretry |
| V06 — Scoped acceptance / QA + applicable reviewers | V02–V05 | acceptanceด้านล่าง,protectedImage/Comparison,build/browserจริงและnegativecontracts;paidUATแยก |

| ID | Acceptance |
|---|---|
| VID01 | route/menu/draftแยกครบ;back/reload/focus/TH-ENไม่ล้างdraftหรือกระโดดหน้า |
| VID02 | exactรายการ4..30แสดงslider+numbersyncเมื่อfixtureให้จริง;ค่า5/10ใช้selector;promptedไม่อ้างexact;invalidinputไม่submit |
| VID03 | Modelเปลี่ยนแล้วเก็บcompatiblefields; mode/first-last/audio/refsปรากฏเฉพาะtypedcontractรองรับ;maxจากcatalog |
| VID04 | uploadผสมsuccess/fail,removeระหว่างuploadและproviderชี้หลายภาพ แก้ได้ครบไม่มีcontrolsหายหรือlateภาพคืน |
| VID05 | Image→Video/Reuseconfirmเปลี่ยนเฉพาะค่าที่แจ้ง;cancelคงทั้งdraft;ไม่มีautoGenerate |
| VID06 | expired/out-of-orderquote,doubleclick,responseหายก่อนIDและreload ไม่ส่งซ้ำหรือใช้quoteผิด;Checkตามcooldown |
| VID07 | failed/cancelled/ไม่มีassetไม่สร้างpreviewดำ;logs/activity/taskยังอยู่;completedmediaerrorretryเฉพาะไฟล์ |
| VID08 | portrait/landscape/squarefit,seek,resize/expand,playbackstate,oneactiveplayer,downloadoriginalถูกต้อง |
| VID09 | wrongactor/sessionexpired/lateJSON/seek-range/mediaaccessถูกปฏิเสธ;logoutหยุดเสียงและล้างbytes/metadataเก่า |
| VID10 | TH/EN390/820/1440,keyboard/focusreturn/200%reflow,empty/loading/error/terminal และboundedrecentผ่าน |

Scope review รอบเอกสาร: ไล่ text→image-reference→invalidduration→quote→unknownrecovery
→providerfailหลายภาพ→แก้source→completedmediaerror→ดูงานเก่า→logout. ไม่มีprovider-paid
test,buildหรือappeditในรอบนี้; acceptanceเป็นสิ่งที่ต้องพิสูจน์หลังได้รับคำสั่งimplement.
