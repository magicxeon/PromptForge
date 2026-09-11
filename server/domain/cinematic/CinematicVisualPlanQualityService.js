import { storyboardKeyframeContractCompiler } from './StoryboardKeyframeContractCompiler.js';

const QUALITY_CONTRACT_VERSION = 'cinematic-visual-plan-quality-v1';

const FINDING_DEFINITIONS = Object.freeze({
  missing_shot_authority: {
    summary: 'The Shot is missing required visible keyframe authority.',
    recommendation: 'Provide one exact visible moment, one visible action and one emotional target.',
    repairable: true
  },
  multiple_visible_actions: {
    summary: 'The Shot contains more than one visible action phase.',
    recommendation: 'Keep only the single action state visible in this keyframe.',
    repairable: true
  },
  first_shot_non_establishing: {
    summary: 'The first Shot does not establish the subject and location.',
    recommendation: 'Use an establishing opening unless a limited insert is dramatically necessary.',
    repairable: true
  },
  future_emotional_state_leakage: {
    summary: 'The Shot uses an emotional state that belongs later in the Scene.',
    recommendation: 'Show only the emotional state visible at this exact moment.',
    repairable: true
  },
  unexplained_interior_weather: {
    summary: 'Interior wetness is not physically explained by the authored location.',
    recommendation: 'Keep the interior dry and place rain, puddles and wet reflections outside unless a leak or open entrance is explicit.',
    repairable: true
  },
  character_identity_not_ready: {
    summary: 'A selected Character does not have ready identity authority.',
    recommendation: 'Complete the Character identity in Cast before Storyboard generation.',
    repairable: false
  },
  look_authority_not_ready: {
    summary: 'A selected Character Look is not locked and ready.',
    recommendation: 'Approve and bind the Character Look in Cast.',
    repairable: false
  },
  cast_authority_missing: {
    summary: 'The Shot references Cast authority that is unavailable.',
    recommendation: 'Assign active Project Cast to the Scene and Shot.',
    repairable: false
  },
  duplicate_moment_and_action: {
    summary: 'The exact moment and visible action repeat the same description.',
    recommendation: 'Describe the frozen composition as the moment and one observable gesture as the action.',
    repairable: true
  },
  non_visual_action: {
    summary: 'The primary action cannot be read reliably from one still image.',
    recommendation: 'Replace internal or temporal behavior with one visible pose, gesture or prop interaction.',
    repairable: true
  },
  framing_performance_mismatch: {
    summary: 'The performance direction refers to body or facial detail outside the selected framing.',
    recommendation: 'Express emotion through anatomy that is visible in this framing.',
    repairable: true
  },
  motion_instruction_in_still: {
    summary: 'Temporal movement is written as a still-image screen-direction instruction.',
    recommendation: 'Describe current body orientation and screen geography; keep movement for video direction.',
    repairable: true
  },
  future_prop_action_leakage: {
    summary: 'The prop state includes an action that happens before or after this keyframe.',
    recommendation: 'Describe only each prop and hand state visible in the current frame.',
    repairable: true
  },
  diegetic_text_conflict: {
    summary: 'A blanket no-text instruction conflicts with authorized text on a visible story prop.',
    recommendation: 'Forbid captions and watermarks while explicitly allowing only the required diegetic prop text.',
    repairable: true
  }
});

export class CinematicVisualPlanQualityService {
  constructor({ keyframeCompiler = storyboardKeyframeContractCompiler } = {}) {
    this.keyframeCompiler = keyframeCompiler;
  }

  evaluate(project, plan) {
    const proposalProject = createProposalProject(project, plan);
    const findings = [];
    for (const scene of plan?.scenes || []) {
      for (const shot of scene.shots || []) {
        const contract = this.keyframeCompiler.compile({ project: proposalProject, scene, shot });
        for (const item of contract.findings || []) {
          findings.push(normalizeCompilerFinding(item, scene, shot));
        }
        findings.push(...evaluateCrossFieldRules(plan, scene, shot));
      }
    }
    const normalized = deduplicateFindings(findings);
    return {
      contractVersion: QUALITY_CONTRACT_VERSION,
      status: normalized.some(item => item.severity === 'blocking')
        ? 'blocked'
        : normalized.length ? 'ready_with_warnings' : 'ready',
      findingCount: normalized.length,
      repairableCount: normalized.filter(item => item.repairable).length,
      findings: normalized
    };
  }
}

function createProposalProject(project, plan) {
  const planVersionId = `proposal:${project.id}`;
  return {
    ...project,
    scenes: structuredClone(plan?.scenes || []),
    activeStoryPlanVersionId: planVersionId,
    storyPlanVersions: [{
      id: planVersionId,
      beats: structuredClone(plan?.beats || []),
      sceneIds: (plan?.scenes || []).map(scene => scene.id)
    }]
  };
}

function normalizeCompilerFinding(item, scene, shot) {
  const definition = FINDING_DEFINITIONS[item.code] || {
    summary: humanizeCode(item.code),
    recommendation: 'Review this Shot before Storyboard generation.',
    repairable: item.severity !== 'blocking'
  };
  return finding(item.code, item.severity, definition.repairable, scene, shot, [item.fieldPath], definition);
}

function evaluateCrossFieldRules(plan, scene, shot) {
  const findings = [];
  if (shot.openingFrameVersion === 1 && scene.artDirection !== undefined) {
    const missing = [!String(scene.artDirection).trim() ? 'scene.artDirection' : null,
      ...['framing', 'cameraAngle', 'lensIntent', 'cameraMovement', 'lighting', 'environment'].filter(field => !String(shot[field] || (field === 'lighting' ? scene.lighting : '') || '').trim()).map(field => `shot.${field}`)].filter(Boolean);
    if (missing.length) findings.push(finding('directed_opening_incomplete', 'warning', true, scene, shot, missing, {
      summary: 'The generated opening is missing concrete visual direction.',
      recommendation: 'Supply art direction, framing, lens, motivated light and spatial environment for this opening.'
    }));
  }
  const moment = normalized(shot.visibleMoment);
  const action = normalized(shot.subjectAction);
  if (moment && action && (moment === action || (Math.min(moment.length, action.length) >= 18
    && (moment.includes(action) || action.includes(moment))))) {
    findings.push(finding('duplicate_moment_and_action', 'warning', true, scene, shot,
      ['shot.visibleMoment', 'shot.subjectAction']));
  }
  if (shot.openingFrameVersion !== 1 && isNonVisualAction(shot.subjectAction)) {
    findings.push(finding('non_visual_action', 'warning', true, scene, shot, ['shot.subjectAction']));
  }
  if (hasFramingPerformanceMismatch(shot)) {
    findings.push(finding('framing_performance_mismatch', 'warning', true, scene, shot,
      ['shot.framing', 'shot.performanceCue', 'shot.performance', 'shot.gaze']));
  }
  if (hasTemporalScreenDirection(scene.screenDirection)) {
    findings.push(finding('motion_instruction_in_still', 'warning', true, scene, shot,
      ['scene.screenDirection']));
  }
  if (hasFuturePropState(scene.propContinuity)) {
    findings.push(finding('future_prop_action_leakage', 'warning', true, scene, shot,
      ['scene.propContinuity']));
  }
  if (hasDiegeticTextConflict(plan, scene, shot)) {
    findings.push(finding('diegetic_text_conflict', 'warning', true, scene, shot,
      ['plan.onScreenTextPolicy', 'scene.propContinuity', 'shot.visibleMoment', 'shot.prompt']));
  }
  return findings;
}

function isNonVisualAction(value) {
  const text = normalized(value);
  if (!text) return false;
  const internalOrHeld = /(breath|breathe|breathing|wait|waiting|stand(?:ing)? still|remain(?:s)? still|หายใจ|ยืนนิ่ง|รอ|นิ่งเฉย)/u.test(text);
  const visibleGesture = /(hand|finger|shoulder|head|body|hold|grip|clench|reach|touch|turn|walk|step|sit|kneel|มือ|นิ้ว|ไหล่|ศีรษะ|ร่าง|ถือ|กำ|จับ|เอื้อม|แตะ|หัน|เดิน|ก้าว|นั่ง|คุกเข่า)/u.test(text);
  return internalOrHeld && !visibleGesture;
}

function hasFramingPerformanceMismatch(shot) {
  const framing = normalized(`${shot.framing || ''} ${shot.visibleMoment || ''}`);
  const performance = normalized(`${shot.performanceCue || ''} ${shot.performance || ''} ${shot.gaze || ''}`);
  const handOnly = /(hand(?:s)? close|close-up (?:of )?(?:the )?hand|insert.*hand|ระดับมือ|โคลสอัปมือ|มือ.*ระยะใกล้)/u.test(framing);
  const faceOnlyDirection = /(eye|eyes|gaze|tear|tears|smile|jaw|face|สายตา|ดวงตา|น้ำตา|ยิ้ม|กราม|ใบหน้า)/u.test(performance);
  return handOnly && faceOnlyDirection;
}

function hasTemporalScreenDirection(value) {
  const text = normalized(value);
  return /(camera (?:moves|tracks|pans|dollies)|movement|moving|move from|track from|pan from|เคลื่อน|เลื่อนกล้อง|แพน|ดอลลี่)/u.test(text);
}

function hasFuturePropState(value) {
  const text = normalized(value);
  return /\b(?:and then|then|before|after|until)\b|(?:แล้ว|จากนั้น|ก่อนจะ|หลังจาก|จน(?:กระทั่ง)?)/u.test(text);
}

function hasDiegeticTextConflict(plan, scene, shot) {
  const policy = normalized(`${plan?.onScreenTextPolicy || ''} ${shot.prompt || ''}`);
  const blanketNoText = /\b(?:no text|text[- ]free|without text|forbid all text)\b|(?:ไม่มีข้อความ|ห้ามมีข้อความ|ปราศจากข้อความ)/u.test(policy);
  if (!blanketNoText) return false;
  const visible = `${scene.propContinuity || ''} ${shot.visibleMoment || ''} ${shot.environment || ''} ${shot.prompt || ''}`;
  return /\b(?:sign|label|letter|menu|screen|closed|open)\b|(?:ป้าย|ฉลาก|จดหมาย|เมนู|หน้าจอ|ข้อความ)/iu.test(visible);
}

function finding(code, severity, repairable, scene, shot, fieldPaths, override = null) {
  const definition = override || FINDING_DEFINITIONS[code];
  return {
    code,
    severity: severity === 'blocking' ? 'blocking' : 'warning',
    repairable: repairable === true,
    sceneId: scene.id,
    sceneTitle: String(scene.title || '').trim(),
    shotId: shot.id,
    shotTitle: String(shot.title || '').trim(),
    fieldPaths: [...new Set(fieldPaths.filter(Boolean))],
    summary: definition?.summary || humanizeCode(code),
    recommendation: definition?.recommendation || 'Review this Shot before Storyboard generation.'
  };
}

function deduplicateFindings(findings) {
  const seen = new Set();
  return findings.filter(item => {
    const key = `${item.code}:${item.sceneId}:${item.shotId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function humanizeCode(value) {
  return String(value || 'visual_contract_issue').replaceAll('_', ' ');
}

function normalized(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US');
}

export const cinematicVisualPlanQualityService = new CinematicVisualPlanQualityService();
