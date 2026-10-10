"use client";

import { AGENT_CODE, SERVER_CODE, SIM_STEPS } from "@/lib/constants/landing";
import { useCallback, useRef, useState } from "react";
import { CodeLine } from "./code-line";

export function Terminal() {
  const [activeTab, setActiveTab] = useState<"server" | "agent">("server");
  const [simState, setSimState] = useState<"idle" | "running" | "done">("idle");
  const [simLines, setSimLines] = useState<number[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runSim = useCallback(() => {
    if (simState === "running") return;
    setSimState("running");
    setSimLines([]);
    SIM_STEPS.forEach((step, i) => {
      const id = setTimeout(() => {
        setSimLines((prev) => [...prev, i]);
        if (i === SIM_STEPS.length - 1) setSimState("done");
      }, step.delay);
      timeoutsRef.current.push(id);
    });
  }, [simState]);

  const reset = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setSimState("idle");
    setSimLines([]);
    setActiveTab("server");
  };

  const isSimulating = simState !== "idle";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 40px rgba(0,212,170,0.06)",
      }}
    >
      {/* Title bar — always visible, tabs always shown */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: "#161b22",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[
              "rgba(248,113,113,0.4)",
              "rgba(251,191,36,0.4)",
              "rgba(74,222,128,0.4)",
            ].map((c, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-0.5">
            {(["server", "agent"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => !isSimulating && setActiveTab(tab)}
                className="font-mono text-[10px] uppercase tracking-wider px-3 py-1 border-none transition-all"
                style={{
                  cursor: isSimulating ? "default" : "pointer",
                  background:
                    activeTab === tab ? "rgba(0,212,170,0.1)" : "transparent",
                  color:
                    activeTab === tab ? "#00d4aa" : "rgba(169,171,178,0.5)",
                  borderBottom:
                    activeTab === tab
                      ? "1px solid #00d4aa"
                      : "1px solid transparent",
                  borderRadius: "3px 3px 0 0",
                }}
              >
                {tab}.ts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code area — fixed height, content swaps between code and simulation */}
      <div
        className="p-4 font-mono text-[12.5px] leading-[1.7] overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ background: "#0d1117", height: "220px" }}
      >
        {!isSimulating ? (
          /* Code view */
          (activeTab === "server" ? SERVER_CODE : AGENT_CODE).map((line, i) => (
            <CodeLine key={i} tokens={line} />
          ))
        ) : (
          /* Simulation view — replaces code entirely */
          <div>
            <div
              className="text-[10px] mb-2.5 tracking-widest"
              style={{ color: "#6e7681" }}
            >
              // x402 payment handshake · live
            </div>
            {SIM_STEPS.map((step, i) =>
              simLines.includes(i) ? (
                <div
                  key={i}
                  className="leading-[1.9]"
                  style={{
                    color: step.color,
                    fontWeight: step.bold ? 700 : 400,
                    fontSize: 12,
                    animation: "slide-in 0.3s ease both",
                  }}
                >
                  {step.text}
                </div>
              ) : null,
            )}
            {simState === "running" && (
              <span
                className="inline-block w-1.5 h-3.5 mt-1 align-middle"
                style={{
                  background: "#00d4aa",
                  animation: "pulse-dot 0.8s ease infinite",
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: "#161b22",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          {simState === "idle" && (
            <button
              onClick={runSim}
              className="flex items-center gap-2 px-4 py-1.5 rounded font-mono text-[11px] cursor-pointer transition-all"
              style={{
                background: "rgba(0,212,170,0.1)",
                border: "1px solid rgba(0,212,170,0.2)",
                color: "#00d4aa",
              }}
            >
              ▶ Run Simulation
            </button>
          )}
          {simState === "running" && (
            <span
              className="font-mono text-[11px] flex items-center gap-2"
              style={{ color: "#00d4aa" }}
            >
              <span style={{ animation: "pulse-dot 1s ease infinite" }}>●</span>{" "}
              Running…
            </span>
          )}
          {simState === "done" && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-2 lg:px-4 py-1.5 rounded font-mono text-[11px] cursor-pointer transition-all"
              style={{
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.2)",
                color: "#4ade80",
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>
        {simState === "done" && (
          <span
            className="font-mono text-[10px] tracking-wide"
            style={{ color: "#4ade80" }}
          >
            ✓ $0.01 settled on Arc · split 99 / 1
          </span>
        )}
      </div>
    </div>
  );
}
