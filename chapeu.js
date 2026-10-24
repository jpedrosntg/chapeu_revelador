import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- Configurações do chapéu ----------
export const HAT_CONFIG = {
  file: 'sorting_hat_fan_art.glb',
  targetSize: 4,
  hatName: 'MainHat',
  mouthName: 'mouth|jaw|boca|mandib',
  jawAngle: 0.35,
  jawAxis: 'x',
  mouthLine: 0.4,
  openAngle: 0.12,
  openAxis: 'x',
  pivotOffset: { x: 0, y: 0, z: 0 },
};

// Carrega o chapéu. Os ângulos e eixos valem na hora;
// tamanho, linha da dobra e pivô só mudam ao carregar de novo.
export async function loadHat(scene, cfg = HAT_CONFIG) {
  const hatRe = new RegExp(cfg.hatName, 'i');
  const mouthRe = new RegExp(cfg.mouthName, 'i');

  const gltf = await new GLTFLoader().loadAsync(cfg.file);
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = cfg.targetSize / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(s);
  model.position.copy(center).multiplyScalar(-s);
  scene.add(model);
  model.updateMatrixWorld(true);

  const mouthMorphs = [];
  const jawBones = [];
  let hatMesh = null;

  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
    if (o.isMesh && hatRe.test(o.name)) hatMesh = o;
    if (o.isMesh && o.morphTargetDictionary) {
      for (const [name, index] of Object.entries(o.morphTargetDictionary)) {
        if (mouthRe.test(name)) mouthMorphs.push({ mesh: o, index });
      }
    }
    if (o.isBone && mouthRe.test(o.name)) {
      jawBones.push({ bone: o, base: o.rotation.clone() });
    }
  });

  const hasRig = mouthMorphs.length > 0 || jawBones.length > 0;
  const pivot = hatMesh && !hasRig ? splitHatTop(hatMesh, scene, cfg) : null;
  const bottomY = new THREE.Box3().setFromObject(model).min.y;

  // Recebe 0 (fechado) até 1 (aberto)
  function setMouth(amount) {
    for (const { mesh, index } of mouthMorphs) {
      mesh.morphTargetInfluences[index] = amount;
    }
    for (const { bone, base } of jawBones) {
      bone.rotation.copy(base);
      bone.rotation[cfg.jawAxis] += cfg.jawAngle * amount;
    }
    if (pivot) {
      pivot.rotation.set(0, 0, 0);
      pivot.rotation[cfg.openAxis] = cfg.openAngle * amount;
    }
  }

  function dispose() {
    scene.remove(model);
    if (pivot) scene.remove(pivot);
  }

  return { bottomY, hasRig, pivot, setMouth, dispose };
}

// Separa a parte de cima do chapéu (acima da linha da dobra) em uma peça própria
function splitHatTop(mesh, scene, cfg) {
  mesh.updateWorldMatrix(true, false);
  const W = mesh.matrixWorld.clone();
  const NM = new THREE.Matrix3().getNormalMatrix(W);

  const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const names = Object.keys(src.attributes);
  const pos = src.attributes.position;
  const vCount = pos.count;

  const wp = new Float32Array(vCount * 3);
  const v = new THREE.Vector3();
  let minY = Infinity, maxY = -Infinity;
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < vCount; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(W);
    wp[i * 3] = v.x; wp[i * 3 + 1] = v.y; wp[i * 3 + 2] = v.z;
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
  }
  const H = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const lineY = minY + cfg.mouthLine * H;

  const keep = {}, move = {};
  for (const n of names) { keep[n] = []; move[n] = []; }

  const pushVertex = (bucket, vi, world) => {
    for (const n of names) {
      const a = src.attributes[n];
      const out = bucket[n];
      if (world && n === 'position') {
        out.push(wp[vi * 3], wp[vi * 3 + 1], wp[vi * 3 + 2]);
      } else if (world && n === 'normal') {
        v.fromBufferAttribute(a, vi).applyMatrix3(NM).normalize();
        out.push(v.x, v.y, v.z);
      } else {
        for (let c = 0; c < a.itemSize; c++) out.push(a.getComponent(vi, c));
      }
    }
  };

  let moveCount = 0;
  const triCount = vCount / 3;
  for (let t = 0; t < triCount; t++) {
    let sy = 0;
    for (let j = 0; j < 3; j++) sy += wp[(t * 3 + j) * 3 + 1];
    const isMove = sy / 3 > lineY;
    const bucket = isMove ? move : keep;
    for (let j = 0; j < 3; j++) pushVertex(bucket, t * 3 + j, isMove);
    if (isMove) moveCount++;
  }

  if (moveCount === 0) {
    console.warn('Nenhum triângulo acima da linha da dobra.');
    return null;
  }

  // Ponto de rotação = centro da dobra + ajuste manual
  const pivotPos = new THREE.Vector3(
    cx + cfg.pivotOffset.x,
    lineY + cfg.pivotOffset.y,
    cz + cfg.pivotOffset.z
  );
  mesh.geometry = buildGeo(names, keep, src);

  const movedGeo = buildGeo(names, move, src);
  movedGeo.translate(-pivotPos.x, -pivotPos.y, -pivotPos.z);

  const pivot = new THREE.Group();
  pivot.position.copy(pivotPos);
  const movedMesh = new THREE.Mesh(movedGeo, mesh.material);
  movedMesh.castShadow = true;
  pivot.add(movedMesh);
  scene.add(pivot);

  return pivot;
}

function buildGeo(names, bucket, src) {
  const g = new THREE.BufferGeometry();
  for (const n of names) {
    const s = src.attributes[n].itemSize;
    g.setAttribute(n, new THREE.Float32BufferAttribute(bucket[n], s));
  }
  return g;
}
