// Immutable helpers for editing a condition tree by path.
// A path is an array of indices describing how to reach a node starting
// from the root group's `conditions` array, e.g. [1, 0] = root.conditions[1].conditions[0].

export function makeEmptyGroup(logic = 'AND') {
  return { logic, conditions: [] };
}

export function makeEmptyLeaf(field = '', operator = 'equals', value = '') {
  return { field, operator, value };
}

function cloneTree(node) {
  return JSON.parse(JSON.stringify(node));
}

export function getNodeAtPath(root, path) {
  let node = root;
  for (const idx of path) {
    node = node.conditions[idx];
  }
  return node;
}

export function updateNodeAtPath(root, path, updater) {
  const clone = cloneTree(root);
  if (path.length === 0) {
    return updater(clone);
  }
  let parent = clone;
  for (let i = 0; i < path.length - 1; i++) {
    parent = parent.conditions[path[i]];
  }
  const lastIdx = path[path.length - 1];
  parent.conditions[lastIdx] = updater(parent.conditions[lastIdx]);
  return clone;
}

export function addChildAtPath(root, path, child) {
  const clone = cloneTree(root);
  const parent = getNodeAtPath(clone, path);
  parent.conditions.push(child);
  return clone;
}

export function removeNodeAtPath(root, path) {
  const clone = cloneTree(root);
  if (path.length === 0) return clone;
  let parent = clone;
  for (let i = 0; i < path.length - 1; i++) {
    parent = parent.conditions[path[i]];
  }
  const lastIdx = path[path.length - 1];
  parent.conditions.splice(lastIdx, 1);
  return clone;
}
