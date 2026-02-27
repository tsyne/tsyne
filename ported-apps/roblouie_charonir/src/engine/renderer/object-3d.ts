import { EnhancedDOMPoint } from "@/engine/enhanced-dom-point";
import { radsToDegrees } from '@/engine/helpers';

export class Object3d {
  position: EnhancedDOMPoint;
  scale: EnhancedDOMPoint;
  children: Object3d[];
  parent?: Object3d;
  localMatrix: DOMMatrix;
  worldMatrix: DOMMatrix;
  up: EnhancedDOMPoint;
  rotationMatrix: DOMMatrix;

  constructor(...children: Object3d[]) {
    this.position = new EnhancedDOMPoint();
    this.scale = new EnhancedDOMPoint(1, 1, 1);
    this.children = [];
    this.localMatrix = new DOMMatrix();
    this.worldMatrix = new DOMMatrix();
    this.up = new EnhancedDOMPoint(0, 1, 0);
    this.rotationMatrix = new DOMMatrix();
    if (children) {
      this.add(...children);
    }
  }

  add(...object3ds: Object3d[]) {
    object3ds.forEach(object3d => {
      if (object3d.parent) {
        object3d.parent.children = object3d.parent.children.filter(child => child !== this);
      }
      object3d.parent = this;
      this.children.push(object3d);
    })
  }

  remove(object3d: Object3d) {
    this.children = this.children.filter(child => child !== object3d);
  }

  rotation = new EnhancedDOMPoint();
  rotate(xRads: number, yRads: number, zRads: number) {
    this.rotation.add({x: radsToDegrees(xRads), y: radsToDegrees(yRads), z: radsToDegrees(zRads)});
    this.rotationMatrix.rotateSelf(radsToDegrees(xRads), radsToDegrees(yRads), radsToDegrees(zRads));
  }

  setRotation(xRads: number, yRads: number, zRads: number) {
    this.rotationMatrix.setIdentity();
    this.rotation.set(radsToDegrees(xRads), radsToDegrees(yRads), radsToDegrees(zRads));
    this.rotationMatrix.rotateSelf(radsToDegrees(xRads), radsToDegrees(yRads), radsToDegrees(zRads));
  }

  isUsingLookAt = false;
  getMatrix() {
    // Reuse localMatrix — reset to identity then apply transforms in-place (zero-alloc)
    this.localMatrix.setIdentity();
    this.localMatrix.translateSelf(this.position.x, this.position.y, this.position.z);
    if (this.isUsingLookAt) {
      this.localMatrix.multiplySelf(this.rotationMatrix);
    } else {
      this.localMatrix.rotateSelf(this.rotation.x, this.rotation.y, this.rotation.z);
    }
    this.localMatrix.scaleSelf(this.scale.x, this.scale.y, this.scale.z);
    return this.localMatrix;
  }

  updateWorldMatrix() {
    // Don't update sprites to save time on matrix multiplication. Bit of a hack but ya it works...
    // @ts-ignore
    if (this.color !== undefined) {
      return;
    }

    this.getMatrix(); // updates localMatrix in-place

    if (this.parent) {
      // worldMatrix = parent.worldMatrix × localMatrix (zero-alloc via copyFrom + multiplySelf)
      this.worldMatrix.copyFrom(this.parent.worldMatrix);
      this.worldMatrix.multiplySelf(this.localMatrix);
    } else {
      this.worldMatrix.copyFrom(this.localMatrix);
    }

    this.children.forEach(child => child.updateWorldMatrix());
  }

  allChildren(): Object3d[] {
    function getChildren(object3d: Object3d, all: Object3d[]) {
      object3d.children.forEach(child => {
        all.push(child);
        getChildren(child, all);
      });
    }

    const allChildren: Object3d[] = [];
    getChildren(this, allChildren);
    return allChildren;
  }

  private lookAtX = new EnhancedDOMPoint();
  private lookAtY = new EnhancedDOMPoint();
  private lookAtZ = new EnhancedDOMPoint();

  lookAt(target: EnhancedDOMPoint) {
    this.isUsingLookAt = true;
    this.lookAtZ.subtractVectors(this.position, target).normalize();
    this.lookAtX.crossVectors(this.up, this.lookAtZ).normalize();
    this.lookAtY.crossVectors(this.lookAtZ, this.lookAtX).normalize();

    // Set rotation matrix in-place instead of creating new DOMMatrix
    const v = this.rotationMatrix._values;
    v[0]  = this.lookAtX.x; v[1]  = this.lookAtX.y; v[2]  = this.lookAtX.z; v[3]  = 0;
    v[4]  = this.lookAtY.x; v[5]  = this.lookAtY.y; v[6]  = this.lookAtY.z; v[7]  = 0;
    v[8]  = this.lookAtZ.x; v[9]  = this.lookAtZ.y; v[10] = this.lookAtZ.z; v[11] = 0;
    v[12] = 0;              v[13] = 0;              v[14] = 0;              v[15] = 1;
  }
}
