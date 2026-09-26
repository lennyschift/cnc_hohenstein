// Kleines Vorschaubild direkt aus dem (im Hintergrund erzeugten) STEP-Netz
// rendern — ohne den 3D-Viewer öffnen zu müssen. Ein gemeinsamer, kleiner
// WebGL-Renderer wird für alle Bauteile wiederverwendet.
import * as THREE from 'three';

const B = 400;
const H = 300;
let renderer = null;

function holeRenderer() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(B, H);
    renderer.setPixelRatio(1);
  }
  return renderer;
}

export function renderMeshThumbnail(meshes, farbe = '#b0b8c4') {
  const gruppe = new THREE.Group();
  const geos = [];
  const mats = [];
  for (const m of meshes) {
    const pos = m.attributes?.position?.array;
    if (!pos) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos instanceof Float32Array ? pos : new Float32Array(pos), 3));
    const nor = m.attributes?.normal?.array;
    if (nor) geo.setAttribute('normal', new THREE.BufferAttribute(nor instanceof Float32Array ? nor : new Float32Array(nor), 3));
    const idx = m.index?.array;
    if (idx && idx.length) geo.setIndex(new THREE.BufferAttribute(idx instanceof Uint16Array || idx instanceof Uint32Array ? idx : new Uint32Array(idx), 1));
    if (!nor) geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: farbe, metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide });
    geos.push(geo);
    mats.push(mat);
    gruppe.add(new THREE.Mesh(geo, mat));
  }
  if (!gruppe.children.length) return '';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffffff');
  scene.add(gruppe);
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const licht = new THREE.DirectionalLight(0xffffff, 1.4);
  licht.position.set(1, 1.5, 1.2);
  scene.add(licht);

  const box = new THREE.Box3().setFromObject(gruppe);
  const kugel = box.getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(35, B / H, 0.1, kugel.radius * 20 + 10);
  const dist = (kugel.radius / Math.sin((cam.fov * Math.PI) / 360)) * 1.05;
  cam.position.copy(kugel.center).add(new THREE.Vector3(1, 0.85, 1.1).normalize().multiplyScalar(dist));
  cam.lookAt(kugel.center);

  const r = holeRenderer();
  r.render(scene, cam);
  const url = r.domElement.toDataURL('image/png');

  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return url;
}
