import React from "react";
import Reconciler from "react-reconciler";
import {
  ConcurrentRoot,
  DefaultEventPriority,
  LegacyRoot,
} from "react-reconciler/constants";
import { ElementId, InboundSignal, OutboundSignal, PropUpdate } from "./signal";

export interface ElementTemplate<Props, Refs> {
  updater: ElementUpdater<Props>;
  refFactory: ElementRefFactory<Refs>;
}

export type ElementUpdater<Props = {}> = (
  oldProps: Partial<Props>,
  newProps: Partial<Props>,
  submit: (update: PropUpdate) => void
) => void;

export type ElementRefFactory<Refs> = (id: ElementId) => FieldRefs<Refs>;

export type FieldRefs<FieldTypes> = {
  [Field in keyof FieldTypes]: FieldRef<Extract<FieldTypes[Field], string>>;
};

export interface FieldRef<TypeName extends string> {
  type: TypeName;
  propName: string;
  elementId: string;
}

export interface ReactResoRenderer {
  createInstance(handler: (signal: OutboundSignal) => void): {
    render(signal: InboundSignal): void;
  };
}

interface Container extends LogicalInstance {
  globalInstanceId: number;
  globalEventId: number;
}

interface RenderedInstance extends LogicalInstance {
  container: Container;
  updater: ElementUpdater<any>;
  refs: FieldRefs<any>;
}

interface LogicalInstance {
  id: string;
  children: Record<string, LogicalInstance>;
  events: Record<string, (arg: string) => void>;
}

function getElementById(
  id: string,
  instance: LogicalInstance
): LogicalInstance | undefined {
  if (instance.id === id) {
    return instance;
  }
  for (const child of Object.values(instance.children ?? {})) {
    const result = getElementById(id, child);
    if (result) {
      return result;
    }
  }
}

interface UnlistedReconcilerConfig {
  getCurrentUpdatePriority: () => number;
  setCurrentUpdatePriority: (priority: number) => void;
  resolveUpdatePriority: () => number;
  maySuspendCommit: (type: any, props: any) => boolean;
}

function CreateReconcilerOptions<
  AdditionalComponents extends Record<
    keyof AdditionalComponents,
    ElementTemplate<any, any>
  >
>(
  components: AdditionalComponents,
  handler: (signal: OutboundSignal) => void
): Reconciler.HostConfig<
  Extract<keyof AdditionalComponents, string>,
  Record<string, any>,
  Container,
  RenderedInstance,
  never,
  never,
  never,
  FieldRefs<any>,
  {},
  {
    diffs: Array<PropUpdate>;
  },
  never,
  number,
  number
> &
  UnlistedReconcilerConfig {
  var currentUpdatePriority = DefaultEventPriority;
  return {
    supportsMutation: true,
    supportsHydration: false,
    supportsPersistence: false,
    noTimeout: -1,
    isPrimaryRenderer: false,

    prepareUpdate(instance, type, oldProps, newProps) {
      const diffs: Array<PropUpdate> = [];
      instance.updater(oldProps, newProps, (p) => diffs.push(p));
      return diffs.length > 0 ? { diffs } : null;
    },

    createInstance(type, props, container, context) {
      const id = `${container.globalInstanceId++}`;
      handler({
        signal: "create",
        id,
        type,
      });
      const template = components[type];
      if (template === undefined) {
        throw new Error(`Unknown element type ${type}`);
      }
      const instance = {
        id,
        container,
        updater: template.updater,
        refs: template.refFactory(id),
        children: {},
        events: {},
      };

      const diffs: Array<PropUpdate> = [];
      instance.updater({}, props as any, (p) => diffs.push(p));
      const delta = diffs.length > 0 ? { diffs } : null;

      if (delta && delta.diffs.length > 0) {
        handler({
          signal: "update",
          id,
          props: delta.diffs,
        });
      }
      return instance;
    },
    createTextInstance() {
      throw new Error(
        "Manually setting text isn't supported, wrap it in a text element."
      );
    },

    clearContainer(container) {
      container.children = {};
      handler({
        signal: "remove",
        id: container.id,
      });
    },

    appendInitialChild(parentInstance, child) {
      parentInstance.children[child.id] = child;
      handler({
        signal: "setParent",
        id: child.id,
        parentId: parentInstance.id,
      });
    },

    appendChild(parentInstance, child) {
      parentInstance.children[child.id] = child;
      handler({
        signal: "setParent",
        id: child.id,
        parentId: parentInstance.id,
      });
    },
    appendChildToContainer(container, child) {
      container.children[child.id] = child;
      handler({
        signal: "setParent",
        id: child.id,
        parentId: container.id,
      });
    },

    insertBefore(parentInstance, child, beforeChild) {
      parentInstance.children[child.id] = child;
      handler({
        signal: "setParent",
        id: child.id,
        parentId: parentInstance.id,
        after: beforeChild.id,
      });
    },
    insertInContainerBefore(container, child, beforeChild) {
      container.children[child.id] = child;
      handler({
        signal: "setParent",
        id: child.id,
        parentId: container.id,
        after: beforeChild.id,
      });
    },

    removeChild(parentInstance, child) {
      delete parentInstance.children[child.id];
      handler({
        signal: "remove",
        id: child.id,
      });
    },
    removeChildFromContainer(container, child) {
      delete container.children[child.id];
      handler({
        signal: "remove",
        id: child.id,
      });
    },

    finalizeInitialChildren() {
      return false;
    },

    commitUpdate(instance, updatePayload) {
      handler({
        signal: "update",
        id: instance.id,
        props: updatePayload.diffs,
      });
    },

    shouldSetTextContent(type) {
      return type === "text";
    },

    getRootHostContext() {
      return {};
    },
    getChildHostContext() {
      return {};
    },

    getPublicInstance(instance) {
      return instance.refs;
    },
    prepareForCommit() {
      return null;
    },
    resetAfterCommit() {},
    preparePortalMount() {},

    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,

    getCurrentEventPriority() {
      return 0;
    },
    getInstanceFromNode(n) {
      return undefined;
    },
    beforeActiveInstanceBlur() {},
    afterActiveInstanceBlur() {},
    prepareScopeUpdate(scope, inst) {},
    getInstanceFromScope(scope) {
      return null;
    },
    detachDeletedInstance(node) {},

    getCurrentUpdatePriority() {
      return currentUpdatePriority;
    },
    setCurrentUpdatePriority(priority: number) {
      currentUpdatePriority = priority;
    },
    resolveUpdatePriority() {
      return currentUpdatePriority || DefaultEventPriority;
    },
    maySuspendCommit() {
      return false;
    },
  };
}

export default function createRender<
  AdditionalComponents extends Record<string, ElementTemplate<any, any>>
>(
  node: React.ReactNode,
  elementTemplates: AdditionalComponents
): ReactResoRenderer {
  return {
    createInstance(handler: (signal: OutboundSignal) => void) {
      const reconciler = Reconciler(
        CreateReconcilerOptions(elementTemplates, handler)
      );
      const containerInfo: Container = {
        id: "root",
        globalInstanceId: 1,
        globalEventId: 1,
        children: {},
        events: {},
      };
      const container = reconciler.createContainer(
        containerInfo,
        LegacyRoot,
        null,
        true,
        false,
        "",
        (e) => {
          throw e;
        },
        null
      );

      reconciler.updateContainer(node, container);

      return {
        render(signal: InboundSignal): void {
          const instance = getElementById(signal.id, container);
          if (instance) {
            const event = instance.events[signal.signal];
            if (event) {
              event(signal.arg);
            }
          }
        },
      };
    },
  };
}
