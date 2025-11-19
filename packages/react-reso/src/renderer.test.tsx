import { describe, it, expect, vi } from "vitest";
import React from "react";
import createRender from "./renderer";
import { useResoRef } from "./componentsBase";
import { componentDefs, rr } from "./components";
import { OutboundSignal } from "./signal";

interface Fixture {
  toggleCanvas?: boolean;
  toggleChildBox?: boolean;
  subValue?: { x: number; y: number };
  objects: Array<{
    id: string;
  }>;
}

function createSignalListener(node: React.ReactNode) {
  const renderer = createRender(node, componentDefs);
  const messages: Array<OutboundSignal> = [];
  const instance = renderer.createInstance((signal) => messages.push(signal));
  return { messages, instance };
}

it("Verify hierarchy shows as expected", () => {
  var updater: (
    handler: (newController: Fixture) => Fixture
  ) => void = () => {};

  const TestComponent = () => {
    const [c, setFixture] = React.useState<Fixture>(() => ({
      toggleCanvas: false,
      objects: [{ id: "1" }],
    }));
    updater = setFixture;
    return (
      <React.Fragment>
        <rr.transform position={{ x: 2, y: 4, z: 19 }}>
          {c.toggleCanvas ? (
            <rr.boxMesh />
          ) : (
            <rr.text>This contains text!</rr.text>
          )}
          <rr.canvas>
            {c.objects.map((o) => (
              <rr.text key={o.id} anchorMin={c.subValue}>
                {o.id}
              </rr.text>
            ))}
          </rr.canvas>
        </rr.transform>
        {c.toggleChildBox ? <rr.boxMesh /> : null}
        <rr.transform />
      </React.Fragment>
    );
  };

  const { messages, instance } = createSignalListener(<TestComponent />);

  instance.render({
    signal: "event",
    id: "0",
    event: "add",
    arg: "taco",
  });
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, toggleChildBox: true }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, toggleChildBox: false }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, subValue: { x: 2, y: 4 } }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, subValue: undefined }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, objects: [{ id: "1" }, { id: "2" }, { id: "3" }] }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, objects: [{ id: "1" }, { id: "3" }] }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, objects: [{ id: "1" }, { id: "2" }, { id: "3" }] }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  updater((b) => ({ ...b, toggleCanvas: true }));
  expect(messages).toMatchSnapshot();
  messages.length = 0;

  instance.render({
    signal: "event",
    id: "1",
    event: "click",
    arg: "payload",
  });
  expect(messages).toMatchSnapshot();
  messages.length = 0;
});

it("Refs Interconnect", () => {
  const TestComponent = () => {
    const [unlitMat, refUnlitMat] = useResoRef(rr.unlitMaterial);
    return (
      <React.Fragment>
        <rr.unlitMaterial color={{ r: 1, g: 0, b: 1 }} ref={refUnlitMat} />
        <rr.transform position={{ x: 2, y: 4, z: 19 }}>
          <rr.meshRenderer material={unlitMat.material} />
        </rr.transform>
      </React.Fragment>
    );
  };

  const { messages } = createSignalListener(<TestComponent />);

  expect(messages).toMatchSnapshot();
});

it("unexpected components raise errors", () => {
  const renderer = createRender(<div />, componentDefs);
  const items: Array<OutboundSignal> = [];
  expect(() =>
    renderer.createInstance((signal) => items.push(signal))
  ).toThrow();
});

it("components raise errors when they unexpectedly contain text", () => {
  const renderer = createRender(
    <rr.transform>{"I'm illegal!" as any}</rr.transform>,
    componentDefs
  );
  const items: Array<OutboundSignal> = [];
  expect(() =>
    renderer.createInstance((signal) => items.push(signal))
  ).toThrow();
});
