import { ElementPropFactory, RefPropFactory } from "./propsBase";
import { ElementTemplate } from "./renderer";

type TemplateJsonLibrary = Record<string, TemplateDef>;

type TemplateDef = {
  props: Record<string, TemplateProp>;
};

type TemplateProp<Ref extends string = string, Set extends string = string> = {
  ref?: Ref;
  set?: Set;
};

type SetExtractor<T extends TemplateDef, Factories extends SetterFactories> = {
  [P in keyof T["props"]]: T["props"][P] extends TemplateProp<
    any,
    infer Set
  >
    ? Set extends keyof Factories
      ? Factories[Set]
      : never
    : never;
};

type RefExtractor<T extends TemplateDef> = {
  [P in keyof T["props"]]: T["props"][P] extends TemplateProp<
    infer Ref,
    any
  >
    ? RefPropFactory<Ref>
    : never;
};

type TemplateJsonToInstance<
  TemplateJsonLib extends TemplateJsonLibrary,
  SetFactories extends SetterFactories
> = {
  [K in keyof TemplateJsonLib]: ElementTemplate<
    SetExtractor<TemplateJsonLib[K], SetFactories>,
    RefExtractor<TemplateJsonLib[K]>
  >;
};

type SetterFactories = Record<string, SetFactory>;
type SetFactory = Record<string, ElementPropFactory<any, any, any>>;

export function elementFactory<
  Library extends TemplateJsonLibrary,
  SetFactories extends SetterFactories
>(
  templates: Library,
  setFactories: SetFactories,
  refFactory: unknown
): TemplateJsonToInstance<Library, SetFactories> {

}
