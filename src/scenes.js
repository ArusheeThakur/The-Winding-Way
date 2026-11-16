// Scene manager. Each floor is its own module that exports an async create({ art }), which resolves to:
//   { grid, group, size: { w, h }, spawns: { player, partner }, cellToPlate(x, z), update?(dt, game), dispose?() }
export class SceneManager {
  constructor(stage) {
    this.stage = stage;
    this.floors = new Map();
    this.current = null;
    this.currentName = null;
  }

  register(name, create) { this.floors.set(name, create); }

  async load(name, context) {
    const next = await this.floors.get(name)(context);
    if (this.current) {
      this.stage.scene.remove(this.current.group);
      disposeTree(this.current.group);
      this.current.dispose?.();
    }
    this.current = next;
    this.currentName = name;
    this.stage.scene.add(this.current.group);
    this.stage.fit(this.current.size.w, this.current.size.h);
    return this.current;
  }

  update(dt, game) { this.current?.update?.(dt, game); }
}

function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose());
  });
}
