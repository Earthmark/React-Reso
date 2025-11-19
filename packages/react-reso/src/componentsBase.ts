import React, { ReactNode } from "react";
import {
  ElementTemplate,
  ElementUpdater,
  ElementRefFactory,
  FieldRefs,
} from "./renderer";
import { RefPropFactory, SetPropFactory } from "./propsBase";

export type ElementPropsToUpdaterInput<Fields> = {
  [Field in keyof Fields]: Partial<SetPropFactory<any>>;
};

type MapDefPropToType<T> = {
  [E in keyof T]: T[E] extends SetPropFactory<infer Value> ? Value : never;
};

export function elementPropsToUpdater<
  Fields extends Record<string, SetPropFactory<any>>
>(elementProps: Fields): ElementUpdater<MapDefPropToType<Fields>> {
  return (oldProps, newProps, submit) => {
    for (const prop in elementProps) {
      const element = elementProps[prop];
      if (element.set) {
        element.set(prop, oldProps[prop], newProps[prop], submit);
      }
    }
  };
}

export type ElementPropsToRefFactoryInput<Fields> = {
  [Field in keyof Fields]: RefPropFactory<any>;
};

type MapDefRefToRefType<T> = {
  [E in keyof T]: ElementRefToType<T[E]>;
};

type ElementRefToType<ElemRef> = ElemRef extends RefPropFactory<infer TypeName>
  ? TypeName
  : never;

function elementPropsToRefFactory<Fields extends Record<string, RefPropFactory<any>>>(
  elementProps: Fields
): ElementRefFactory<MapDefRefToRefType<Fields>> {
  return (elementId) => {
    const refs = {} as FieldRefs<MapDefRefToRefType<Fields>>;
    for (const prop in elementProps) {
      const element = elementProps[prop];
      if (element.ref) {
        refs[prop] = element.ref(prop, elementId);
      }
    }
    return refs;
  };
}

type ElementPropTemplateInput<Props, Refs> =
  | ElementPropsToUpdaterInput<Props>
  | ElementPropsToRefFactoryInput<Refs>;

type DefinitionToElementTemplate<Definition> = ElementTemplate<
  MapDefPropToType<FilterByValue<Definition, SetPropFactory<any>>>,
  MapDefRefToRefType<FilterByValue<Definition, RefPropFactory<any>>>
>;

type FilterByValue<Source, ValueFilter> = {
  [Key in keyof Source as Source[Key] extends ValueFilter
    ? Key
    : never]: Source[Key];
};

export function elementPropsToTemplate<
  Definition extends ElementPropTemplateInput<unknown, unknown>
>(definition: Definition): DefinitionToElementTemplate<Definition> {
  return {
    updater: elementPropsToUpdater(definition as any),
    refFactory: elementPropsToRefFactory(definition as any) as any,
  };
}

/**
 * Converts a set of element definitions into element updaters, ready for use in the ResoRenderer.
 *
 * Argument objects should likely have values from a primitive.* call, as that handles parsing for you.
 *
 * @param definitions A keyed set of element definitions.
 * @returns A keyed set of element updaters.
 *
 */
export function elementPropsSetToTemplates<
  Elements extends Record<
    keyof Elements,
    ElementPropTemplateInput<unknown, unknown>
  >
>(
  definitions: Elements
): {
  [Element in keyof Elements]: DefinitionToElementTemplate<Elements[Element]>;
} {
  const result: Partial<{
    [Element in keyof Elements]: DefinitionToElementTemplate<Elements[Element]>;
  }> = {};
  for (const key in definitions) {
    result[key] = elementPropsToTemplate(definitions[key]);
  }
  return result as {
    [Element in keyof Elements]: DefinitionToElementTemplate<Elements[Element]>;
  };
}

export type ElementTemplateSetJsxSignatureLibrary<ElementTemplates> = {
  [Element in keyof ElementTemplates]: ElementTemplates[Element] extends ElementTemplate<
    infer Props,
    infer Refs
  >
    ? ReactFactory<
        Partial<Props & { ref: (refs: FieldRefs<Refs>) => void }>,
        Element
      >
    : never;
};

type ReactFactory<Props, Element> = (
  p: Props
) => React.ReactElement<Props, Extract<Element, string>>;

export function useResoRef<Element>(
  _elem?: Element
): UseResoRefResult<Partial<ElementToRef<Element>>> {
  return React.useState<Partial<ElementToRef<Element>>>({});
}

type ElementToRef<Element> = Element extends (p: {
  ref?: (v: infer Refs) => void;
}) => any
  ? Refs
  : never;

type UseResoRefResult<RefType> = [
  RefType,
  React.Dispatch<React.SetStateAction<RefType>>
];

/**
 * Extracts the typescript definitions of the properties of a set of element updaters as rendering functions.
 *
 * This is to avoid exposing the elements as globals in a call such as:
 * declare global {
 *   namespace JSX {
 *     interface IntrinsicElements extends ElementProps {}
 *   }
 * }
 *
 * You can use the result of this call in a JSX.IntrinsicElements extension, however it may overlap with existing elements.
 * To avoid this overlap create elements using the object returned by this function.
 *
 * NOTE: The type signature of the result is a lie,
 * a set of strings is returned by typescript recognizes it as a set of functions.
 *
 * @param templates The set of element templates to map the props from.
 * @returns A map of key -> key, with type definitions that look like React element construction functions.
 */
export function elementTemplatesToJsxPrototypes<ElementTemplates extends {}>(
  templates: ElementTemplates
): ElementTemplateSetJsxSignatureLibrary<ElementTemplates> {
  return Object.fromEntries(
    Object.keys(templates).map((e) => [e, e])
  ) as unknown as any;
}

/**
 * A helper function that returns a type declaration that if used in an element definition
 * (and then fed into definitionsToUpdaters) to imply the element has react children.
 * @returns A type declaration that implies the element has react children.
 */
export function hasReactChildren(): {
  children: SetPropFactory<ReactNode>;
} {
  return {} as unknown as any;
}
