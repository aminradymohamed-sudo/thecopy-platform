"use client";

import { Canvas } from "@react-three/fiber";

import type { Scene } from "../../types";

function SceneGeometry({ scene }: { scene: Scene }) {
  const keyLight = scene.lights[0];
  const fillLight = scene.lights[1];
  const backLight = scene.lights[2];

  return (
    <>
      <ambientLight intensity={0.18} />
      {keyLight ? (
        <pointLight
          color={keyLight.color}
          intensity={keyLight.intensity / 28}
          position={keyLight.position}
        />
      ) : null}
      {fillLight ? (
        <pointLight
          color={fillLight.color}
          intensity={fillLight.intensity / 48}
          position={fillLight.position}
        />
      ) : null}
      {backLight ? (
        <pointLight
          color={backLight.color}
          intensity={backLight.intensity / 34}
          position={backLight.position}
        />
      ) : null}

      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.2, 1.9, 0.55]} />
        <meshStandardMaterial roughness={0.45} color="#c9b894" />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial roughness={0.5} color="#d8c4a0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 1.05, -1.8]}>
        <boxGeometry args={[4.8, 2.2, 0.12]} />
        <meshStandardMaterial color="#1d1d1d" />
      </mesh>
    </>
  );
}

export default function ScenePreviewCanvas({ scene }: { scene: Scene }) {
  return (
    <Canvas
      camera={{
        position: scene.camera.position,
        fov: Math.max(18, Math.min(72, 80 - scene.camera.focalLength / 3)),
      }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#121212"]} />
      <SceneGeometry scene={scene} />
    </Canvas>
  );
}
