import { OutboundSignal, InboundSignal } from "./signal";

export const nullSymbol: "$" = "$";

function stringifyOutboundSignal(signal: OutboundSignal): string {
  let parts: Array<string> = [];
  switch (signal.signal) {
    case "create":
      parts.push("create", signal.id, signal.type);
      break;
    case "remove":
      parts.push("remove", signal.id);
      break;
    case "update":
      parts.push(
        "update",
        signal.id,
        ...signal.props.map((update) =>
          [
            update.prop,
            update.type,
            update.value === null ? nullSymbol : update.value,
          ].join("=")
        )
      );
      break;
    case "setParent":
      parts.push(
        "setParent",
        signal.id,
        signal.parentId,
        signal.after === undefined ? nullSymbol : signal.after
      );
      break;
  }

  return parts.join("+");
}

export function stringifySignalArray(signals: Array<OutboundSignal>): string {
  return signals.map(stringifyOutboundSignal).join("\n");
}
export function parseSignal(signal?: string): Array<InboundSignal> | undefined {
  if (signal === undefined) {
    return undefined;
  }
  const [signalType, id, event, arg] = signal.split("+");
  switch (signalType) {
    case "event":
      return [
        {
          signal: "event",
          id,
          event,
          arg,
        },
      ];
  }
  return undefined;
}
