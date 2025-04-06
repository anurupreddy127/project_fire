import React, { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { Asset } from "expo-asset";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function App() {
  const timeout = useRef();
  const [glKey, setGlKey] = useState(0); // Trigger for re-rendering GLView

  useEffect(() => {
    return () => {
      if (timeout.current) {
        cancelAnimationFrame(timeout.current);
      }
    };
  }, []);

  const onContextCreate = async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1000, 0); // Prevent initial flicker

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor("#111");

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const modelAsset = require("./assets/building.glb");
    const asset = Asset.fromModule(modelAsset);
    await asset.downloadAsync();

    const loader = new GLTFLoader();
    const uri = asset.localUri || asset.uri;

    loader.load(
      uri,
      (gltf) => {
        const model = gltf.scene;

        const startPoint = model.getObjectByName("startingpoint");
        const middlePoint = model.getObjectByName("middlepoint");
        const endPoint = model.getObjectByName("endpoint");

        if (!startPoint || !middlePoint || !endPoint) {
          console.error("🚫 One or more camera points not found!");
          return;
        }

        const speedFactor = 0.005;

        const starting = startPoint.position.clone();
        const middle = middlePoint.position.clone();
        const end = endPoint.position.clone();

        camera.position.copy(starting);
        camera.lookAt(middle);

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x6699cc,
              roughness: 0.5,
              metalness: 0.2,
            });
          }
        });

        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        scene.add(model);

        let phase = 0;
        let phaseStartTime = performance.now();

        const render = () => {
          const now = performance.now();

          switch (phase) {
            case 0:
              if (now - phaseStartTime >= 5000) {
                phase = 1;
                phaseStartTime = now;
              }
              break;
            case 1: {
              const distance = camera.position.distanceTo(middle);
              const t = Math.min(speedFactor * distance, 1);
              camera.position.lerp(middle, t);
              camera.lookAt(middle);
              if (distance < 0.05) {
                phase = 2;
                phaseStartTime = now;
              }
              break;
            }
            case 2:
              if (now - phaseStartTime >= 100) {
                phase = 3;
                phaseStartTime = now;
              }
              break;
            case 3:
              camera.lookAt(end);
              if (now - phaseStartTime >= 100) {
                phase = 4;
                phaseStartTime = now;
              }
              break;
            case 4: {
              const distance = camera.position.distanceTo(end);
              const t = Math.min(speedFactor * distance, 1);
              camera.position.lerp(end, t);
              camera.lookAt(end);
              break;
            }
          }

          timeout.current = requestAnimationFrame(render);
          renderer.render(scene, camera);
          gl.endFrameEXP();
        };

        setTimeout(render, 100);
      },
      undefined,
      (error) => {
        console.error("❌ Model load error:", error);
      }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* 🔁 Reload Button */}
      <TouchableOpacity
        onPress={() => setGlKey((prev) => prev + 1)}
        style={{
          backgroundColor: "#333",
          padding: 10,
          position: "absolute",
          top: 40,
          zIndex: 1,
          alignSelf: "center",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>🔄 Reload</Text>
      </TouchableOpacity>

      {/* 🎥 GLView with dynamic key */}
      <GLView
        key={glKey}
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
