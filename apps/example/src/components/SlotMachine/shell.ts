import { Composite } from "@/components/Composite";
import { Mesh, MeshLambertMaterial, Object3D, PlaneGeometry, type Hex } from "@acme/threeme";
export default class Shell extends Object3D {
    private width: number = 10;
    private height: number = 15;
    private depth: number = 10;
    private top: Mesh;
    private color: Hex = 0xdddddd;
    constructor() {
        super();
        this.top = this.createTop();
    }
    private createTop():Mesh {
        const geo = new PlaneGeometry(this.width, this.height, 1, 1);
        const mat = new MeshLambertMaterial(this.color);
        const mesh = new Mesh(geo, mat);
        mesh.rotation[0] = -Math.PI / 2;
        mesh.position[1] = -10;
        return mesh;
    }

