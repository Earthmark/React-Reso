import React from "react";

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
