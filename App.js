import React, { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, PanResponder } from "react-native";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { Asset } from "expo-asset";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function App() {
  const timeout = useRef();
  const [glKey, setGlKey] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [cameraAngle, setCameraAngle] = useState({ x: 0, y: 0 });

  // Handle swipe rotation at the endpoint
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => rotationEnabled,
    onPanResponderMove: (_, gesture) => {
      if (!rotationEnabled) return;
      const newY = cameraAngle.y - gesture.dx * 0.005;
      const newX = cameraAngle.x - gesture.dy * 0.005;
      setCameraAngle({ x: newX, y: newY });
    },
  });

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
    camera.position.set(0, 1000, 0); // Initial hide

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor("#111");

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Optional helpers
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
          console.error("❌ Points not found!");
          return;
        }

        const start = startPoint.position.clone();
        const middle = middlePoint.position.clone();
        const end = endPoint.position.clone();

        camera.position.copy(start);
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
        let phaseStart = performance.now();
        const speed = 0.005;

        const render = () => {
          const now = performance.now();

          switch (phase) {
            case 0: // Wait at starting point
              if (now - phaseStart > 500) {
                phase = 1;
                phaseStart = now;
              }
              break;

            case 1: {
              // Move to middle point
              const distance = camera.position.distanceTo(middle);
              camera.position.lerp(middle, speed);
              camera.lookAt(middle);
              if (distance < 0.05) {
                phase = 2;
                phaseStart = now;
              }
              break;
            }

            case 2: // Look at end point
              camera.lookAt(end);
              phase = 3;
              break;

            case 3: {
              // Move to end point
              const distance = camera.position.distanceTo(end);
              camera.position.lerp(end, speed);
              camera.lookAt(end);
              if (distance < 0.05) {
                phase = 4;
                setRotationEnabled(true);
              }
              break;
            }

            case 4: // Free look
              camera.rotation.x = cameraAngle.x;
              camera.rotation.y = cameraAngle.y;
              break;
          }

          timeout.current = requestAnimationFrame(render);
          renderer.render(scene, camera);
          gl.endFrameEXP();
        };

        render();
      },
      undefined,
      (error) => {
        console.error("🚨 Model Load Error:", error);
      }
    );
  };

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {/* Reload Button */}
      <TouchableOpacity
        onPress={() => {
          setGlKey((prev) => prev + 1);
          setCameraAngle({ x: 0, y: 0 });
          setRotationEnabled(false);
        }}
        style={{
          backgroundColor: "#222",
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

      {/* GLView */}
      <GLView
        key={glKey}
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
