import { rr, createRender, wsProxyServer, componentDefs } from "react-reso";

export function runServer() {
  const render = createRender(<SmallRedBox />, componentDefs);
  wsProxyServer(render, { port: 8080 });
  console.log("Server started on port 8080");
}

const SmallRedBox = () => {
  return (
    <rr.boxMesh/>
  );
};

runServer();
