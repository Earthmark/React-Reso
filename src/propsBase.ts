import { PropUpdate } from "./signal";
import { FieldRef } from "./renderer";

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
  stringify(value: Normalized): string;
  equals(a: Normalized, b: Normalized): boolean;
}

type PropDiffer<Input> = (
  propName: string,
  oldProp: Input | undefined,
  newProp: Input | undefined,
  submit: (update: PropUpdate) => void
) => void;

export interface RefProp<TypeName extends string> {
  ref: (elementId: string, propName: string) => FieldRef<TypeName>;
}

export interface SetProp<Input> {
  field: PropDiffer<Input>;
}

export type RefSetProp<TypeName extends string, Input> = RefProp<TypeName> &
  SetProp<Input>;

function makeRefProp<TypeName extends string>(
  type: TypeName
): RefProp<TypeName> {
  return {
    ref: (elementId, propName) => ({
      elementId,
      propName,
      type,
    }),
  };
}

function makeSetProp<Input, Normalized>(
  differ: DifferImpl<Input, Normalized>,
  type: string,
  def?: Normalized
): SetProp<Input> {
  return {
    field: makeDiffer(differ, type, def),
  };
}

function refPropDiffer<TypeName extends string>(): SetProp<FieldRef<TypeName>> {
  return {
    field: makeDiffer(
      {
        normalize: (value) => value,
        stringify: (value) => `${value.elementId}.${value.propName}`,
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
  indirectProp: () => ElementPropFactory<
    `IField<${TypeName}>`,
    FieldRef<`IField<${TypeName}>`>
  >;
  fluxProp: () => ElementPropFactory<
    `INodeObjectOutput<${TypeName}>`,
    FieldRef<`INodeObjectOutput<${TypeName}>`>
  >;
  ref: () => RefProp<TypeName>;
  field: (def?: Normalized) => SetProp<Input>;
  refField: (def?: Normalized) => RefSetProp<TypeName, Input>;
}

function makeElementPropFactory<TypeName extends string, Input, Normalized>(
  type: TypeName,
  differ: DifferImpl<Input, Normalized>
): ElementPropFactory<TypeName, Input, Normalized> {
  return {
    indirectProp: () => makeElementRefFactory(`IField<${type}>`),
    fluxProp: () => makeElementRefFactory(`INodeObjectOutput<${type}>`),
    ref: () => makeRefProp(type),
    field: (def) => makeSetProp(differ, type, def),
    refField: (def) => ({
      ...makeRefProp(type),
      ...makeSetProp(differ, type, def),
    }),
  };
}

export type ElementRefFactory<TypeName extends string> = ElementPropFactory<
  TypeName,
  FieldRef<TypeName>
>;

export function makeElementRefFactory<TypeName extends string>(
  type: TypeName
): ElementRefFactory<TypeName> {
  return {
    indirectProp: () => makeElementRefFactory(`IField<${type}>` as const),
    fluxProp: () => makeElementRefFactory(`INodeObjectOutput<${type}>` as const),
    ref: () => makeRefProp(type),
    field: () => refPropDiffer<TypeName>(),
    refField: () => ({
      ...makeRefProp(type),
      ...refPropDiffer<TypeName>(),
    }),
  };
}

type DifferImplToPropFactory<
  TypeName extends string,
  Differ
> = Differ extends DifferImpl<infer Input, infer Normalize>
  ? ElementPropFactory<TypeName, Input, Normalize>
  : never;

type ComponentElementPropFactories<TypeDiffers> = {
  [PropType in Extract<keyof TypeDiffers, string>]: DifferImplToPropFactory<
    PropType,
    TypeDiffers[PropType]
  >;
};

/**
 * A helper function for defining a large set of props at once, instead of defining them one by one.
 * @param propBases The primitive components to assemble into fully formed props, where the type name is the key.
 * @returns An object keyed by the input, where each value is an assembled prop differ.
 */
export function propComponentsToPropFactories<
  FactoryComponents extends Record<string, DifferImpl<unknown, unknown>>
>(
  propBases: FactoryComponents
): ComponentElementPropFactories<FactoryComponents> {
  const result = {} as ComponentElementPropFactories<FactoryComponents>;
  for (const key in propBases) {
    Object.assign(result, {
      [key]: makeElementPropFactory(key, propBases[key]),
    });
  }
  return result;
}

type ComponentsToRefFactories<TypeDiffers extends Record<string, string>> = {
  [PropType in keyof TypeDiffers]: ElementRefFactory<TypeDiffers[PropType]>;
};

export function refComponentsToRefFactories<
  RefComponents extends Record<string, string>
>(refs: RefComponents): ComponentsToRefFactories<RefComponents> {
  const result = {} as ComponentsToRefFactories<RefComponents>;
  for (const key in refs) {
    Object.assign(result, {
      [key]: makeElementRefFactory(refs[key]),
    });
  }
  return result;
}
