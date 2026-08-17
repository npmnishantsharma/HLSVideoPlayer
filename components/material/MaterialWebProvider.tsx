"use client";

import "@material/web/all.js";

export default function MaterialWebProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}