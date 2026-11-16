// Scene manager. Each floor is its own module that exports create(), which returns:
//   { grid, group, spawns: { player, partner }, wallHeight?, update?(dt, game), dispose?() }
export class SceneManager {
  constructor(stage) {
    this.stage = stage;
    this.floors = new Map();
    this.current = null;
    this.currentName = null;
  }

  register(name, create) { this.floors.set(name, create); }

  load(name) {
    if (this.current) {
      this.stage.scene.remove(this.current.group);
      disposeTree(this.current.group);
      this.current.dispose?.();
    }
    this.current = this.floors.get(name)();
    this.currentName = name;
    this.stage.scene.add(this.current.group);
    const { grid } = this.current;
    this.stage.fit(grid.w, grid.d, this.current.wallHeight);
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
