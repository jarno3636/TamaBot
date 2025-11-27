// components/HomeClient.tsx (temporarily)
"use client";

export default function HomeClient() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      Basebots debug: if you see this in Base, the original HomeClient is crashing.
    </div>
  );
}
