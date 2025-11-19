import {
  elementPropsSetToTemplates,
  elementTemplatesToJsxPrototypes,
  prop,
} from "@rfmk/react-reso";

const elements = {
  add: {
    a: prop.float.set(),
    b: prop.float.set(),
    self: prop.float.ref(),
  },
};

export const componentDefs = elementPropsSetToTemplates(elements);
export const rr = elementTemplatesToJsxPrototypes(elements);
