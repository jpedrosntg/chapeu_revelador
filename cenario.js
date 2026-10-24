import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- Configurações do cenário ----------
export const FLOOR_Y = -3.5;   // altura do chão
export const CEIL_Y = 11;      // altura do teto
const WALL_Z = -8;             // parede do fundo
const TABLE_LEN = 16;
const TABLE_TOP_Y = FLOOR_Y + 2.6;

export function createScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14121a);
  scene.fog = new THREE.Fog(0x14121a, 22, 50);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const torchLights = [];
  buildRoom(scene);
  buildWindowsAndBanners(scene);
  buildTorches(scene, torchLights);
  buildTables(scene, torchLights);
  buildCeilingCandles(scene, torchLights);
  buildLights(scene);

  // Tremulação das chamas (chamar a cada frame com o tempo)
  function update(t) {
    for (const { light, flame, base } of torchLights) {
      const flicker = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3 + 2);
      light.intensity = base * flicker;
      flame.scale.setScalar(0.9 + 0.2 * flicker);
    }
  }

  return { renderer, scene, camera, controls, update };
}

// Banquinho de madeira com topo na altura informada
export function addStool(scene, topY) {
  const height = topY - FLOOR_Y;
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 });

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.22, 32), woodMat);
  seat.position.set(0, topY - 0.11, 0);
  seat.castShadow = seat.receiveShadow = true;
  scene.add(seat);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, height - 0.22, 16), woodMat);
  leg.position.set(0, FLOOR_Y + (height - 0.22) / 2, 0);
  leg.castShadow = leg.receiveShadow = true;
  scene.add(leg);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 32), woodMat);
  foot.position.set(0, FLOOR_Y + 0.06, 0);
  foot.receiveShadow = true;
  scene.add(foot);
}

// ---------- Texturas ----------
function makeStoneTexture(baseColor, rows, cols) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = baseColor;
  g.fillRect(0, 0, 512, 512);

  const bw = 512 / cols;
  const bh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * bw / 2;
    for (let k = -1; k < cols + 1; k++) {
      const shade = 0.85 + Math.random() * 0.3;
      g.fillStyle = `rgba(${Math.floor(60 * shade)},${Math.floor(55 * shade)},${Math.floor(70 * shade)},0.25)`;
      g.fillRect(k * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.lineWidth = 4;
      g.strokeRect(k * bw + offset, r * bh, bw, bh);
    }
  }
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const stoneMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });

// ---------- Estrutura ----------
function buildRoom(scene) {
  const backTex = makeStoneTexture('#3a3440', 10, 12);
  backTex.repeat.set(4, 2);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(60, CEIL_Y - FLOOR_Y), stoneMat(backTex));
  backWall.position.set(0, (CEIL_Y + FLOOR_Y) / 2, WALL_Z);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const sideTex = makeStoneTexture('#353040', 10, 12);
  sideTex.repeat.set(3, 2);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, CEIL_Y - FLOOR_Y), stoneMat(sideTex));
    wall.rotation.y = -side * Math.PI / 2;
    wall.position.set(side * 14, (CEIL_Y + FLOOR_Y) / 2, 0);
    wall.receiveShadow = true;
    scene.add(wall);
  }

  const floorTex = makeStoneTexture('#2e2a33', 8, 8);
  floorTex.repeat.set(5, 5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), stoneMat(floorTex));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x1a1720, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEIL_Y;
  scene.add(ceiling);
}

function makeArchShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return s;
}

function buildWindowsAndBanners(scene) {
  const windowGlow = new THREE.MeshBasicMaterial({ color: 0x3f6aa8 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8 });

  for (const x of [-9, 9]) {
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(makeArchShape(2.2, 6)), windowGlow);
    glass.position.set(x, FLOOR_Y + 3.5, WALL_Z + 0.05);
    scene.add(glass);

    const frame = new THREE.Mesh(new THREE.ShapeGeometry(makeArchShape(2.5, 6.3)), frameMat);
    frame.position.set(x, FLOOR_Y + 3.4, WALL_Z + 0.02);
    scene.add(frame);
  }

  const houseColors = [0x8a1c1c, 0xc9a227, 0x1f5a2e, 0x1d3f7a];
  houseColors.forEach((color, i) => {
    const x = -4.2 + i * 2.8;
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 5),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide })
    );
    banner.position.set(x, FLOOR_Y + 6, WALL_Z + 0.1);
    scene.add(banner);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), frameMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(x, FLOOR_Y + 8.6, WALL_Z + 0.15);
    scene.add(rod);
  });
}

// ---------- Chamas ----------
function buildTorches(scene, torchLights) {
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8 });
  for (const x of [-12, 12]) {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8), bracketMat);
    bracket.position.set(x, FLOOR_Y + 3, WALL_Z + 0.3);
    bracket.rotation.z = x < 0 ? -0.3 : 0.3;
    scene.add(bracket);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffa040 })
    );
    flame.position.set(x, FLOOR_Y + 3.7, WALL_Z + 0.5);
    scene.add(flame);

    const light = new THREE.PointLight(0xff9040, 30, 18, 1.5);
    light.position.set(x, FLOOR_Y + 3.7, WALL_Z + 1.5);
    scene.add(light);
    torchLights.push({ light, flame, base: 30 });
  }
}

function buildTables(scene, torchLights) {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1b, roughness: 0.7 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.8 });
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.9 });

  for (const x of [-5, 5]) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, TABLE_LEN), tableMat);
    top.position.set(x, TABLE_TOP_Y, 0);
    top.castShadow = top.receiveShadow = true;
    scene.add(top);

    for (const lx of [-1.2, 1.2]) for (const lz of [-TABLE_LEN / 2 + 1, TABLE_LEN / 2 - 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 0.3), tableMat);
      leg.position.set(x + lx, FLOOR_Y + 1.2, lz);
      leg.castShadow = true;
      scene.add(leg);
    }

    for (const bx of [x - 1.8, x + 1.8]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, TABLE_LEN), benchMat);
      bench.position.set(bx, FLOOR_Y + 1.2, 0);
      bench.castShadow = bench.receiveShadow = true;
      scene.add(bench);
    }

    for (const cz of [-5, -1.5, 2, 5.5]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.45, 10), candleMat);
      candle.position.set(x, TABLE_TOP_Y + 0.32, cz);
      scene.add(candle);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffc070 })
      );
      flame.position.set(x, TABLE_TOP_Y + 0.65, cz);
      scene.add(flame);

      const light = new THREE.PointLight(0xffb060, 3, 7, 1.8);
      light.position.set(x, TABLE_TOP_Y + 0.8, cz);
      scene.add(light);
      torchLights.push({ light, flame, base: 3 });
    }
  }
}

function buildCeilingCandles(scene, torchLights) {
  for (let i = 0; i < 8; i++) {
    const x = -10 + (i % 4) * 6.6;
    const z = -4 + Math.floor(i / 4) * 8;
    const y = CEIL_Y - 2.5 + Math.sin(i * 1.7) * 0.4;

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd080 })
    );
    flame.position.set(x, y, z);
    scene.add(flame);

    const light = new THREE.PointLight(0xffc070, 4, 12, 1.6);
    light.position.set(x, y, z);
    scene.add(light);
    torchLights.push({ light, flame, base: 4 });
  }
}

function buildLights(scene) {
  scene.add(new THREE.AmbientLight(0x2a2438, 0.6));

  const key = new THREE.DirectionalLight(0xfff4e0, 1.4);
  key.position.set(4, 10, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcfd8ff, 0.4);
  fill.position.set(-5, 2, 4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x9a7bff, 0.9);
  rim.position.set(-4, 5, -6);
  scene.add(rim);
}
