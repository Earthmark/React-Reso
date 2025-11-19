import { PropUpdate } from "./signal";
import { RefProp } from "./renderer";

/**
 * A helper function that wraps the core parts of diffing a prop, calling them using a regular boilerplate.
 *
 * It is suggested to use this function to create a property differ, as it handles edge cases in an expected way.
 *
 * @param propDef The specialized parts of the prop.
 * @param oldProp The previous value of the property.
 * @param newProp The property that is being assigned.
 * @returns An object if the value changed, containing the new value to assign the property to.
 * If the inner value is null, the value is being reset/undefined. If the wrapper is null, no change was made.
 */
function makeDiffer<Input, Normalized = Input>(
  { equals, stringify, normalize }: DifferImpl<Input, Normalized>,
  type: string,
  def?: Normalized
): PropDiffer<Input> {
  return (propName, oldProp, newProp, submit) => {
    const n = newProp !== undefined ? normalize(newProp, def) : undefined;
    const hasO = oldProp !== undefined;
    const hasN = n !== undefined;
    if ((hasO || hasN) && (!hasO || !hasN || !equals(normalize(oldProp), n))) {
      submit({ prop: propName, type, value: hasN ? stringify(n) : null });
    }
  };
}

export interface DifferImpl<Input, Normalized = Input> {
  normalize(value: Input, def?: Normalized): Normalized;
  stringify(value: Normalized): string | null;
  equals(a: Normalized, b: Normalized): boolean;
}

type PropDiffer<Input> = (
  propName: string,
  oldProp: Input | undefined,
  newProp: Input | undefined,
  submit: (update: PropUpdate) => void
) => void;

type useRefInitial<TypeName extends string> = Omit<
  RefProp<TypeName>,
  "elementId"
> & {
  elementId: null;
};

export interface RefPropFactory<TypeName extends string> {
  ref: (propName: string, elementId: string) => RefProp<TypeName>;
  useRefSubprop: (propName: string) => useRefInitial<TypeName>;
}

export interface SetPropFactory<Input> {
  set: PropDiffer<Input>;
}

function makeRefProp<TypeName extends string>(
  type: TypeName
): RefPropFactory<TypeName> {
  return {
    ref: (propName, elementId) => ({
      elementId,
      propName,
      type,
    }),
    useRefSubprop: (propName) => ({
      elementId: null,
      propName,
      type,
    }),
  };
}

function makeSetProp<Input, Normalized>(
  differ: DifferImpl<Input, Normalized>,
  type: string,
  def?: Normalized
): SetPropFactory<Input> {
  return {
    set: makeDiffer(differ, type, def),
  };
}

function refPropDiffer<TypeName extends string>(): SetPropFactory<
  RefProp<TypeName>
> {
  return {
    set: makeDiffer(
      {
        normalize: (value) => value,
        stringify: (value) =>
          value.elementId ? `${value.elementId}.${value.propName}` : null,
        equals: (a, b) =>
          a.elementId === b.elementId &&
          a.propName === b.propName &&
          a.type === b.type,
      },
      "ref"
    ),
  };
}

export interface ElementPropFactory<
  TypeName extends string,
  Input,
  Normalized = Input
> {
  ref: () => RefPropFactory<TypeName>;
  set: (def?: Normalized) => SetPropFactory<Input>;
}

function makePropFactory<TypeName extends string, Input, Normalized>(
  type: TypeName,
  differ: DifferImpl<Input, Normalized>
): ElementPropFactory<TypeName, Input, Normalized> {
  return {
    ref: () => makeRefProp(type),
    set: (def) => makeSetProp(differ, type, def),
  };
}

export type ElementRefFactory<TypeName extends string> = ElementPropFactory<
  TypeName,
  RefProp<TypeName>
>;

export function makeRefPropFactory<TypeName extends string>(
  type: TypeName
): ElementRefFactory<TypeName> {
  return {
    ref: () => makeRefProp(type),
    set: () => refPropDiffer<TypeName>(),
  };
}

type DiffersPropFactories<TypeDiffers> = {
  [PropType in Extract<
    keyof TypeDiffers,
    string
  >]: TypeDiffers[PropType] extends DifferImpl<infer Input, infer Normalize>
    ? ElementPropFactory<PropType, Input, Normalize>
    : never;
};

/**
 * A helper function for defining a large set of props at once, instead of defining them one by one.
 * @param propBases The primitive components to assemble into fully formed props, where the type name is the key.
 * @returns An object keyed by the input, where each value is an assembled prop differ.
 */
export function differsToPropFactories<
  FactoryComponents extends {
    [K in keyof FactoryComponents]: DifferImpl<any, any>;
  }
>(propBases: FactoryComponents): DiffersPropFactories<FactoryComponents> {
  const result = {} as DiffersPropFactories<FactoryComponents>;
  for (const key in propBases) {
    Object.assign(result, {
      [key]: makePropFactory(key, propBases[key]),
    });
  }
  return result;
}

type ComponentsToRefFactories<TypeDiffers extends Record<string, string>> = {
  [PropType in keyof TypeDiffers]: ElementRefFactory<TypeDiffers[PropType]>;
};

export function refTypesToRefPropFactories<
  RefComponents extends { [K in keyof RefComponents]: string }
>(refs: RefComponents): ComponentsToRefFactories<RefComponents> {
  const result = {} as ComponentsToRefFactories<RefComponents>;
  for (const key in refs) {
    Object.assign(result, {
      [key]: makeRefPropFactory(refs[key]),
    });
  }
  return result;
}
