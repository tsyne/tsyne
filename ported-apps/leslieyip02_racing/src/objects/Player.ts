import * as THREE from "three";
import Track from "./Track";
import { Controls, Checkpoint, VehicleData } from "../utils/interfaces";
import Vehicle from "./Vehicle";

export default class Player extends Vehicle {
    camera: THREE.PerspectiveCamera;
    manualCamera: boolean = false;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera,
        vehicleData: VehicleData, position: THREE.Vector3, direction: THREE.Vector3,
        rotation: THREE.Euler, checkpoint: Checkpoint,
        debug?: boolean) {

        super(scene, vehicleData, position, direction,
            rotation, checkpoint, debug);
        this.camera = camera;
    }

    handleCameraMovement(forward: boolean, follow: boolean = true) {
        if (this.manualCamera)
            return;

        let targetPosition = this.position.clone();

        if (follow) {
            let cameraPosition = this.position.clone();
            let facingDirection = new THREE.Vector3(this.direction.x,
                0, this.direction.z).normalize();

            if (!forward)
                facingDirection.negate();

            targetPosition.add(facingDirection);

            let positionOffset = facingDirection.clone().multiplyScalar(3);
            cameraPosition.sub(positionOffset);
            cameraPosition.y += 1.5;
            this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        }

        this.camera.lookAt(targetPosition);
    }

    handleTrackCollision(track: Track) {
        super.handleTrackCollision(track, true);
    }

    handleInput(keysPressed: Controls, dt: number) {
        // thrust determines the extent of acceleration
        // (no impulse clearing — Fyne doesn't send repeated keydown events like browsers)
        if (keysPressed["arrowup"])
            this.thrust = Math.min(this.thrust + 0.02, 1);

        if (keysPressed["arrowdown"])
            this.thrust = Math.max(this.thrust - 0.02, 0);

        // auto-engage thrust when accelerating (no gauge UI to manage it manually)
        if (keysPressed["w"] && this.thrust < 0.8)
            this.thrust = Math.min(this.thrust + 0.05, 0.8);

        // acceleration
        if (keysPressed["w"])
            this.velocity.add(this.direction.clone()
                .multiplyScalar(this.acceleration * this.thrust * dt));

        // deceleration
        if (keysPressed["s"] || keysPressed["shift"])
            this.velocity.sub(this.direction.clone()
                .multiplyScalar(this.deceleration * this.thrust * dt));

        // turning
        if (keysPressed["d"])
            this.turn(-this.turnRate * dt);

        if (keysPressed["a"])
            this.turn(this.turnRate * dt);

        // reset roll
        if (!(keysPressed["a"] || keysPressed["d"]))
            this.rotation.z *= 0.8;
    }

    handleOutOfBounds() {
        if (this.laps > 2)
            return;

        super.handleOutOfBounds(true);
    }

    update(track: Track, dt?: number, keysPressed?: Controls) {
        if (!this.model || !this.hitbox || !track || !dt)
            return;

        this.handleInput(keysPressed, dt);
        super.update(track, dt);
        this.handleCameraMovement(!keysPressed["r"], this.isAlive);
    }
}
