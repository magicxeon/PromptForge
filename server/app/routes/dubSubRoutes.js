import { promises as fs, constants } from "node:fs";
import { pipeline } from "node:stream/promises";
import { publicDubError } from "../../domain/dub-sub/DubProjectService.js";

function fail(res, error) {
  if (res.headersSent) return res.destroy();
  const code = publicDubError(error);
  return res
    .status(
      error.statusCode ||
        (error.code === "auth_session_expired"
          ? 401
          : error.code === "ENOENT"
            ? 404
            : 500),
    )
    .json({ code, error: code });
}
function verifyIdentity(req) {
  return async () => {
    const current = await req.reauthorizeIdentity?.();
    if (
      !req.actorContext?.userId ||
      current?.userId !== req.actorContext.userId
    )
      throw Object.assign(new Error(), {
        code: "auth_session_expired",
        statusCode: 401,
      });
    return current;
  };
}
async function sendPrivate(req, res, file) {
  const verify = verifyIdentity(req);
  await verify();
  const handle = await fs.open(
    file.path,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
  );
  try {
    const { size } = await handle.stat();
    const range = req.headers.range;
    let start = 0,
      end = size - 1;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m && (m[1] || m[2])) {
        start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
        end = m[1] && m[2] ? Math.min(end, Number(m[2])) : end;
      } else start = size;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        end < start ||
        start >= size
      ) {
        res
          .set("Content-Range", "bytes */" + size)
          .status(416)
          .end();
        return;
      }
      res
        .set("Content-Range", "bytes " + start + "-" + end + "/" + size)
        .status(206);
    }
    res.set({
      "Content-Type": file.type,
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
    });
    if (file.filename)
      res.set(
        "Content-Disposition",
        'attachment; filename="' + file.filename + '"',
      );
    if (req.method === "HEAD" || !size) return res.end();
    await pipeline(
      handle.createReadStream({ start, end, autoClose: false }),
      async function* (chunks) {
        for await (const chunk of chunks) {
          await verify();
          yield chunk;
        }
      },
      res,
    );
  } finally {
    await handle.close();
  }
}

export function registerDubSubRoutes(app, { projects }) {
  const base = "/api/dub-sub/projects";
  app.use(base, (req, res, next) => {
    res.set({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (!req.actorContext?.userId)
      return res.status(401).json({ code: "dub_actor_required" });
    next();
  });
  const route = (method, suffix, run) =>
    app[method](base + suffix, async (req, res) => {
      try {
        const result = await run(
          req,
          req.actorContext,
          req.params.id,
          req.body || {},
        );
        await verifyIdentity(req)();
        res.json(result);
      } catch (error) {
        fail(res, error);
      }
    });
  route("get", "", (req, actor) => projects.list(actor, req.query));
  route("post", "", (req, actor, id, body) =>
    projects.create(actor, body, verifyIdentity(req)),
  );
  route("get", "/:id", (req, actor, id) => projects.get(actor, id));
  route("post", "/:id/dubbing-timing-review", (req, actor, id, body) =>
    projects.timingReview(actor,id,body,verifyIdentity(req)));
  route("post", "/:id/cue-rhythm", (req, actor, id, body) =>
    projects.cueRhythm(actor,id,body,verifyIdentity(req)));
  route("get", "/:id/dubbing-batches", (req, actor, id) => projects.batches.get(actor, id, req.query.language));
  route("post", "/:id/dubbing-batches", (req, actor, id, body) =>
    projects.batches.prepare(actor, id, body, verifyIdentity(req)));
  route("post", "/:id/dubbing-batches/:batchId/advance", (req, actor, id, body) =>
    projects.batches.advance(actor, id, req.params.batchId, body, verifyIdentity(req)));
  route("patch", "/:id", (req, actor, id, body) =>
    projects.update(actor, id, body),
  );
  route("delete", "/:id", (req, actor, id, body) =>
    projects.remove(actor, id, body, verifyIdentity(req)),
  );
  route("put", "/:id/media", (req, actor, id) =>
    projects.upload(actor, id, req, verifyIdentity(req)),
  );
  for (const kind of ["transcribe", "translate", "exports"]) {
    route("post", "/:id/" + kind, (req, actor, id, body) =>
      kind === "transcribe" && body.preview === true
        ? projects.review(actor, id, kind, body, verifyIdentity(req))
        : projects.perform(actor, id, kind, body, verifyIdentity(req)),
    );
  }
  route("post", "/:id/ocr", (req, actor, id, body) =>
    projects.review(actor, id, "ocr", body, verifyIdentity(req)),
  );
  app.post(base + "/:id/preview", async (req, res) => {
    try {
      const result = await projects.review(
        req.actorContext,
        req.params.id,
        "preview",
        req.body || {},
        verifyIdentity(req),
      );
      await verifyIdentity(req)();
      res.type("png").send(result);
    } catch (error) {
      fail(res, error);
    }
  });
  for (const [suffix, kind] of [
    ["media", "media"],
    ["peaks", "peaks"],
    ["poster", "poster"],
    ["exports/:exportId", "export"],
  ]) {
    app.get(base + "/:id/" + suffix, async (req, res) => {
      try {
        await projects.withFile(
          req.actorContext,
          req.params.id,
          kind,
          req.params.exportId,
          (file) => sendPrivate(req, res, file),
        );
      } catch (error) {
        fail(res, error);
      }
    });
  }
}
