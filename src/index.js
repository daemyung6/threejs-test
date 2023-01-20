import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Character from './character.js';

export let scene;
export let physicsWorld;
let camera, renderer, object;
let controls;
let mixer;
const margin = 0.01;

let transformAux1;
let tempBtVec3_1;
let rigidBodies = [];
let syncList = [];

let DISABLE_DEACTIVATION;
let TRANSFORM_AUX;
let ZERO_QUATERNION;

const displayDiv = document.createElement('div');
displayDiv.classList.add('displayDiv');
document.body.appendChild(displayDiv);

function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {

  const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
  const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
  shape.setMargin(margin);

  createRigidBody(object, shape, mass, pos, quat);

  return object;

}

export function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {

  if (pos) {

      object.position.copy(pos);

  } else {

      pos = object.position;

  }

  if (quat) {

      object.quaternion.copy(quat);

  } else {

      quat = object.quaternion;

  }

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
  const body = new Ammo.btRigidBody(rbInfo);

  body.setFriction(0.5);

  if (vel) {

      body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));

  }

  if (angVel) {

      body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));

  }

  object.userData.physicsBody = body;
  object.userData.collided = false;

  if (mass > 0) {

      rigidBodies.push(object);

      // Disable deactivation
      body.setActivationState(4);

  }

  physicsWorld.addRigidBody(body);

  return body;

}


export let Ammo;

AmmoInit().then(function (m) {
  console.log(m);
  Ammo = m;

  init();
})


function init() {
  // - Global variables -
  DISABLE_DEACTIVATION = 4;
  TRANSFORM_AUX = new Ammo.btTransform();
  ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

  const container = document.createElement('div');
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 5000);
  camera.position.x = 0;
  camera.position.y = 300;
  camera.position.z = 500;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc2d7ff);

  const lightp = new THREE.PointLight(0xffffff, 1, 3000);
  lightp.position.set(0, 1000, 1000);
  scene.add(lightp);
  
  const light = new THREE.AmbientLight( 0x404040 ); // soft white light
  scene.add( light );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  controls = new OrbitControls(camera, renderer.domElement);
  
  controls.update();

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // const geometry = new THREE.BoxGeometry( 1000, 1, 1000 );
  
  // const cube = new THREE.Mesh( geometry, material );
  // scene.add( cube );



  // Physics configuration
  // ---------------------
  let m_collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  let m_dispatcher = new Ammo.btCollisionDispatcher(m_collisionConfiguration);
  let m_broadphase = new Ammo.btDbvtBroadphase();
  let m_constraintSolver = new Ammo.btSequentialImpulseConstraintSolver();

  physicsWorld = new Ammo.btDiscreteDynamicsWorld(m_dispatcher, m_broadphase, m_constraintSolver, m_collisionConfiguration);
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.810, 0));

  Ammo.btGImpactCollisionAlgorithm.prototype.registerAlgorithm(physicsWorld.getDispatcher());

  transformAux1 = new Ammo.btTransform();
  tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);


  // Ground
  let pos = new THREE.Vector3();
  let quat = new THREE.Quaternion();
  pos.set(0, - 0.5, 0);
  quat.set(0, 0, 0, 1);
  const ground = createParalellepipedWithPhysics(1000, 1, 1000, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0xFFFFFF }));
  scene.add(ground);
  ground.receiveShadow = true;
  ground.material = new THREE.MeshBasicMaterial( {color: 0xffffff} );


  const character = new Character();
  character.setCamera(controls, camera);
  character.onload = function() { console.log('load character') }

  test();

  render();
}






export let renderList = [];
const clock = new THREE.Clock();
let deltaTime = clock.getDelta();
function render() {
  requestAnimationFrame( render );
  deltaTime = clock.getDelta();

  for (let i = 0; i < renderList.length; i++) {
    renderList[i]();
  }

  for (var i = 0; i < syncList.length; i++) {
    syncList[i](deltaTime);
  }
  
  // Step world
  physicsWorld.stepSimulation(deltaTime, 10);

  // Update rigid bodies
  for (let i = 0, il = rigidBodies.length; i < il; i++) {

      const objThree = rigidBodies[i];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();

      if (ms) {

          ms.getWorldTransform(transformAux1);
          const p = transformAux1.getOrigin();
          const q = transformAux1.getRotation();
          objThree.position.set(p.x(), p.y(), p.z());
          objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

          objThree.userData.collided = false;

      }

  }

  renderer.render(scene, camera);
}

let materialDynamic, materialStatic, materialInteractive;

function test() {

  createBox(new THREE.Vector3(0, 100, 100), new THREE.Quaternion(0, 0, 0, 1), 20, 20, 20, 100, 10);
  createBox(new THREE.Vector3(0, 110, 100), new THREE.Quaternion(0, 0, 0, 1), 20, 20, 20, 100, 10);
  createBox(new THREE.Vector3(0, 120, 100), new THREE.Quaternion(0, 0, 0, 1), 20, 20, 20, 100, 10);
}

function createBox(pos, quat, w, l, h, mass, friction) {
  var material = new THREE.MeshPhongMaterial( { color:0x000000 } );
  var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
  var geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

  if(!mass) mass = 0;
  if(!friction) friction = 1;

  var mesh = new THREE.Mesh(shape, material);
  mesh.position.copy(pos);
  mesh.quaternion.copy(quat);
  scene.add( mesh );

  var transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  var motionState = new Ammo.btDefaultMotionState(transform);

  var localInertia = new Ammo.btVector3(0, 0, 0);
  geometry.calculateLocalInertia(mass, localInertia);

  var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
  var body = new Ammo.btRigidBody(rbInfo);

  body.setFriction(friction);
  // body.setRestitution(.9);
  // body.setDamping(0.2, 0.2);

  physicsWorld.addRigidBody( body );

  if (mass > 0) {
      body.setActivationState(DISABLE_DEACTIVATION);
      // Sync physics and graphics
      function sync(dt) {
          var ms = body.getMotionState();
          if (ms) {
              ms.getWorldTransform(TRANSFORM_AUX);
              var p = TRANSFORM_AUX.getOrigin();
              var q = TRANSFORM_AUX.getRotation();
              mesh.position.set(p.x(), p.y(), p.z());
              mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
          }
      }

      syncList.push(sync);
  }
}

