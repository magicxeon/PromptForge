export function projectVideoDirection(project) {
  return String(project.videoDirection ?? project.setup?.videoDirection ?? '').trim();
}

export function withProjectVideoDirection(prompt, direction) {
  if (!direction) return prompt;
  const block = `PROJECT VIDEO DIRECTION\n${direction}\nApply these defaults unless this Shot explicitly overrides them. Do not change reference identities or technical constraints.`;
  return prompt.includes(block) ? prompt : `${block}\n\n${prompt}`;
}
