import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

type CharacterProps = {
  url: string;
  animation?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export function GameCharacter({
  url,
  animation = "Idle",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: CharacterProps) {
  const group = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF(url);

  // Each character gets its own skeleton instance.
  const clonedScene = useMemo(
    () => SkeletonUtils.clone(scene),
    [scene]
  );

  const { actions, names } = useAnimations(
    animations,
    group
  );

  useEffect(() => {
    const action = actions[animation];

    if (!action) {
      console.warn(
        "Missing animation:",
        animation,
        "Available:",
        names
      );
      return;
    }

    action.reset().fadeIn(0.2).play();

    return () => {
      action.fadeOut(0.2);
    };
  }, [animation, actions, names]);

  useEffect(() => {
    clonedScene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <primitive object={clonedScene} />
    </group>
  );
}
