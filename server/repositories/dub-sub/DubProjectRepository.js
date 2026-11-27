import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
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

  async sceneSource(actor, project) {
    const directory = await this.checkedRemovalDirectory(actor, project.id);
    const folder = project.media?.folder;
    if (folder !== "source" && !/^[0-9a-f-]{36}$/i.test(folder))
      throw dubError("dub_storage_unavailable", 503);
    const source = path.join(directory, folder, "media");
    if (await fs.realpath(source) !== source || !(await fs.stat(source)).isFile())
      throw dubError("dub_storage_unavailable", 503);
    return source;
  }

  async sceneReceiptFile(actor, id) {
    const directory = await this.checkedRemovalDirectory(actor, id);
    const file = path.join(directory, "scene-previews.json");
    const stat = await fs.lstat(file).catch(error => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    if (stat && !stat.isFile()) throw dubError("dub_storage_unavailable", 503);
    return file;
  }

  async sceneReceipts(actor, id, apply) {
    return mutateJsonFile(await this.sceneReceiptFile(actor, id), [], apply);
  }

  async readSceneReceipts(actor, id) {
    return readJsonFile(await this.sceneReceiptFile(actor, id), []);
  }

  async get(actor, id, { includePendingDeletion = false } = {}) {
    const projects = await readJsonFile(this.file(actor), []);
    const project = projects.find((item) => item.id === id);
    if (!project) throw dubError("dub_project_missing", 404);
    if (project.deletionPending && !includePendingDeletion)
      throw dubError("dub_deletion_pending", 409);
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
      if (project.deletionPending) throw dubError("dub_deletion_pending", 409);
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

  async checkedRemovalDirectory(actor, id) {
    const directory = this.directory(actor, id);
    // A replaced actor directory must never redirect removal to another owner.
    const root = await fs.realpath(this.root);
    const owner = await fs.realpath(this.actorDirectory(actor));
    if (owner !== path.join(root, path.basename(this.actorDirectory(actor))))
      throw dubError("dub_storage_unavailable", 503);
    const resolved = await fs.realpath(directory).catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return null; // Drafts without an upload have no private files.
    });
    if (resolved && resolved !== path.join(owner, id))
      throw dubError("dub_storage_unavailable", 503);
    return directory;
  }

  beginDeletion(actor, id, revision, reauthorize) {
    return mutateJsonFile(this.file(actor), [], async (projects) => {
      const project = projects.find((item) => item.id === id);
      if (!project) throw dubError("dub_project_missing", 404);
      if (project.revision !== revision) throw dubError("dub_revision_conflict", 409);
      await reauthorize();
      project.deletionPending = true;
    });
  }

  async removePrivateFiles(actor, id) {
    const directory = await this.checkedRemovalDirectory(actor, id);
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 2 });
  }

  finishDeletion(actor, id, revision) {
    return mutateJsonFile(this.file(actor), [], (projects) => {
      const index = projects.findIndex((item) => item.id === id);
      if (index < 0) throw dubError("dub_project_missing", 404);
      if (!projects[index].deletionPending || projects[index].revision !== revision)
        throw dubError("dub_revision_conflict", 409);
      projects.splice(index, 1);
    });
  }
}
