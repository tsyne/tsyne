import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js"
import { CPU, Player, Track, Vehicle } from "../objects/objects";
import { Satellite } from "../decorations/decorations";
import { randomVector } from "../utils/geometry";
import { Controls } from "../utils/interfaces";
import { tracks } from "../../data/tracks/tracks";
import { speeders, bike, mustang } from "../../data/vehicles/vehicles";

export interface GameCallbacks {
    onCountdown?: (text: string) => void;
    onRaceFinish?: (rank: number, time: string) => void;
    onLapUpdate?: (lap: number) => void;
    onTimeUpdate?: (time: string) => void;
}

export default class GameScene extends THREE.Scene {
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;

    width: number;
    height: number;

    keysPressed: Controls;

    track: Track;
    satellites: Array<Satellite>;

    player: Player;
    CPUs: Array<Vehicle>;

    countdown: number;
    finished: boolean;
    lastCountdownText: string;

    callbacks: GameCallbacks;

    constructor(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera,
        width: number, height: number, speederIndex: number, callbacks?: GameCallbacks) {
        super();

        this.width = width;
        this.height = height;
        this.renderer = renderer;
        this.camera = camera;
        this.callbacks = callbacks || {};

        this.setup(speederIndex);

        this.keysPressed = {};
        this.countdown = 0;
        this.finished = false;
        this.lastCountdownText = "";
    }

    setupBackgroundEntities(number: number = 2000,
        distance: number = 1000, offset: number = 200) {

        this.satellites = [];

        let material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
        let geometry = new THREE.SphereGeometry(1, 4, 2);
        let mesh = new THREE.Mesh(geometry, material);

        for (let i = 0; i < number; i++) {
            let position = randomVector();

            while (position.length() < 0.5 && position.length() > 1)
                position = randomVector();

            position.normalize();
            position.multiplyScalar(distance + Math.random() * offset);

            if (Math.random() < 0.05) {
                let points = Array(Math.ceil(Math.random() * 8) + 8).fill(0)
                    .map(_ => randomVector().multiplyScalar(Math.random() * 20));

                let geometry = new ConvexGeometry(points);
                let direction = randomVector().multiplyScalar(0.1);
                let rotationRate = randomVector().multiplyScalar(0.001);
                let satellite = new Satellite(geometry, material, direction, rotationRate);
                satellite.position.set(position.x, position.y, position.z);

                this.satellites.push(satellite);
                this.add(satellite);
            } else {
                let star = mesh.clone();
                star.position.set(position.x, position.y, position.z);
                this.add(star);
            }
        }
    }

    setup(speederIndex: number) {
        // set objects in the scene
        let ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.add(ambient);

        // Directional lights for MeshLambertMaterial / MeshStandardMaterial track layers
        let sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(1, 2, 1).normalize();
        this.add(sun);

        let fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-1, 1, -0.5).normalize();
        this.add(fill);

        let trackData = tracks[0];
        this.track = new Track(this, trackData);
        let firstCheckpoint = this.track.checkpoints[0];

        if (!trackData.gridColor)
            this.setupBackgroundEntities();

        if (isNaN(speederIndex))
            speederIndex = 0;

        let playerVehicleData = speederIndex == 3 ? bike : speederIndex == 4 ? mustang :
            speederIndex > 4 || speederIndex < 0 ? speeders[0] : speeders[speederIndex];

        this.player = new Player(this, this.camera, playerVehicleData,
            this.track.startPoint.clone(), this.track.startDirection.clone(),
            this.track.startRotation.clone(), firstCheckpoint);
        this.player.handleCameraMovement(true, true);

        this.CPUs = [];
        let offset = 4;

        for (let i = 0; i < 3; i++) {
            if (i == speederIndex || this.CPUs.length == 3)
                continue;

            let startPoint = new THREE.Vector3(this.track.startPoint.x,
                this.track.startPoint.y, this.track.startPoint.z + offset);

            this.CPUs.push(new CPU(this, speeders[i], startPoint,
                this.track.startDirection.clone(),
                this.track.startRotation.clone(), firstCheckpoint));

            offset *= -1;
        }
    }

    handleCountdown() {
        if (this.countdown < 3000 || this.countdown > 7000) {
            if (this.lastCountdownText !== "") {
                this.lastCountdownText = "";
                this.callbacks.onCountdown?.("");
            }
            return;
        }

        let countDownText = this.countdown < 6000 ?
            Math.ceil((6000 - this.countdown) / 1000).toString() : "GO!";

        if (this.lastCountdownText != countDownText) {
            this.lastCountdownText = countDownText;
            this.callbacks.onCountdown?.(countDownText);
        }
    }

    handleRaceFinish() {
        if (!this.finished) {
            let rank = 1;
            for (let cpu of this.CPUs)
                if (cpu.laps > 2)
                    rank++;

            this.callbacks.onRaceFinish?.(rank, this.track.getTimeString());
            this.finished = true;
        }
    }

    update(dt?: number) {
        if (!dt)
            return;

        // scene decorations
        if (this.satellites)
            for (let satellite of this.satellites)
                satellite.update(dt);

        // wait 3 seconds for fade in, 3 seconds for countdown
        this.countdown += dt;
        this.handleCountdown();
        if (this.countdown < 6000)
            return;

        // race ends after 2 laps
        if (this.player.laps > 2)
            this.handleRaceFinish();
        else
            this.track.update(dt);

        // update vehicles
        this.player.update(this.track, dt, this.keysPressed);

        for (let cpu of this.CPUs)
            cpu.update(this.track, dt);
    }
}
