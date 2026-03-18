"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import Container from "../../components/Container";
import SectionHeader from "../../components/SectionHeader";
import Card from "../../components/Card";
import { fetchJson } from "../../lib/api";

/* ── Feature config ─────────────────────────────────── */
const numericFeatures = [
  "time_in_hospital",
  "num_medications",
  "num_lab_procedures",
  "num_procedures",
  "number_outpatient",
  "number_emergency",
  "number_inpatient",
];

const featureLabels: Record<string, string> = {
  time_in_hospital: "Days in hospital",
  num_lab_procedures: "Lab procedures",
  num_procedures: "Procedures",
  num_medications: "Medications",
  number_outpatient: "Prior outpatient visits",
  number_emergency: "Prior ER visits",
  number_inpatient: "Prior inpatient stays",
};

interface RiskSurfaceResponse {
  feature_x: string;
  feature_y: string;
  x_values: number[];
  y_values: number[];
  z_matrix: number[][];
}

/* ── Color: 4-stop gradient for more wow ────────────── */
const C1 = new THREE.Color("#06b6d4"); // cyan
const C2 = new THREE.Color("#8b5cf6"); // violet
const C3 = new THREE.Color("#ec4899"); // pink
const C4 = new THREE.Color("#ef4444"); // red

function colorFromNormalized(t: number): THREE.Color {
  if (t < 0.33) {
    const s = t / 0.33;
    return new THREE.Color().lerpColors(C1, C2, s);
  }
  if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    return new THREE.Color().lerpColors(C2, C3, s);
  }
  const s = (t - 0.66) / 0.34;
  return new THREE.Color().lerpColors(C3, C4, s);
}

/* ── Glow plane under surface ───────────────────────── */
function GlowPlane() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial color="#06b6d4" transparent opacity={0.03} />
    </mesh>
  );
}

/* ── Slow auto-rotate ───────────────────────────────── */
function AutoRotate({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.6;
      controlsRef.current.update();
    }
  });
  return null;
}

/* ── 3D Surface mesh ────────────────────────────────── */
function SurfaceMesh({ data, onHover }: { data: RiskSurfaceResponse; onHover: (info: string | null) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, pointer } = useThree();

  const { geometry, zMin, zMax, zRange } = useMemo(() => {
    const steps = data.x_values.length;
    const sz = 2.8;
    const plane = new THREE.PlaneGeometry(sz, sz, steps - 1, steps - 1);
    const positions = plane.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);

    const flatZ = data.z_matrix.flat();
    const zMin = Math.min(...flatZ);
    const zMax = Math.max(...flatZ);
    const zRange = Math.max(0.0001, zMax - zMin);

    let index = 0;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const z = data.z_matrix[i][j];
        const norm = (z - zMin) / zRange;
        positions.setZ(index, norm * 1.0);
        const color = colorFromNormalized(norm);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
        index++;
      }
    }
    plane.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    plane.computeVertexNormals();
    return { geometry: plane, zMin, zMax, zRange };
  }, [data]);

  useFrame(() => {
    if (!meshRef.current) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(meshRef.current);
    if (hits.length > 0) {
      const uv = hits[0].uv;
      if (uv) {
        const steps = data.x_values.length;
        const xi = Math.min(steps - 1, Math.floor(uv.x * steps));
        const yi = Math.min(steps - 1, Math.floor(uv.y * steps));
        const val = data.z_matrix[xi]?.[yi];
        if (val !== undefined) {
          const xVal = data.x_values[xi]?.toFixed(0);
          const yVal = data.y_values[yi]?.toFixed(0);
          onHover(`${featureLabels[data.feature_x]}: ${xVal}  ·  ${featureLabels[data.feature_y]}: ${yVal}  →  ${(val * 100).toFixed(1)}% risk`);
        }
      }
    } else {
      onHover(null);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation-x={-Math.PI / 2}>
      <meshPhysicalMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.15}
        clearcoat={0.4}
        clearcoatRoughness={0.2}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

/* ── Axis lines + labels ────────────────────────────── */
function Axes({ data }: { data: RiskSurfaceResponse }) {
  const xLabel = featureLabels[data.feature_x];
  const yLabel = featureLabels[data.feature_y];
  const sz = 1.4;
  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 500,
    color: "rgba(255,255,255,0.45)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    fontFamily: "-apple-system, system-ui, sans-serif",
    letterSpacing: "0.02em",
  };

  const points = {
    x: [new THREE.Vector3(-sz, 0, sz), new THREE.Vector3(sz, 0, sz)],
    y: [new THREE.Vector3(-sz, 0, sz), new THREE.Vector3(-sz, 0, -sz)],
    z: [new THREE.Vector3(-sz, 0, sz), new THREE.Vector3(-sz, 1.1, sz)],
  };

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([...points.x[0].toArray(), ...points.x[1].toArray()]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#444" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([...points.y[0].toArray(), ...points.y[1].toArray()]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#444" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([...points.z[0].toArray(), ...points.z[1].toArray()]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#333" />
      </line>

      <Html position={[0, -0.08, sz + 0.2]} center>
        <span style={labelStyle}>{xLabel}</span>
      </Html>
      <Html position={[-sz - 0.2, -0.08, 0]} center>
        <span style={labelStyle}>{yLabel}</span>
      </Html>
      <Html position={[-sz - 0.25, 0.6, sz]} center>
        <span style={{ ...labelStyle, fontSize: "10px" }}>Risk ↑</span>
      </Html>
    </group>
  );
}

/* ── 2D Heatmap ─────────────────────────────────────── */
function Heatmap({ data }: { data: RiskSurfaceResponse }) {
  const steps = data.x_values.length;
  const flatZ = data.z_matrix.flat();
  const zMin = Math.min(...flatZ);
  const zMax = Math.max(...flatZ);
  const zRange = Math.max(0.0001, zMax - zMin);
  const cellSize = Math.min(18, Math.floor(440 / steps));

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-y-label">{featureLabels[data.feature_y]} →</div>
      <div>
        <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${steps}, ${cellSize}px)`, gridTemplateRows: `repeat(${steps}, ${cellSize}px)` }}>
          {data.z_matrix.map((row, i) =>
            row.map((z, j) => {
              const norm = (z - zMin) / zRange;
              const color = colorFromNormalized(norm);
              return (
                <div
                  key={`${i}-${j}`}
                  className="heatmap-cell"
                  style={{ background: `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})` }}
                  title={`${featureLabels[data.feature_x]}: ${data.x_values[i].toFixed(0)}, ${featureLabels[data.feature_y]}: ${data.y_values[j].toFixed(0)} → ${(z * 100).toFixed(1)}%`}
                />
              );
            })
          )}
        </div>
        <div className="heatmap-x-label">{featureLabels[data.feature_x]} →</div>
      </div>
    </div>
  );
}

/* ── Insights ───────────────────────────────────────── */
function Insights({ data }: { data: RiskSurfaceResponse }) {
  const flatZ = data.z_matrix.flat();
  const zMin = Math.min(...flatZ);
  const zMax = Math.max(...flatZ);
  const xLabel = featureLabels[data.feature_x];
  const yLabel = featureLabels[data.feature_y];
  const steps = data.x_values.length;
  let maxI = 0, maxJ = 0, minI = 0, minJ = 0;
  for (let i = 0; i < steps; i++) for (let j = 0; j < steps; j++) {
    if (data.z_matrix[i][j] > data.z_matrix[maxI][maxJ]) { maxI = i; maxJ = j; }
    if (data.z_matrix[i][j] < data.z_matrix[minI][minJ]) { minI = i; minJ = j; }
  }

  return (
    <div className="insights">
      <div className="insight-item">
        <span className="insight-icon" style={{ background: "#ef4444" }} />
        <div>
          <strong>Peak risk: {(zMax * 100).toFixed(0)}%</strong>
          <p>When {xLabel.toLowerCase()} ≈ {data.x_values[maxI].toFixed(0)} and {yLabel.toLowerCase()} ≈ {data.y_values[maxJ].toFixed(0)}</p>
        </div>
      </div>
      <div className="insight-item">
        <span className="insight-icon" style={{ background: "#06b6d4" }} />
        <div>
          <strong>Lowest risk: {(zMin * 100).toFixed(0)}%</strong>
          <p>When {xLabel.toLowerCase()} ≈ {data.x_values[minI].toFixed(0)} and {yLabel.toLowerCase()} ≈ {data.y_values[minJ].toFixed(0)}</p>
        </div>
      </div>
      <div className="insight-item">
        <span className="insight-icon" style={{ background: "#8b5cf6" }} />
        <div>
          <strong>{((zMax - zMin) * 100).toFixed(0)} point spread</strong>
          <p>These two variables together account for this much variation in predicted risk</p>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function RiskSurfacePage() {
  const [featureX, setFeatureX] = useState("time_in_hospital");
  const [featureY, setFeatureY] = useState("num_medications");
  const [data, setData] = useState<RiskSurfaceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"3d" | "heatmap">("3d");
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);
  const sameFeature = featureX === featureY;

  const handleGenerate = async () => {
    if (sameFeature) { setError("Pick two different variables."); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<RiskSurfaceResponse>(
        `/risk-surface?feature_x=${featureX}&feature_y=${featureY}&steps=30`,
      );
      setData(payload);
    } catch (err: any) {
      setError(err.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  const handleHover = useCallback((info: string | null) => setHoverInfo(info), []);

  return (
    <Container>
      <SectionHeader
        title="Risk Landscape"
        subtitle="Pick two patient variables and see how they shape readmission risk together."
      />

      <Card>
        <div className="form-grid">
          <div className="field">
            <label>First variable</label>
            <select value={featureX} onChange={(e) => setFeatureX(e.target.value)}>
              {numericFeatures.map((f) => <option key={f} value={f}>{featureLabels[f]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Second variable</label>
            <select value={featureY} onChange={(e) => setFeatureY(e.target.value)}>
              {numericFeatures.map((f) => <option key={f} value={f}>{featureLabels[f]}</option>)}
            </select>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button" type="button" onClick={handleGenerate} disabled={loading || sameFeature}>
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </Card>

      {sameFeature && <div className="notice" style={{ marginTop: "1rem" }}>Pick two different variables.</div>}
      {error && <div className="notice" style={{ marginTop: "1rem" }}>{error}</div>}

      {data ? (
        <>
          <div className="view-toggle">
            <button className={`toggle-btn ${view === "3d" ? "active" : ""}`} onClick={() => setView("3d")}>3D Surface</button>
            <button className={`toggle-btn ${view === "heatmap" ? "active" : ""}`} onClick={() => setView("heatmap")}>2D Heatmap</button>
          </div>

          <div className="surface-card-wrapper">
            <Card>
              <div className="surface-frame-hero">
                {view === "3d" ? (
                  <Canvas camera={{ position: [3.2, 2.2, 3.2], fov: 35 }} dpr={[1, 2]}>
                    <color attach="background" args={["#050507"]} />
                    <fog attach="fog" args={["#050507", 6, 14]} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 8, 4]} intensity={1.0} color="#fff" />
                    <pointLight position={[-3, 3, -3]} intensity={0.3} color="#8b5cf6" />
                    <pointLight position={[3, 1, 3]} intensity={0.2} color="#06b6d4" />
                    <GlowPlane />
                    <gridHelper args={[3.2, 16, "#1a1a2e", "#111122"]} position={[0, -0.01, 0]} />
                    <SurfaceMesh data={data} onHover={handleHover} />
                    <Axes data={data} />
                    <OrbitControls
                      ref={controlsRef}
                      enablePan={false}
                      enableZoom
                      minDistance={2.5}
                      maxDistance={7}
                      minPolarAngle={0.3}
                      maxPolarAngle={1.4}
                    />
                    <AutoRotate controlsRef={controlsRef} />
                  </Canvas>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "2rem" }}>
                    <Heatmap data={data} />
                  </div>
                )}
              </div>

              {/* Hover tooltip */}
              {hoverInfo && view === "3d" && (
                <div className="surface-tooltip">{hoverInfo}</div>
              )}

              <div className="gradient-legend">
                <span className="gradient-label">Lower risk</span>
                <div className="gradient-bar-multi" />
                <span className="gradient-label">Higher risk</span>
              </div>
            </Card>
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <Card>
              <span className="result-label">Key takeaways</span>
              <Insights data={data} />
            </Card>
          </div>

          <p className="surface-footnote">
            Drag to rotate · Scroll to zoom · Hover for exact values · All other patient variables held at defaults
          </p>
        </>
      ) : (
        <div style={{ marginTop: "1.25rem" }}>
          <Card>
            <div className="surface-frame-hero">
              <div className="surface-placeholder">
                Pick two variables above and hit Generate to see the risk landscape.
              </div>
            </div>
          </Card>
        </div>
      )}
    </Container>
  );
}
