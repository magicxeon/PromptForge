import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProcessingSpinner } from "../../lib/canonical";
import { Projects } from "./Projects";
import "./studio.css";

const Editor = lazy(() => import("./Editor"));

export default function DubStudio() {
  return (
    <main className="dub-studio">
      <Suspense fallback={<ProcessingSpinner />}>
        <Routes>
          <Route index element={<Projects />} />
          <Route path="projects/:id" element={<Editor />} />
          <Route path="voice" element={<Navigate replace to="/dub-sub" />} />
        </Routes>
      </Suspense>
    </main>
  );
}
