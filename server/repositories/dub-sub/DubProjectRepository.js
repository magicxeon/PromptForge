import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { DUB_SUB_DATA_DIR } from "../../config/paths.js";
import { mutateJsonFile, readJsonFile } from "../json/jsonFileStore.js";

export function dubError(code, statusCode = 400) {
  return Object.assign(new Error(code), { code, statusCode });
}

export class DubProjectRepository {
  constructor(root = DUB_SUB_DATA_DIR) {
    this.root = root;
  }

  actorDirectory(actor) {
    if (!actor?.userId) throw dubError("dub_actor_required", 401);
    const key = createHash("sha256").update(actor.userId).digest("hex");
    return path.join(this.root, key);
  }

  file(actor) {
    return path.join(this.actorDirectory(actor), "projects.json");
  }

  directory(actor, id) {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw dubError("dub_project_missing", 404);
    return path.join(this.actorDirectory(actor), id);
  }

  async get(actor, id) {
    const projects = await readJsonFile(this.file(actor), []);
    const project = projects.find((item) => item.id === id);
    if (!project) throw dubError("dub_project_missing", 404);
    return project;
  }

  async list(actor, query = {}) {
    const all = await readJsonFile(this.file(actor), []);
    const projects = all.filter(
      (project) => !project.archived || query.archived === "true",
    );
    projects.sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
    );
    const start = query.cursor
      ? projects.findIndex((item) => item.id === query.cursor) + 1
      : 0;
    if (query.cursor && !start) throw dubError("dub_invalid_cursor");
    const limit = Math.min(
      50,
      Math.max(1, Math.floor(Number(query.limit) || 20)),
    );
    const items = projects.slice(start, start + limit);
    const hasMore = start + limit < projects.length;
    return { items, hasMore, nextCursor: hasMore ? items.at(-1).id : null };
  }

  create(actor, data) {
    return mutateJsonFile(this.file(actor), [], (projects) => {
      if (projects.length >= 500) throw dubError("dub_project_limit", 409);
      const now = new Date().toISOString();
      const project = {
        id: randomUUID(),
        revision: 1,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      projects.push(project);
      return project;
    });
  }

  mutate(actor, id, revision, apply, changeRevision = true) {
    return mutateJsonFile(this.file(actor), [], async (projects) => {
      const project = projects.find((item) => item.id === id);
      if (!project) throw dubError("dub_project_missing", 404);
      if (
        (changeRevision || revision !== null) &&
        revision !== project.revision
      )
        throw dubError("dub_revision_conflict", 409);
      await apply(project);
      if (changeRevision) project.revision++;
      project.updatedAt = new Date().toISOString();
      return project;
    });
  }
}
