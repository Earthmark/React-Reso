# React-Reso

A react renderer for Resonite, copying template "elements".

## Runtime Architecture

There are two parts of the React-Resonite architecture:

1. React-Resonite Renderer Webserver (Server)
2. Resonite React-Resonite renderer object (Client)

They communicate via a websocket.

## Server Architecture

The server is a nodejs websocket server running a custom react renderer.

The React-Reso library uses typescript, and should have full property support. If you encounter issues with the intellisense, make a bug.

Each websocket connection gets a unique react instance, it will continue to send update messages to the client as the react dom bound to the connection updates.

A hello world that makes a red box:

```tsx
import React from "react";
import { rr, createRender, wsProxyServer, componentDefs, useResoRef } from "react-reso";

export function runServer() {
  // componentDefs defines what templates are available, this should be renamed.
  const render = createRender(<RedBox />, componentDefs);
  wsProxyServer(render, { port: 8080 });
  console.log("Server started on port 8080");
}

function RedBox() {
  // This is how references between elements are done.
  // (If you know react already, internally this is a 'useState({})' and will cause a re-render when the reference is populated, unlike normal 'useRef')
  const [{ material }, matRefGetter] = useResoRef(rr.unlitMaterial);
  const [{ mesh }, meshRefGetter] = useResoRef(rr.boxMesh);

  // React you use lowercase strings for dom elements, in React-Resonite the names are elements.
  // rr provides intellisense for React-Reso 'dom' elements.
  return <rr.transform>
    <rr.unlitMaterial color={{ r: 0.25 }} ref={matRefGetter} />
    <rr.boxMesh size={{ x: 0.1, y: 0.1, z: 0.3 }} ref={meshRefGetter} />
    <rr.meshRenderer position={{ z: 0.4 }} mesh={mesh} material={material} />
  </rr.transform>;
}

runServer();
```

### Communication Protocol

Messages from the server to client instruct the client how to instance and customize elements.

Messages from the client to server are not yet supported, but would allow events from resonite to invoke JS code.

The client two important slots, `staging` and `root`

* `staging` is where elements are spawned, it is inactive by default and is considered a 'scratch pad'.
* `root` is active, and where elements are visible. Elements are moved into `root` via the `setParent` message.

The server will generally send events in this order:

1. Send commands to spawn elements, customize them, and set their hierarchy inside of `staging` (forming a tree with 'root' elements)
2. Clear `root`
3. Reparent the 'root' elements in `staging` into `root` via `setParent`

#### Message Formats

The format uses only url-unsafe symbols as delimiters, Resonite only supports the URL encode and decode operations to encode data and that is used to pass strings that may otherwise include delimiter symbols.

Each message sent from the server to the client follows this format:

```txt
ws_msg: (msg '|')*;

   msg: 'create' '+' element_id '+' template
      | 'remove' '+' (element_id|ROOT)
      | 'setParent' '+' element_id '+' (element_id|ROOT) '+'' (element_id|NULL)
      | 'update' '+' element_id '+' (update '+')*
      ;

update: prop '=' type '=' (prop_value|NULL);

element_id: ID;
  template: LABEL;
      prop: LABEL:
      type: LABEL;
prop_value: LABEL;


ID: [0-9]+;
ROOT: 'root';
NULL: '$'';
LABEL: [a-zA-Z0-9]+;
```

Some example messages:

1. Create an instance of the `transform` element as `1` (in staging)
2. Create an instance of the `box` element as `2` (in staging)
3. Set the `hue` of the `2` to `red`
4. Set the parent of `2` to `1`
5. Clear `root`
6. Move `1` under `root`
7. Create an instance of the `box` element as `3`
8. Set the parent of `3` to `1`, but have it be after `2`
9. reset the `hue` of `2` to `default` and `active` to `false`

**MESSAGE ARE NOT NEWLINE DELIMITED**\
they are shown in rows to make them more legible.

```txt
create+1+transform|
create+2+box|
update+2+hue=color=[1;0;0;1]+|
setParent+2+1|
remove+root|
setParent+1+root|
create+3+box|
setParent+3+1+2|
update+2+hue=color=$+active=bool=false+|
```

Messages may be sent as concatenated strings, or as multiple messages.
Either way they are processed in-order.

Note: Removing `root` does not remove the `root` slot, it removes all children under `root`.

### Elements

Elements are spawned forms of templates, with this hierarchy.

Templates (and their spawned elements) expose props,
a piece of data that can be set or referenced in the spawned element.

There are three kinds of props:

1. Set - A field that can be assigned, but can not be directly referenced.
    * Examples: If they're not to be referenced; `Active`, `Name`...
    * Sets can often be RefSets, but you may not want to expose a prop as bindable.
    * This may be useful for template inputs that are fixed, referenceable fields are normally changeable over time.
2. Ref - A field that can be referenced, normally this is a static piece of information.
    * Examples: `Textures`, `Slots`, `Impulse Inputs`, `Field Outputs`, `<Any field>`
3. RefSet
    * Examples: `Active`, `Name`, `Position`

For these templates, `TRef` can mean `SyncRef` if the inner type is a `WorldElement`, or `IField` if anything else.

```yml
# Template
Slot: /Template Name/
  children:
    - # Element-Proxy
      Name: /Template dynamic variable ID, defaults to '*NO_ELEMENT_ID*'/
      Tag: element-proxy
      Components:
        - # Element-Id-Broadcast
          Type: ParentValue<String>
          Tag: element-id
          Value: <From drive>
        - # Broadcast-Copier
          Type: ValueCopy<String>
          Source: Element-Proxy.Name
          Target: Element-Id-Broadcast.Value

        - # __this broadcast
          Type: Parent<Slot>
          Tag: __this
          Value: Template # Possibly have this fall back to the parent of the proxy if not set.
        - # __proxy broadcast
          Type: Parent<Slot>
          Tag: __proxy
          Value: Element-Proxy

        - # __children broadcast
          # Optional, only if the template supports children.
          Type: Parent<Slot>
          Tag: __children
          Value: /The slot to put children, this is often the root of the template/

        - # Set / SetRef Fields - Data going into the template
          # Includes Position, Rotation, Active, Outbound Impulses, Inbound Fields
          Type: Parent<TRef</prop type/>>
          Tag: /Property name/
          Value: /The field being assigned/

        - # Ref / SetRef Fields - References point into the template
          # Child Slots, Inbound Impulses, Output Fields
          Type: Parent</prop type/>
          Tag: /Property name/
          Value: /The field being assigned/

        - # In a spawned out Element, DynamicValues will also be here.
          # Those are not in the template, they are created at runtime.

      Children: # Props
```

Prop are defined by these templates:

```yml
# Common Template
# All props have the same core logic
Slot: /Prop Name/
  Components:
    - # Element-Id-Receiver
      Type: ParentLink<String>
      MatchTag: element-id
      Target: Dynamic-Variable-Name-Builder.Strings.0
      DefaultValue: '*NO_PARENT_PROXY*'
    - # Prop-Name-Copier-Name-Builder
      Type: ValueCopy<String>
      Source: Element-Proxy.Name
      Target: Dynamic-Variable-Name-Builder.Strings.1
    - # Prop-Name-Copier-Parent-Reference
      Type: ValueCopy<String>
      Source: Element-Proxy.Name
      Target: /ParentReference.MatchTag field, see specializations/
    - # Dynamic-Variable-Name-Builder
      Type: StringConcatenationDriver
      TargetString: /Dynamic(whatever).VariableName field, see specializations/
      Separator: .
      Strings:
        - <From Element-Id-Receiver>
        - <From Prop-Name-Copier-Name-Builder>
      # The output format: `{proxy slot name of the element}.{prop name}`
      # In an active element, proxy slot name is often `react_w/{element-id}`
      # The final format: `react_w/{element-id}.{prop name}`
```

```yml
# Set Props
Slot: /Prop Name/
  Components:
      # All props from Common Template

    - # Parent-Field-Receiver
      Type: ParentLink<TRef</prop type/>>
      MatchTag: /Set by Prop-Name-Copier-Parent-Reference.Target/
      Target: Dynamic-Receiver.Target
    - # Dynamic-Receiver
      Type: DynamicVariableDriver</prop type/>
      VariableName: /Set by Dynamic-Variable-Name-Builder.TargetString/
      Target: /Set by Parent-Field-Receiver.Target/
      DefaultValue: /Customize based on the default prop value/
```

```yml
# Ref Props
Slot: /Prop Name/
  Components:
      # All props from Common Template

    - # Parent-Field-Receiver
      Type: ParentLink</prop type/>
      MatchTag: /Set by Prop-Name-Copier-Parent-Reference.Target/
      Target: Dynamic-Receiver.Target
    - # Dynamic-Receiver
      Type: DynamicVariable</prop type/>
      VariableName: /Set by Dynamic-Variable-Name-Builder.TargetString/
      Target: /Set by Parent-Field-Receiver.Target/
```

```yml
# SetRef Props
Slot: /Prop Name/
  Components:
      # All props from Common Template

      # TODO
```
