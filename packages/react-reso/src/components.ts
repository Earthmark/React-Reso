import prop from "./props";
import {
  hasReactChildren,
  elementPropsSetToTemplates,
  elementTemplatesToJsxPrototypes,
  ElementTemplateSetJsxSignatureLibrary,
} from "./componentsBase";

const baseComponentDef = {
  name: prop.string.set(),
  tag: prop.string.set(),
  slot: prop.slot.ref(),
};

const activateComponentDef = {
  ...baseComponentDef,
  active: prop.bool.set(),
  persistent: prop.bool.set(),
};

const transformComponentDef = {
  ...activateComponentDef,
  position: prop.float3.set(),
  rotation: prop.floatQ.set(),
  scale: prop.float3.set({ x: 1, y: 1, z: 1 }),
};

const transforms = {
  transform: {
    ...transformComponentDef,
    ...hasReactChildren(),
  },
  smoothTransform: {
    ...transformComponentDef,
    ...hasReactChildren(),
    smoothTransformEnabled: prop.bool.set(),
    smoothSpeed: prop.float.set(),
  },
  spinner: {
    ...transformComponentDef,
    ...hasReactChildren(),
    speed: prop.float3.set(),
    range: prop.float3.set(),
  },
};

const baseColliderComponentDef = {
  ...transformComponentDef,
  offset: prop.float3.set(),
  type: prop.colliderType.set(),
  mass: prop.float.set(),
  characterCollider: prop.bool.set(),
  ignoreRaycasts: prop.bool.set(),
};

const colliders = {
  boxCollider: {
    ...baseColliderComponentDef,
    size: prop.float3.set({ x: 1, y: 1, z: 1 }),
  },
  capsuleCollider: {
    ...baseColliderComponentDef,
    height: prop.float.set(),
    radius: prop.float.set(),
  },
  coneCollider: {
    ...baseColliderComponentDef,
    height: prop.float.set(),
    radius: prop.float.set(),
  },
  sphereCollider: {
    ...baseColliderComponentDef,
    radius: prop.float.set(),
  },
  meshCollider: {
    ...baseColliderComponentDef,
    mesh: prop.mesh.set(),
    sidedness: prop.string.set(),
    actualSpeculativeMargin: prop.float.set(),
  },
  convexHullCollider: {
    ...baseColliderComponentDef,
    mesh: prop.mesh.set(),
  },
};

const renderers = {
  meshRenderer: {
    ...transformComponentDef,
    mesh: prop.mesh.set(),
    material: prop.material.set(),
  },
};

const meshComponentBase = {
  ...baseComponentDef,
  mesh: prop.mesh.ref(),
};

const meshes = {
  mesh: {
    ...meshComponentBase,
    url: prop.uri.set(),
  },
  boxMesh: {
    ...meshComponentBase,
    name: prop.string.set(),
    tag: prop.string.set(),
    size: prop.float3.set({ x: 1, y: 1, z: 1 }),
    uvScale: prop.float3.set(),
    scaleUvWithSize: prop.bool.set(),
  },
  sphereMesh: {
    ...meshComponentBase,
    name: prop.string.set(),
    tag: prop.string.set(),
    radius: prop.float.set(),
  },
};

const materialComponentBase = {
  ...baseComponentDef,
  material: prop.material.ref(),
};

const materials = {
  unlitMaterial: {
    ...materialComponentBase,
    color: prop.color.set(),
  },
  pbsSpecularMaterial: {
    ...materialComponentBase,
    color: prop.color.set(),
  },
};

const textureComponentBase = {
  ...baseComponentDef,
  texture: prop.iTexture2D.ref(),
};

const textures = {
  texture2D: {
    ...textureComponentBase,
    url: prop.uri.set(),
    filterMode: prop.string.set(),
    anisotropicLevel: prop.int.set(),
    wrapModeU: prop.string.set(),
    wrapModeV: prop.string.set(),
  },
};

const base2DComponentDef = {
  ...activateComponentDef,
  anchorMin: prop.float2.set(),
  anchorMax: prop.float2.set(),
  offsetMin: prop.float2.set(),
  offsetMax: prop.float2.set(),
  pivot: prop.float2.set(),
};

const rectElements = {
  canvas: {
    ...transformComponentDef,
    ...hasReactChildren(),
  },
  rect: {
    ...base2DComponentDef,
    ...hasReactChildren(),
  },
  image: {
    ...base2DComponentDef,
    ...hasReactChildren(),
    color: prop.color.set(),
  },
  horizontalLayout: {
    ...base2DComponentDef,
    ...hasReactChildren(),
  },
  verticalLayout: {
    ...base2DComponentDef,
    ...hasReactChildren(),
  },
  text: {
    ...base2DComponentDef,
    children: prop.string.set(),
    color: prop.color.set(),
  },
  button: {
    ...base2DComponentDef,
    ...hasReactChildren(),
  },
};

export const componentDefs = elementPropsSetToTemplates({
  slot: {
    ...activateComponentDef,
    ...hasReactChildren(),
  },
  ...transforms,
  ...colliders,
  ...renderers,
  ...meshes,
  ...materials,
  ...textures,
  ...rectElements,
} as const);

export type ElementProps = ElementTemplateSetJsxSignatureLibrary<
  typeof componentDefs
>;

export const rr = elementTemplatesToJsxPrototypes(componentDefs);
