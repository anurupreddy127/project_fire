import { useLoader } from "@react-three/fiber/native";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Asset } from "expo-asset";
import React, { useRef, useEffect } from "react";

export default function CorridorModel(props) {
  const modelRef = useRef();

  const gltf = useLoader(
    GLTFLoader,
    Asset.fromModule(require("./assets/building.glb")).uri
  );

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material.color.set(0x6699cc);
      }
    });
  }, [gltf]);

  return <primitive ref={modelRef} object={gltf.scene} {...props} />;
}
