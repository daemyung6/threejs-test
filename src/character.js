import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as app from './index.js';





export default function () {
    const that = this;

    this.FBX = {}
    let anime = [];
    const FBXList = [
        './fbx/standing.fbx',
        './fbx/run.fbx'
    ]
    let FBXloadCount = 0;
    for (let i = 0; i < FBXList.length; i++) {
        const id = i;

        let loader = new FBXLoader();
        loader.load(FBXList[id], function (fbxData) {
            FBXloadCount++;
            let pathArr = FBXList[id].split('/');
            let name = pathArr[pathArr.length - 1].split('.')[0];
            that.FBX[name] = fbxData;

            if (FBXList.length === FBXloadCount) {
                loadDone();
                that.onload();

            }
        });
    }

    this.isSetCamera = false; 
    this.camera;
    this.controls;
    this.body;

    this.onload = function() {}

    this.update = function() {}

    this.setCamera = function(controls, camera) {
        that.isSetCamera = true;
        
        that.controls = controls;
        that.camera = camera;
    }

    function loadDone() {
        const shape = new THREE.CapsuleGeometry( 30, 120, 4, 10 );
        const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        const capsule = new THREE.Mesh( shape, material );
        capsule.position.y = 120;


        that.body = capsule;
        
        const clock = new THREE.Clock();
        const mixer = new THREE.AnimationMixer( that.FBX.standing );

        const standing = mixer.clipAction( that.FBX.standing.animations[0] );
        anime.push(standing);
        standing.play()
      
        const run = mixer.clipAction( that.FBX.run.animations[0] );
        anime.push(run);
        run.play()

        let keys = {
            w : false,
            s : false,
            a : false,
            d : false,
        }

        window.addEventListener('keydown', function(e) {    
            if(typeof keys[e.key] === 'boolean') {
                keys[e.key] = true;
            }
        })
        window.addEventListener('keyup', function(e) {    
            if(typeof keys[e.key] === 'boolean') {
                keys[e.key] = false;
            }
        })

        let speed = 0;
        const maxSpeed = 5; 
        
        app.scene.add(that.body);
        that.body.add(that.FBX.standing);
        that.FBX.standing.position.y = -90;
        
        
        app.renderList.push(function() {
            if(keys.w) { 
                speed += 0.5;
                if(speed > maxSpeed ) { speed = maxSpeed; }
            }
            else {
                speed -= 0.3;
            }

            if(speed < 0) { speed = 0; }
            if(keys.s) {

            }
            if(keys.a) {
                that.body.rotation.y +=  0.1;
                if(that.body.rotation.y > Math.PI * 2) { that.body.rotation.y = 0 }
            }
            if(keys.d) {
                that.body.rotation.y -=  0.1;
                if(that.body.rotation.y < 0) { that.body.rotation.y = Math.PI * 2 }
            }

            that.body.position.x += Math.sin(that.body.rotation.y) * speed;
            that.body.position.z += Math.cos(that.body.rotation.y) * speed;

            

            mixer.update( clock.getDelta() );
            anime[0].weight = 1 - (speed / maxSpeed);
            anime[1].weight = (speed / maxSpeed);

            if(that.isSetCamera) {
                that.camera.position.x += Math.sin(that.body.rotation.y) * speed;
                that.camera.position.z += Math.cos(that.body.rotation.y) * speed;

                that.controls.target.x += Math.sin(that.body.rotation.y) * speed;
                that.controls.target.z += Math.cos(that.body.rotation.y) * speed;
                
                that.controls.update();
            }
        });
    }
}